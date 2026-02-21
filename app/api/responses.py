from fastapi.responses import JSONResponse, RedirectResponse

from app.core.config import settings
from app.schemas.common import ServiceResult


def json_from_result(result: ServiceResult) -> JSONResponse:
    if result.ok:
        return JSONResponse(result.data, status_code=result.status_code)
    return JSONResponse({"error": result.error}, status_code=result.status_code)


def redirect_from_result(result: ServiceResult) -> RedirectResponse | JSONResponse:
    if not result.ok:
        return json_from_result(result)
    return RedirectResponse(url=result.data["redirect_url"], status_code=303)


def set_auth_cookies(response: RedirectResponse, user_id: int) -> RedirectResponse:
    response.set_cookie("logged_in", "1", path="/", max_age=settings.cookie_max_age)
    response.set_cookie(
        "user_id", str(user_id), path="/", max_age=settings.cookie_max_age
    )
    return response


def clear_auth_cookies(response: RedirectResponse) -> RedirectResponse:
    response.delete_cookie("logged_in", path="/")
    response.delete_cookie("user_id", path="/")
    return response
