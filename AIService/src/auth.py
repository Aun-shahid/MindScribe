"""
JWT Authentication for the AI Service.
Compatible with Django's token_utils.py authentication system.
"""
import jwt
from datetime import datetime
from typing import Optional
from fastapi import HTTPException, status, Depends, WebSocket
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel

from .config import settings


# Security scheme for Swagger UI
security = HTTPBearer()


class TokenPayload(BaseModel):
    """Decoded JWT token payload structure."""
    session_id: str
    therapist_id: str
    iat: datetime
    exp: datetime
    jti: str
    type: str = "session_token"


class AuthenticatedSession(BaseModel):
    """Authenticated session data passed to endpoints."""
    session_id: str
    therapist_id: str
    token_id: str


def verify_token(token: str) -> TokenPayload:
    """
    Verify and decode a JWT session token.
    
    Args:
        token: JWT token string
        
    Returns:
        TokenPayload: Decoded token data
        
    Raises:
        HTTPException: If token is invalid or expired
    """
    try:
        payload = jwt.decode(
            token,
            settings.ai_service_secret_key,
            algorithms=[settings.jwt_algorithm]
        )
        
        # Validate token type
        if payload.get("type") != "session_token":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token type"
            )
        
        return TokenPayload(
            session_id=payload["session_id"],
            therapist_id=payload["therapist_id"],
            iat=datetime.fromtimestamp(payload["iat"]),
            exp=datetime.fromtimestamp(payload["exp"]),
            jti=payload["jti"],
            type=payload["type"]
        )
        
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired"
        )
    except jwt.InvalidTokenError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token: {str(e)}"
        )


async def get_current_session(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> AuthenticatedSession:
    """
    FastAPI dependency to authenticate and get current session.
    
    Usage:
        @app.get("/protected")
        async def protected(session: AuthenticatedSession = Depends(get_current_session)):
            print(session.session_id, session.therapist_id)
    """
    token = credentials.credentials
    payload = verify_token(token)
    
    return AuthenticatedSession(
        session_id=payload.session_id,
        therapist_id=payload.therapist_id,
        token_id=payload.jti
    )


async def get_websocket_session(
    websocket: WebSocket,
    token: Optional[str] = None
) -> AuthenticatedSession:
    """
    Authenticate WebSocket connections.
    Token can be passed via query parameter or header.
    
    Usage:
        @app.websocket("/ws/{session_id}")
        async def websocket_endpoint(
            websocket: WebSocket,
            session: AuthenticatedSession = Depends(get_websocket_session)
        ):
            ...
    """
    # Try to get token from query params first, then headers
    if token is None:
        token = websocket.query_params.get("token")
    
    if token is None:
        # Try Authorization header
        auth_header = websocket.headers.get("authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header[7:]
    
    if token is None:
        await websocket.close(code=4001, reason="Missing authentication token")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authentication token"
        )
    
    try:
        payload = verify_token(token)
        return AuthenticatedSession(
            session_id=payload.session_id,
            therapist_id=payload.therapist_id,
            token_id=payload.jti
        )
    except HTTPException as e:
        await websocket.close(code=4001, reason=e.detail)
        raise


def validate_session_access(
    session: AuthenticatedSession,
    requested_session_id: str
) -> bool:
    """
    Validate that the authenticated session matches the requested resource.
    
    Args:
        session: Authenticated session from token
        requested_session_id: Session ID from URL path
        
    Returns:
        bool: True if access is allowed
        
    Raises:
        HTTPException: If session IDs don't match
    """
    if session.session_id != requested_session_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: token session ID does not match requested session"
        )
    return True
