import time
import logging
from starlette.middleware.base import BaseHTTPMiddleware
from fastapi import Request

logger = logging.getLogger("crimemind.audit")


class AuditLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        start_time = time.time()
        client_ip = request.client.host if request.client else "unknown"

        response = await call_next(request)
        process_time = time.time() - start_time

        if request.method in ["POST", "PATCH", "PUT", "DELETE"]:
            logger.info(
                f"[AUDIT] {request.method} {request.url.path} - "
                f"Status: {response.status_code} - IP: {client_ip} - Duration: {process_time:.3f}s"
            )

        return response
