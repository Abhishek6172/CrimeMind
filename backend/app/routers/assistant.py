
import logging
import uuid
from datetime import datetime, timezone

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    WebSocket,
    WebSocketDisconnect,
)
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.schemas.assistant import (
    AssistantChatRequest,
    AssistantChatResponse,
    TranscribeRequest,
    TranscribeResponse,
    SpeakRequest,
    SpeakResponse,
)
from app.schemas.auth import TokenData
from app.services.langgraph_service import LangGraphOrchestrator
from app.services.voice_service import VoiceService
from app.websocket.connection_manager import manager
from app.utils.security import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/assistant",
    tags=["CrimeMind AI Assistant & Voice"],
)


def _read_field(value, field, default=None):
    """Read a field from either a Pydantic model or a dictionary."""
    if isinstance(value, dict):
        return value.get(field, default)

    return getattr(value, field, default)


def _build_agent_trace(agent_outputs):
    """Build the trace from actual graph execution records."""
    trace = []

    if not isinstance(agent_outputs, dict):
        return trace

    for name, output in agent_outputs.items():
        status = _read_field(output, "status", "completed")

        if hasattr(status, "value"):
            status = status.value

        trace.append({
            "agent": str(name),
            "status": str(status),
        })

    return trace


def _build_sources(citations):
    """Extract source identifiers only when supplied by actual citations."""
    sources = []

    for citation in citations or []:
        source_id = (
            _read_field(citation, "source_id")
            or _read_field(citation, "evidence_id")
            or _read_field(citation, "citation_id")
        )

        if source_id is not None:
            sources.append(str(source_id))

    return list(dict.fromkeys(sources))


@router.post("/chat", response_model=None)
async def chat_assistant(
    chat_req: AssistantChatRequest,
    db: Session = Depends(get_db),
):
    """
    Run an investigation using the real LangGraph pipeline.

    Streaming requests return server-sent events.
    Non-streaming requests return the actual graph result.
    No canned investigation findings are generated here.
    """
    query = (chat_req.message or "").strip()

    if not query:
        raise HTTPException(
            status_code=422,
            detail="Please enter an investigation query.",
        )

    conv_id = (
        chat_req.conversation_id
        or f"conv-{uuid.uuid4().hex}"
    )

    if chat_req.stream:
        async def stream_events():
            try:
                async for chunk in LangGraphOrchestrator.run_pipeline_stream(
                    query=query,
                    case_id=chat_req.case_id,
                    db=db,
                ):
                    yield chunk

            except Exception:
                logger.exception("Streaming investigation failed.")

                # Send an error event rather than inventing a report.
                import json

                yield (
                    "event: error\n"
                    "data: "
                    + json.dumps({
                        "error": "Investigation failed.",
                        "message": (
                            "The investigation pipeline could not "
                            "complete this request."
                        ),
                    })
                    + "\n\n"
                )

        return StreamingResponse(
            stream_events(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no",
            },
        )

    try:
        state = await LangGraphOrchestrator.run_investigation(
            query=query,
            case_id=chat_req.case_id,
            conversation_id=conv_id,
        )

        message = (
            _read_field(state, "final_response", "") or ""
        ).strip()

        errors = _read_field(state, "errors", []) or []

        if not message:
            logger.error(
                "Investigation returned no final response. "
                "Conversation ID: %s; errors: %s",
                conv_id,
                errors,
            )

            raise HTTPException(
                status_code=502,
                detail=(
                    "The investigation pipeline did not produce "
                    "a final report. Check the backend logs."
                ),
            )

        agent_outputs = _read_field(
            state, "agent_outputs", {}
        ) or {}

        citations = _read_field(state, "citations", []) or []

        result_conversation_id = (
            _read_field(state, "conversation_id")
            or conv_id
        )

        return AssistantChatResponse(
            conversation_id=str(result_conversation_id),
            message=message,
            active_agent="Synthesis Agent",
            sources=_build_sources(citations),
            agent_trace=_build_agent_trace(agent_outputs),
            timestamp=datetime.now(timezone.utc),
        )

    except HTTPException:
        raise

    except Exception as exc:
        logger.exception(
            "Non-streaming investigation failed. Conversation ID: %s",
            conv_id,
        )

        raise HTTPException(
            status_code=502,
            detail=(
                "CrimeMind could not complete the investigation. "
                "No fallback findings were generated."
            ),
        ) from exc


@router.post("/transcribe", response_model=TranscribeResponse)
async def transcribe_audio(
    trans_req: TranscribeRequest,
    current_user: TokenData = Depends(get_current_user),
):
    """Convert investigator voice input into text."""
    return await VoiceService.transcribe_audio(
        audio_base64=trans_req.audio_base64 or "",
        language=trans_req.language or "en",
    )


@router.post("/speak", response_model=SpeakResponse)
async def synthesize_speech(
    speak_req: SpeakRequest,
    current_user: TokenData = Depends(get_current_user),
):
    """Convert the assistant response into speech."""
    return await VoiceService.synthesize_speech(
        text=speak_req.text,
        voice=speak_req.voice or "tactical_operator",
    )


@router.websocket("/ws/{conversation_id}")
async def websocket_assistant_endpoint(
    websocket: WebSocket,
    conversation_id: str,
):
    """WebSocket endpoint for conversational investigation queries."""
    await manager.connect(websocket, conversation_id)

    try:
        await websocket.send_json({
            "type": "connection_established",
            "conversation_id": conversation_id,
            "message": "Connected to CrimeMind LangGraph Assistant Engine.",
        })

        while True:
            data = await websocket.receive_json()
            user_message = str(data.get("message", "")).strip()

            if not user_message:
                await websocket.send_json({
                    "type": "error",
                    "message": "Please provide an investigation query.",
                })
                continue

            await websocket.send_json({
                "type": "agent_started",
                "agent": "Planner",
                "message": "Processing investigation query.",
            })

            try:
                async for chunk in (
                    LangGraphOrchestrator.run_pipeline_stream(
                        query=user_message,
                    )
                ):
                    # Preserve SSE event names and payloads when forwarding.
                    await websocket.send_text(chunk)

            except Exception:
                logger.exception(
                    "WebSocket investigation failed. Conversation ID: %s",
                    conversation_id,
                )

                await websocket.send_json({
                    "type": "error",
                    "message": (
                        "The investigation failed. "
                        "No synthetic findings were generated."
                    ),
                })

    except WebSocketDisconnect:
        pass

    finally:
        manager.disconnect(websocket, conversation_id)
