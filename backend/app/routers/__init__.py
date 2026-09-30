from fastapi import APIRouter
from app.routers.auth import router as auth_router
from app.routers.cases import router as cases_router
from app.routers.persons import router as persons_router
from app.routers.evidence import router as evidence_router
from app.routers.vehicles import router as vehicles_router
from app.routers.locations import router as locations_router
from app.routers.cctv import router as cctv_router
from app.routers.calls import router as calls_router
from app.routers.transactions import router as transactions_router
from app.routers.graph import router as graph_router
from app.routers.timeline import router as timeline_router
from app.routers.alerts import router as alerts_router
from app.routers.analytics import router as analytics_router
from app.routers.agents import router as agents_router
from app.routers.assistant import router as assistant_router
from app.routers.intelligence import router as intelligence_router

api_router = APIRouter()

api_router.include_router(auth_router)
api_router.include_router(cases_router)
api_router.include_router(persons_router)
api_router.include_router(evidence_router)
api_router.include_router(vehicles_router)
api_router.include_router(locations_router)
api_router.include_router(cctv_router)
api_router.include_router(calls_router)
api_router.include_router(transactions_router)
api_router.include_router(graph_router)
api_router.include_router(timeline_router)
api_router.include_router(alerts_router)
api_router.include_router(analytics_router)
api_router.include_router(agents_router)
api_router.include_router(assistant_router)
api_router.include_router(intelligence_router)

__all__ = ["api_router"]
