import os
import hashlib
import aiofiles
from datetime import datetime
from typing import Dict, Any, Tuple
from fastapi import UploadFile, HTTPException, status
from app.config import settings


async def process_uploaded_file(file: UploadFile) -> Tuple[str, str, int, Dict[str, Any]]:
    """
    Forensic Upload Processing Pipeline:
    1. Validate extension and size
    2. Stream and compute cryptographic SHA-256 hash
    3. Store locally in secure uploads directory
    4. Extract file type metadata and MIME indicators
    """
    filename = file.filename or "unnamed_artifact.dat"
    ext = filename.split(".")[-1].lower() if "." in filename else ""

    if ext not in settings.ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File extension '.{ext}' is prohibited. Allowed: {sorted(list(settings.ALLOWED_EXTENSIONS))}"
        )

    # Ensure uploads directory exists
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)

    sha256 = hashlib.sha256()
    size_bytes = 0
    max_bytes = settings.MAX_FILE_SIZE_MB * 1024 * 1024

    # Generate unique timestamped filename to prevent collisions
    timestamp_prefix = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    safe_filename = f"{timestamp_prefix}_{filename.replace(' ', '_')}"
    saved_path = os.path.join(settings.UPLOAD_DIR, safe_filename)

    async with aiofiles.open(saved_path, "wb") as out_file:
        while chunk := await file.read(64 * 1024):  # 64KB chunks
            size_bytes += len(chunk)
            if size_bytes > max_bytes:
                # Clean up partial file
                if os.path.exists(saved_path):
                    os.remove(saved_path)
                raise HTTPException(
                    status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                    detail=f"Uploaded artifact exceeds maximum authorized size of {settings.MAX_FILE_SIZE_MB}MB"
                )
            sha256.update(chunk)
            await out_file.write(chunk)

    computed_hash = sha256.hexdigest()

    # Extract forensic metadata based on modality
    metadata = {
        "original_filename": filename,
        "extension": ext,
        "content_type": file.content_type,
        "size_bytes": size_bytes,
        "ingested_at": datetime.utcnow().isoformat(),
        "sha256": computed_hash,
    }

    # Add modality-specific indicators
    if ext in ["jpg", "jpeg", "png"]:
        metadata["modality"] = "image"
        metadata["suggested_agent"] = "CCTV Agent"
    elif ext in ["mp4"]:
        metadata["modality"] = "video"
        metadata["suggested_agent"] = "CCTV Agent"
    elif ext in ["wav", "mp3"]:
        metadata["modality"] = "audio"
        metadata["suggested_agent"] = "Evidence Agent"
    elif ext in ["csv", "json"]:
        metadata["modality"] = "structured_data"
        metadata["suggested_agent"] = "Evidence Agent"
    else:
        metadata["modality"] = "document"
        metadata["suggested_agent"] = "Evidence Agent"

    return saved_path, computed_hash, size_bytes, metadata
