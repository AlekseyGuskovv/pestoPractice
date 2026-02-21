from fastapi import APIRouter

from app.api.admin.routes import router as admin_router
from app.api.routes.auth import router as auth_router
from app.api.routes.booking import router as booking_router
from app.api.routes.history import router as history_router
from app.api.routes.menu import router as menu_router
from app.api.routes.orders import router as orders_router
from app.api.routes.spa import router as spa_router

api_router = APIRouter()
api_router.include_router(spa_router)
api_router.include_router(menu_router)
api_router.include_router(history_router)
api_router.include_router(auth_router)
api_router.include_router(booking_router)
api_router.include_router(orders_router)
api_router.include_router(admin_router)
