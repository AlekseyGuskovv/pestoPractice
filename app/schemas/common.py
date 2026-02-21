from dataclasses import dataclass
from typing import Any


@dataclass
class ServiceResult:
    ok: bool
    status_code: int = 200
    data: dict[str, Any] | None = None
    error: str | None = None

    @classmethod
    def success(cls, data: dict[str, Any] | None = None, status_code: int = 200):
        return cls(ok=True, status_code=status_code, data=data or {})

    @classmethod
    def failure(cls, error: str, status_code: int = 400):
        return cls(ok=False, status_code=status_code, error=error)
