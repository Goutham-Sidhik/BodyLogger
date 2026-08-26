import re
import time
from pathlib import Path

from fastapi import APIRouter, File, HTTPException, UploadFile
from fastapi.responses import FileResponse

from data_layer import json_storage as db

IMAGES_DIR = Path(__file__).parent.parent.parent.parent / "data" / "images"
IMAGES_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_EXTS = {".jpg", ".jpeg", ".png", ".webp", ".heic"}
DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
FILE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}_\d+\.(jpg|jpeg|png|webp|heic)$")

router = APIRouter()


# serve route MUST come before /{date} to avoid being swallowed by the wildcard
@router.get("/serve/{filename}")
def serve_photo(filename: str):
    if not FILE_RE.match(filename):
        raise HTTPException(400, "Invalid filename")
    path = IMAGES_DIR / filename
    if not path.exists():
        raise HTTPException(404, "Photo not found")
    return FileResponse(path)


@router.post("/{date}", status_code=201)
async def upload_photo(date: str, file: UploadFile = File(...)):
    if not DATE_RE.match(date):
        raise HTTPException(400, "Invalid date format (expected YYYY-MM-DD)")

    ext = Path(file.filename or "photo.jpg").suffix.lower()
    if ext == ".heic":
        ext = ".jpg"  # treat HEIC as jpg for display
    if ext not in ALLOWED_EXTS:
        raise HTTPException(400, f"Unsupported format: {ext}")

    ts = int(time.time() * 1000)
    filename = f"{date}_{ts}{ext}"
    dest = IMAGES_DIR / filename

    content = await file.read()
    if len(content) > 25 * 1024 * 1024:
        raise HTTPException(413, "Image too large (max 25 MB)")

    with open(dest, "wb") as f:
        f.write(content)

    log = db.get_log_by_date(date)
    if log is None:
        db.create_log({"date": date, "photos": [filename], "measurements": {}, "body_composition": {}, "nutrition": {}})
    else:
        photos = log.get("photos") or []
        photos.append(filename)
        db.update_log(date, {"photos": photos})

    return {"filename": filename}


@router.get("/{date}")
def list_photos(date: str):
    if not DATE_RE.match(date):
        raise HTTPException(400, "Invalid date format")
    log = db.get_log_by_date(date)
    if not log:
        return []
    return log.get("photos") or []


@router.delete("/{filename}")
def delete_photo(filename: str):
    if not FILE_RE.match(filename):
        raise HTTPException(400, "Invalid filename")

    path = IMAGES_DIR / filename
    if not path.exists():
        raise HTTPException(404, "Photo not found")

    path.unlink()

    date = filename.split("_")[0]
    log = db.get_log_by_date(date)
    if log:
        photos = [p for p in (log.get("photos") or []) if p != filename]
        db.update_log(date, {"photos": photos})

    return {"deleted": filename}
