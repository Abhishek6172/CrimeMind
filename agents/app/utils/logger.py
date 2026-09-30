import logging
import sys
from typing import Dict, Any, Optional
from datetime import datetime

if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

# Configure standard console logging format
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] [%(name)s] %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)]
)

logger = logging.getLogger("CrimeMind.AgentEngine")


class AgentExecutionTimer:
    """Context manager for tracking individual agent run durations."""

    def __init__(self, agent_name: str, task: str):
        self.agent_name = agent_name
        self.task = task
        self.start_time: Optional[datetime] = None
        self.duration_ms: int = 0

    def __enter__(self):
        self.start_time = datetime.utcnow()
        logger.info(f"[*] [{self.agent_name}] Started task: '{self.task[:80]}'")
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        if self.start_time:
            delta = datetime.utcnow() - self.start_time
            self.duration_ms = int(delta.total_seconds() * 1000)
        status = "FAILED" if exc_type else "COMPLETED"
        logger.info(f"[+] [{self.agent_name}] {status} in {self.duration_ms}ms")
