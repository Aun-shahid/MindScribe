"""
JWT Token Utility for AI Service Authentication
Generates secure JWT tokens for therapy session authentication with FastAPI AI service
"""
import jwt
from datetime import datetime, timedelta
from django.conf import settings
import uuid


# Secret key for AI service JWT tokens (different from Django's JWT)
# In production, store this in environment variables
AI_SERVICE_SECRET_KEY = getattr(settings, 'AI_SERVICE_SECRET_KEY', settings.SECRET_KEY)
AI_SERVICE_ALGORITHM = 'HS256'


def generate_session_token(session_id, therapist_id, expiration_hours=2):
    """
    Generate a JWT token for therapy session authentication with AI service
    
    Args:
        session_id: UUID of the therapy session
        therapist_id: UUID of the therapist conducting the session
        expiration_hours: Token expiration time in hours (default: 2 hours)
    
    Returns:
        str: JWT token string
    """
    # Convert UUIDs to strings if they aren't already
    session_id_str = str(session_id)
    therapist_id_str = str(therapist_id)
    
    # Calculate expiration time
    expiration_time = datetime.utcnow() + timedelta(hours=expiration_hours)
    
    # Create token payload
    payload = {
        'session_id': session_id_str,
        'therapist_id': therapist_id_str,
        'iat': datetime.utcnow(),  # Issued at time
        'exp': expiration_time,     # Expiration time
        'jti': str(uuid.uuid4()),   # Unique token ID
        'type': 'session_token',    # Token type identifier
    }
    
    # Generate and return the token
    token = jwt.encode(payload, AI_SERVICE_SECRET_KEY, algorithm=AI_SERVICE_ALGORITHM)
    
    return token


def verify_session_token(token):
    """
    Verify and decode a session token
    
    Args:
        token: JWT token string
    
    Returns:
        dict: Decoded token payload if valid
    
    Raises:
        jwt.ExpiredSignatureError: If token has expired
        jwt.InvalidTokenError: If token is invalid
    """
    try:
        payload = jwt.decode(token, AI_SERVICE_SECRET_KEY, algorithms=[AI_SERVICE_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise ValueError("Token has expired")
    except jwt.InvalidTokenError:
        raise ValueError("Invalid token")


def refresh_session_token(old_token, expiration_hours=2):
    """
    Refresh an existing session token by generating a new one with the same session/therapist IDs
    
    Args:
        old_token: The existing JWT token
        expiration_hours: New token expiration time in hours (default: 2 hours)
    
    Returns:
        str: New JWT token string
    
    Raises:
        ValueError: If old token is invalid
    """
    # Verify and decode the old token
    payload = verify_session_token(old_token)
    
    # Generate new token with same session and therapist IDs
    new_token = generate_session_token(
        session_id=payload['session_id'],
        therapist_id=payload['therapist_id'],
        expiration_hours=expiration_hours
    )
    
    return new_token
