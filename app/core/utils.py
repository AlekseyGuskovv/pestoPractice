from datetime import date as date_type, time as time_type, datetime


def normalize_image_url(image_url) -> str | None:
    if image_url is None:
        return None
    url = str(image_url).strip()
    if not url:
        return None
    if url.startswith("http://") or url.startswith("https://"):
        return url
    if url.startswith("/static/menu/"):
        return "/static/image/" + url.split("/")[-1]
    if url.startswith("/"):
        return url
    return f"/static/image/{url.lstrip('/')}"


def parse_date(value: str) -> date_type:
    return date_type.fromisoformat(value)


def parse_time(value: str) -> time_type:
    return datetime.strptime(value, "%H:%M").time()


def resolve_menu_image_url(raw_image: str) -> str | None:
    raw_image = (raw_image or "").strip()
    if raw_image == "":
        return None
    if "://" in raw_image or raw_image.startswith("/static/"):
        return raw_image
    return "/static/image/" + raw_image.lstrip("/").split("/")[-1]
