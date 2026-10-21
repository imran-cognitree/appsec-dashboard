import asyncio
import io
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, File, HTTPException, Query, Request, UploadFile, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app.auth import get_current_user
from app.models import Role, UserInDB

router = APIRouter(prefix="/datasets", tags=["datasets"])

# In-memory storage for uploaded files: dataset_id => {"filename": str, "content": bytes}
_datasets_store: dict[str, dict] = {}


class DatasetUploadResponse(BaseModel):
    id: str
    filename: str


async def get_admin_user(
    request: Request,
    token: Optional[str] = Query(None),
) -> UserInDB:
    """Accepts admin token from Authorization header or 'token' query parameter."""
    auth_token = None
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        auth_token = auth_header.split(" ")[1]
    elif token:
        auth_token = token

    if not auth_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication credentials were not provided",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = await get_current_user(auth_token)
    if user.role != Role.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Operation not permitted",
        )
    return user


@router.post("", response_model=DatasetUploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_dataset(
    file: UploadFile = File(...),
    _current_user: UserInDB = Depends(get_admin_user),
):
    """Admin-only endpoint to upload a file."""
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file selected")

    content = await file.read()
    if len(content) == 0:
        raise HTTPException(status_code=400, detail="File is empty")

    dataset_id = uuid.uuid4().hex[:8]
    _datasets_store[dataset_id] = {
        "filename": file.filename,
        "content": content,
    }

    return DatasetUploadResponse(id=dataset_id, filename=file.filename)


@router.get("/{dataset_id}/content")
async def get_dataset_content(
    dataset_id: str,
    delay_ms: int = Query(2000, ge=0, le=5000),
    _current_user: UserInDB = Depends(get_admin_user),
):
    """Admin-only endpoint to stream uploaded dataset content in chunks."""
    if dataset_id not in _datasets_store:
        raise HTTPException(status_code=404, detail="Dataset not found")

    dataset = _datasets_store[dataset_id]
    content = dataset["content"]
    filename = dataset["filename"]
    chunk_delay = delay_ms / 1000.0

    async def iter_lines():
        stream = io.BytesIO(content)
        while True:
            chunk = stream.readline()
            if not chunk:
                break
            yield chunk
            if chunk_delay > 0:
                await asyncio.sleep(chunk_delay)

    return StreamingResponse(
        iter_lines(),
        media_type="text/plain; charset=utf-8",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Cache-Control": "no-cache",
            "X-Content-Type-Options": "nosniff",
        },
    )
