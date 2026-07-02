from __future__ import annotations

import hmac
import os

from fastapi import Header, HTTPException, status


def require_bearer_token(authorization: str | None = Header(default=None), expected_token: str = "") -> None:
    # In production the service must have a configured token. For local
    # development, allow a default dev token so users can run the service
    # without setting up environment variables.
    if not expected_token:
        env = os.getenv("AI_ENVIRONMENT", "local").lower()
        if env == "local":
            expected_token = os.getenv("AI_AUTH_TOKEN", "change-me-server-only") or "change-me-server-only"
        else:
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
