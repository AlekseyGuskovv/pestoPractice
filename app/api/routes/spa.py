from fastapi import APIRouter
from fastapi.responses import FileResponse, HTMLResponse

from app.core.config import settings

router = APIRouter(tags=["spa"])

SPA_PATHS = ("/", "/menu", "/booking", "/login", "/register", "/history")


def get_spa_index():
    index_path = settings.frontend_dist / "index.html"
    if index_path.exists():
        return FileResponse(index_path)
    return HTMLResponse(
        "<h1>Frontend not built. Run <code>npm install && npm run build</code> in frontend/</h1>",
        status_code=503,
    )


for path in SPA_PATHS:
    router.add_api_route(path, get_spa_index, methods=["GET"], response_class=FileResponse)
