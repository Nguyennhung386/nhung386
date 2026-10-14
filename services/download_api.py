"""SaveTok download service.

TikTok links are downloaded with yt-dlp (MP4, or MP3 via ffmpeg) into a per-request temp folder; the
file is then served via GET /api/dl/file/{id} and cleaned up after FILE_TTL
seconds.

Local:  python services/download_api.py   (listens on 127.0.0.1:8001, proxied by Vite)
Hosted: set PORT and ALLOWED_ORIGINS (comma-separated site URLs); listens on 0.0.0.0:$PORT.
"""

from __future__ import annotations

import asyncio
import os
import shutil
import tempfile
import time
import uuid
from collections import defaultdict, deque
from pathlib import Path
from typing import Literal
from urllib.parse import urlparse

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel

MEDIA_EXTS = {".mp4", ".mov", ".webm", ".mkv", ".mp3", ".m4a", ".jpg", ".jpeg", ".png", ".webp"}
FILE_TTL = 3600
MAX_FILESIZE = 200 * 1024 * 1024
# Free hosting tiers have little RAM/CPU: cap parallel jobs and per-visitor rate.
MAX_CONCURRENT = int(os.getenv("MAX_CONCURRENT", "2"))
RATE_LIMIT = int(os.getenv("RATE_LIMIT", "20"))  # downloads per visitor per window
RATE_WINDOW = 600

app = FastAPI(title="SaveTok download service")
_origins = [o.strip().rstrip("/") for o in os.getenv("ALLOWED_ORIGINS", "").split(",") if o.strip()]
if _origins:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=_origins,
        allow_methods=["GET", "POST"],
        allow_headers=["Content-Type"],
        expose_headers=["Content-Disposition"],
    )

_files: dict[str, tuple[Path, Path, float]] = {}  # id -> (file, job dir, created)
_jobs = asyncio.Semaphore(MAX_CONCURRENT)
_hits: dict[str, deque[float]] = defaultdict(deque)


class DownloadRequest(BaseModel):
    url: str
    format: Literal["mp4", "mp3"] = "mp4"


def _is_tiktok(url: str) -> bool:
    try:
        host = (urlparse(url.strip()).hostname or "").lower()
    except ValueError:
        return False
    return host == "tiktok.com" or host.endswith(".tiktok.com")


def _client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for", "")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def _check_rate(ip: str) -> None:
    now = time.time()
    hits = _hits[ip]
    while hits and now - hits[0] > RATE_WINDOW:
        hits.popleft()
    if len(hits) >= RATE_LIMIT:
        raise HTTPException(429, "Bạn tải quá nhiều, vui lòng thử lại sau ít phút.")
    hits.append(now)


def _cleanup() -> None:
    now = time.time()
    for file_id, (_, job_dir, created) in list(_files.items()):
        if now - created > FILE_TTL:
            shutil.rmtree(job_dir, ignore_errors=True)
            _files.pop(file_id, None)
    for ip, hits in list(_hits.items()):
        if not hits or now - hits[-1] > RATE_WINDOW:
            _hits.pop(ip, None)


def _pick_media(job_dir: Path, fmt: str) -> Path | None:
    files = [p for p in job_dir.rglob("*") if p.is_file() and p.suffix.lower() in MEDIA_EXTS]
    preferred = {".mp3"} if fmt == "mp3" else {".mp4", ".mov", ".webm", ".mkv"}
    pool = [p for p in files if p.suffix.lower() in preferred] or files
    return max(pool, key=lambda p: p.stat().st_size) if pool else None


def _download_tiktok(url: str, job_dir: Path, fmt: str) -> None:
    import yt_dlp

    opts = {
        "outtmpl": str(job_dir / "%(uploader)s_%(id)s.%(ext)s"),
        "noplaylist": True,
        "quiet": True,
        "no_warnings": True,
        "max_filesize": MAX_FILESIZE,
    }
    if fmt == "mp3":
        import imageio_ffmpeg

        # TikTok rarely offers audio-only streams; take the smallest file with audio and extract it.
        opts["format"] = "bestaudio/worst[acodec!=none]/best"
        opts["ffmpeg_location"] = imageio_ffmpeg.get_ffmpeg_exe()
        opts["postprocessors"] = [
            {"key": "FFmpegExtractAudio", "preferredcodec": "mp3", "preferredquality": "192"}
        ]
    else:
        # Prefer a non-watermarked progressive H.264 MP4 (plays everywhere, no ffmpeg merge).
        opts["format"] = (
            "best[vcodec^=h264][format_note!*=?watermark]/best[vcodec^=avc][format_note!*=?watermark]"
            "/best[format_note!*=?watermark][ext=mp4]/best[ext=mp4]/best"
        )
    with yt_dlp.YoutubeDL(opts) as ydl:
        ydl.download([url])


@app.get("/api/dl/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/dl/download")
async def download(req: DownloadRequest, request: Request) -> dict[str, str]:
    _cleanup()
    if not _is_tiktok(req.url):
        raise HTTPException(400, "Chỉ hỗ trợ liên kết TikTok.")
    _check_rate(_client_ip(request))

    job_dir = Path(tempfile.mkdtemp(prefix="savetok_"))
    try:
        async with _jobs:
            await asyncio.to_thread(_download_tiktok, req.url.strip(), job_dir, req.format)
    except Exception as exc:  # surface the real reason to the UI
        shutil.rmtree(job_dir, ignore_errors=True)
        raise HTTPException(502, f"Không tải được video: {exc}") from exc

    media = _pick_media(job_dir, req.format)
    if media is None:
        shutil.rmtree(job_dir, ignore_errors=True)
        raise HTTPException(502, "Không tìm thấy tệp video sau khi tải.")

    file_id = uuid.uuid4().hex
    _files[file_id] = (media, job_dir, time.time())
    return {"id": file_id, "filename": media.name}


@app.get("/api/dl/file/{file_id}")
async def get_file(file_id: str) -> FileResponse:
    entry = _files.get(file_id)
    if entry is None or not entry[0].exists():
        raise HTTPException(404, "Tệp đã hết hạn, vui lòng tải lại.")
    return FileResponse(entry[0], filename=entry[0].name)


if __name__ == "__main__":
    import uvicorn

    port = os.getenv("PORT")
    uvicorn.run(app, host="0.0.0.0" if port else "127.0.0.1", port=int(port or 8001))
