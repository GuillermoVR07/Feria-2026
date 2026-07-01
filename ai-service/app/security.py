from __future__ import annotations

import hmac

from fastapi import Header, HTTPException, status


def require_bearer_token(authorization: str | None = Header(default=None), expected_token: str = "") -> None:
    if not expected_token:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Servicio IA sin token de autenticacion configurado.",
        )

    prefix = "Bearer "
    if not authorization or not authorization.startswith(prefix):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token IA requerido.")

    received_token = authorization[len(prefix):].strip()
    if not hmac.compare_digest(received_token, expected_token):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token IA invalido.")
