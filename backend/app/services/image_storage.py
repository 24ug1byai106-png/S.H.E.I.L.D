"""
Image storage service — handles validation, saving, and cleanup of uploaded images.
"""

import logging
import uuid
from datetime import datetime
from pathlib import Path

from fastapi import UploadFile, HTTPException, status

from app.config import settings

logger = logging.getLogger(__name__)

UPLOAD_DIR = Path(settings.UPLOAD_DIR)
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

MAX_FILE_BYTES = settings.MAX_FILE_SIZE_MB * 1024 * 1024


class ImageStorageService:
    """Handles validation and persistence of uploaded image files."""

    async def save(self, file: UploadFile) -> str:
        """
        Validate and persist an uploaded image.

        Args:
            file: The uploaded file from FastAPI.

        Returns:
            Absolute path string to the saved file.

        Raises:
            HTTPException: On validation failure.
        """
        self._validate_content_type(file.content_type)

        contents = await file.read()
        self._validate_file_size(len(contents), file.filename)

        ext = self._extension_for(file.content_type)
        unique_name = self._unique_filename(file.filename or "upload", ext)
        dest = UPLOAD_DIR / unique_name

        dest.write_bytes(contents)
        logger.info("Saved upload → %s (%d bytes)", dest, len(contents))
        return str(dest.resolve())

    def delete(self, image_path: str) -> None:
        """Remove a previously stored image (used on error rollback)."""
        try:
            p = Path(image_path)
            if p.exists():
                p.unlink()
                logger.debug("Deleted image %s", image_path)
        except OSError as exc:
            logger.warning("Could not delete %s: %s", image_path, exc)

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    def _validate_content_type(self, content_type: str | None) -> None:
        if content_type not in settings.ALLOWED_IMAGE_TYPES:
            raise HTTPException(
                status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                detail=(
                    f"Unsupported file type '{content_type}'. "
                    f"Allowed types: {', '.join(settings.ALLOWED_IMAGE_TYPES)}"
                ),
            )

    def _validate_file_size(self, size_bytes: int, filename: str) -> None:
        if size_bytes > MAX_FILE_BYTES:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=(
                    f"File '{filename}' exceeds the {settings.MAX_FILE_SIZE_MB} MB limit "
                    f"({size_bytes / 1024 / 1024:.1f} MB uploaded)."
                ),
            )
        if size_bytes == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Uploaded file is empty.",
            )

    @staticmethod
    def _extension_for(content_type: str) -> str:
        mapping = {
            "image/jpeg": ".jpg",
            "image/png": ".png",
            "image/webp": ".webp",
            "image/tiff": ".tiff",
        }
        return mapping.get(content_type, ".jpg")

    @staticmethod
    def _unique_filename(original: str, ext: str) -> str:
        stem = Path(original).stem[:40].replace(" ", "_")
        ts = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        uid = uuid.uuid4().hex[:8]
        return f"{ts}_{stem}_{uid}{ext}"


image_storage = ImageStorageService()
