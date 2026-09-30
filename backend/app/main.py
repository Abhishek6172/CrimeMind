import os
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from app.config import settings
from app.database.session import check_database_connection, engine
from app.database.base import Base
from app.routers import api_router
from app.middleware import AuditLoggingMiddleware, RateLimitMiddleware
from app.websocket.connection_manager import manager
from app.services.langgraph_service import LangGraphOrchestrator

# Configure structured logging
logging.basicConfig(
    level=logging.INFO if not settings.DEBUG else logging.DEBUG,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("crimemind.main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for application startup and teardown."""
    logger.info("Initializing CrimeMind Intelligence Platform Backend...")

    # Ensure uploads directory exists
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)

    # Verify or initialize PostgreSQL tables
    db_ok = check_database_connection()
    if db_ok:
        logger.info("[✔] PostgreSQL database connected successfully.")
    else:
        logger.warning("[!] PostgreSQL connection failed or uninitialized. Running in resilient mock/standby mode.")

    yield
    logger.info("Shutting down CrimeMind backend...")


# Initialize FastAPI with rich enterprise OpenAPI metadata
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description=(
        "**CrimeMind** is an AI-powered crime investigation and intelligence platform. "
        "It integrates multi-modal evidence across CCTV feeds, call detail records (CDRs), "
        "financial wires, and forensic disk images using a LangGraph 9-agent state machine. "
        "\n\n**LEGAL SAFEGUARD**: Inferred movements and AI outputs are investigative assistance, "
        "requiring human verification prior to formal warrants."
    ),
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

# 1. CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 2. Custom Audit Logging Middleware
app.add_middleware(AuditLoggingMiddleware)

# 3. Mount Static Uploads (for secured review)
if os.path.exists(settings.UPLOAD_DIR):
    app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

# 4. Include Unified API Router
app.include_router(api_router)


# 5. Core Health and Status Endpoints
@app.get("/", tags=["System"])
def root():
    """Root health and system verification endpoint."""
    return {
        "system": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "OPERATIONAL",
        "database_connected": check_database_connection(),
        "langgraph_swarm": "9_AGENTS_READY",
        "documentation": "/docs"
    }


@app.get("/health", tags=["System"])
def health_check():
    """Kubernetes/Docker liveness and readiness probe."""
    db_status = check_database_connection()
    return JSONResponse(
        status_code=200 if db_status else 200,  # 200 for graceful container startup
        content={
            "status": "healthy" if db_status else "degraded",
            "database": "connected" if db_status else "disconnected",
            "uploads_directory": os.path.exists(settings.UPLOAD_DIR),
            "environment": settings.ENVIRONMENT
        }
    )


# 6. Top-level Hands-Free WebSocket for Assistant
@app.websocket("/ws/assistant/{conversation_id}")
async def top_level_assistant_ws(websocket: WebSocket, conversation_id: str):
    """
    Direct endpoint matching `/ws/assistant/{conversation_id}`.
    Enables hands-free speech queries and real-time LangGraph token streaming.
    """
    await manager.connect(websocket, conversation_id)
    try:
        await websocket.send_json({
            "type": "connected",
            "conversation_id": conversation_id,
            "status": "READY_FOR_VOICE_QUERY"
        })

        while True:
            data = await websocket.receive_json()
            user_query = data.get("message", "")

            # Stream LangGraph response
            async for sse_chunk in LangGraphOrchestrator.run_pipeline_stream(query=user_query):
                if sse_chunk.startswith("data: "):
                    raw_json = sse_chunk[6:].strip()
                    await websocket.send_text(raw_json)

    except WebSocketDisconnect:
        manager.disconnect(websocket, conversation_id)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.HOST, port=settings.PORT, reload=settings.DEBUG)
