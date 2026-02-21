from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import FileResponse, JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.responses import json_from_result
from app.core.config import settings
from app.core.deps import get_current_manager
from app.database.session import get_db
from app.repositories.booking_repository import BookingRepository
from app.repositories.menu_repository import MenuRepository
from app.repositories.order_repository import AdminRepository
from app.services.admin_service import AdminService

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/", response_class=FileResponse)
async def admin_page(manager=Depends(get_current_manager)):
    _ = manager
    index_path = settings.frontend_dist / "index.html"
    if not index_path.exists():
        raise HTTPException(
            status_code=503,
            detail="Frontend not built. Run npm run build in frontend/",
        )
    return FileResponse(index_path)


@router.get("/api/dashboard")
async def admin_dashboard(
    manager=Depends(get_current_manager),
    db: AsyncSession = Depends(get_db),
):
    _ = manager
    service = AdminService(AdminRepository(db), MenuRepository(db), BookingRepository(db))
    return json_from_result(await service.get_dashboard())


@router.patch("/api/reservations/{reservation_id}/status")
async def admin_change_reservation_status(
    reservation_id: int,
    request: Request,
    manager=Depends(get_current_manager),
    db: AsyncSession = Depends(get_db),
):
    _ = manager
    try:
        data = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Ожидается JSON.")

    service = AdminService(AdminRepository(db), MenuRepository(db), BookingRepository(db))
    result = await service.change_reservation_status(reservation_id, data.get("status"))
    if not result.ok:
        if result.status_code == 404:
            raise HTTPException(status_code=404, detail=result.error)
        raise HTTPException(status_code=result.status_code, detail=result.error)
    return JSONResponse(result.data)


@router.patch("/api/orders/{order_id}/status")
async def admin_change_order_status(
    order_id: int,
    request: Request,
    manager=Depends(get_current_manager),
    db: AsyncSession = Depends(get_db),
):
    _ = manager
    try:
        data = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Ожидается JSON.")

    service = AdminService(AdminRepository(db), MenuRepository(db), BookingRepository(db))
    result = await service.change_order_status(order_id, data.get("status"))
    if not result.ok:
        if result.status_code == 404:
            raise HTTPException(status_code=404, detail=result.error)
        raise HTTPException(status_code=result.status_code, detail=result.error)
    return JSONResponse(result.data)


@router.get("/api/menu")
async def admin_menu(
    manager=Depends(get_current_manager),
    db: AsyncSession = Depends(get_db),
):
    _ = manager
    service = AdminService(AdminRepository(db), MenuRepository(db), BookingRepository(db))
    return json_from_result(await service.get_menu_admin())


@router.post("/api/menu/items")
async def admin_add_menu_item(
    request: Request,
    manager=Depends(get_current_manager),
    db: AsyncSession = Depends(get_db),
):
    _ = manager
    try:
        data = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Ожидается JSON.")

    service = AdminService(AdminRepository(db), MenuRepository(db), BookingRepository(db))
    result = await service.add_menu_item(data)
    if not result.ok:
        raise HTTPException(status_code=result.status_code, detail=result.error)
    return JSONResponse(result.data, status_code=result.status_code)


@router.delete("/api/menu/items/{item_id}")
async def admin_delete_menu_item(
    item_id: int,
    manager=Depends(get_current_manager),
    db: AsyncSession = Depends(get_db),
):
    _ = manager
    service = AdminService(AdminRepository(db), MenuRepository(db), BookingRepository(db))
    result = await service.delete_menu_item(item_id)
    if not result.ok:
        raise HTTPException(status_code=result.status_code, detail=result.error)
    return JSONResponse(result.data)


@router.get("/api/tables")
async def admin_get_tables(
    manager=Depends(get_current_manager),
    db: AsyncSession = Depends(get_db),
):
    _ = manager
    service = AdminService(AdminRepository(db), MenuRepository(db), BookingRepository(db))
    return json_from_result(await service.list_tables())


@router.post("/api/tables")
async def admin_add_table(
    request: Request,
    manager=Depends(get_current_manager),
    db: AsyncSession = Depends(get_db),
):
    _ = manager
    try:
        data = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Ожидается JSON.")

    service = AdminService(AdminRepository(db), MenuRepository(db), BookingRepository(db))
    result = await service.add_table(data)
    if not result.ok:
        raise HTTPException(status_code=result.status_code, detail=result.error)
    return JSONResponse(result.data, status_code=result.status_code)


@router.delete("/api/tables/{table_id}")
async def admin_delete_table(
    table_id: int,
    manager=Depends(get_current_manager),
    db: AsyncSession = Depends(get_db),
):
    _ = manager
    service = AdminService(AdminRepository(db), MenuRepository(db), BookingRepository(db))
    result = await service.delete_table(table_id)
    if not result.ok:
        raise HTTPException(status_code=result.status_code, detail=result.error)
    return JSONResponse(result.data)
