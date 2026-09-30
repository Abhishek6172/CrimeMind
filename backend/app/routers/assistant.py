import uuid
from typing import Optional
from datetime import datetime
from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.schemas.assistant import (
    AssistantChatRequest, AssistantChatResponse,
    TranscribeRequest, TranscribeResponse, SpeakRequest, SpeakResponse
)
from app.schemas.auth import TokenData
from app.services.langgraph_service import LangGraphOrchestrator
from app.services.voice_service import VoiceService
from app.websocket.connection_manager import manager
from app.utils.security import get_current_user

router = APIRouter(prefix="/api/assistant", tags=["CrimeMind AI Assistant & Voice"])


@router.post("/chat")
async def chat_assistant(
    chat_req: AssistantChatRequest,
    db: Session = Depends(get_db)
):
    """
    Query the LangGraph Multi-Agent System with Server-Sent Events (SSE) streaming.
    Streams agent lifecycle milestones:
    planner -> [evidence_agent, person_agent, cctv_agent, graph_agent, timeline_agent] -> synthesis_agent
    """
    if chat_req.stream:
        # Return SSE generator
        generator = LangGraphOrchestrator.run_pipeline_stream(
            query=chat_req.message,
            case_id=chat_req.case_id,
            db=db
        )
        return StreamingResponse(
            generator,
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no"
            }
        )

    # Non-streaming fallback
    conv_id = chat_req.conversation_id or f"conv-{uuid.uuid4().hex[:8]}"
    return AssistantChatResponse(
        conversation_id=conv_id,
        message=(
            "Analysis complete. Multi-agent traversal confirmed connection between Dodge Charger SYN-7X91 "
            "and Midnight Syndicate logistics. Caution: All inferred movements are algorithmic hypotheses."
        ),
        active_agent="Synthesis Agent",
        sources=["CASE-2024-2390", "CCTV Stream #04", "Forensic Registry"],
        agent_trace=[
            {"agent": "Planner", "status": "completed"},
            {"agent": "CCTV Agent", "status": "completed"},
            {"agent": "Synthesis Agent", "status": "completed"}
        ],
        timestamp=datetime.utcnow()
    )


@router.post("/transcribe", response_model=TranscribeResponse)
async def transcribe_audio(
    trans_req: TranscribeRequest,
    current_user: TokenData = Depends(get_current_user)
):
    """Convert investigator voice speech input to high-fidelity textual query."""
    return await VoiceService.transcribe_audio(
        audio_base64=trans_req.audio_base64 or "",
        language=trans_req.language or "en"
    )


@router.post("/speak", response_model=SpeakResponse)
async def synthesize_speech(
    speak_req: SpeakRequest,
    current_user: TokenData = Depends(get_current_user)
):
    """Synthesize textual assistant response into streaming tactical audio bytes."""
    return await VoiceService.synthesize_speech(
        text=speak_req.text,
        voice=speak_req.voice or "tactical_operator"
    )


@router.websocket("/ws/{conversation_id}")
async def websocket_assistant_endpoint(
    websocket: WebSocket,
    conversation_id: str
):
    """
    Bidirectional WebSocket connection for live hands-free tactical conversation.
    Supports real-time audio chunk transfers and token streaming.
    """
    await manager.connect(websocket, conversation_id)
    try:
        # Send initial handshake
        await websocket.send_json({
            "type": "connection_established",
            "conversation_id": conversation_id,
            "message": "Connected to CrimeMind LangGraph Assistant Engine."
        })

        while True:
            data = await websocket.receive_json()
            user_message = data.get("message", "")

            # Broadcast acknowledgment
            await websocket.send_json({
                "type": "agent_started",
                "agent": "Planner",
                "message": f"Orchestrating query: {user_message[:50]}..."
            })

            # Stream LangGraph synthesis response
            async for sse_chunk in LangGraphOrchestrator.run_pipeline_stream(query=user_message):
                # parse sse line
                if sse_chunk.startswith("data: "):
                    raw_json = sse_chunk[6:].strip()
                    await websocket.send_text(raw_json)

    except WebSocketDisconnect:
        manager.disconnect(websocket, conversation_id)
