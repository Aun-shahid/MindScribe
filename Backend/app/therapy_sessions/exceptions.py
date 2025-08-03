"""
Custom exceptions and error handling for therapy sessions app.
"""

from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status
from django.core.exceptions import ValidationError
import logging

logger = logging.getLogger(__name__)


def custom_exception_handler(exc, context):
    """
    Custom exception handler that provides standardized error responses.
    """
    # Call REST framework's default exception handler first
    response = exception_handler(exc, context)
    
    if response is not None:
        # Get the view and request from context
        view = context.get('view')
        request = context.get('request')
        
        # Log the error
        logger.error(f"API Error in {view.__class__.__name__}: {str(exc)}")
        
        # Create standardized error response
        custom_response_data = {
            'error': True,
            'message': 'An error occurred',
            'details': {},
            'status_code': response.status_code
        }
        
        # Handle different types of errors
        if response.status_code == status.HTTP_400_BAD_REQUEST:
            custom_response_data['message'] = 'Validation failed'
            if hasattr(response, 'data') and isinstance(response.data, dict):
                custom_response_data['details'] = response.data
            else:
                custom_response_data['details'] = {'non_field_errors': [str(exc)]}
                
        elif response.status_code == status.HTTP_401_UNAUTHORIZED:
            custom_response_data['message'] = 'Authentication required'
            custom_response_data['details'] = {'auth': ['Please provide valid authentication credentials']}
            
        elif response.status_code == status.HTTP_403_FORBIDDEN:
            custom_response_data['message'] = 'Access denied'
            # Add role-based error messages
            if request and hasattr(request, 'user') and request.user.is_authenticated:
                user_type = getattr(request.user, 'user_type', 'unknown')
                if user_type == 'patient':
                    custom_response_data['details'] = {
                        'permission': ['Patients do not have permission to perform this action']
                    }
                elif user_type == 'therapist':
                    custom_response_data['details'] = {
                        'permission': ['Therapists do not have permission to perform this action']
                    }
                else:
                    custom_response_data['details'] = {
                        'permission': ['You do not have permission to perform this action']
                    }
            else:
                custom_response_data['details'] = {
                    'permission': ['Authentication required to access this resource']
                }
                
        elif response.status_code == status.HTTP_404_NOT_FOUND:
            custom_response_data['message'] = 'Resource not found'
            custom_response_data['details'] = {'resource': ['The requested resource was not found']}
            
        elif response.status_code == status.HTTP_405_METHOD_NOT_ALLOWED:
            custom_response_data['message'] = 'Method not allowed'
            custom_response_data['details'] = {'method': ['This HTTP method is not allowed for this endpoint']}
            
        elif response.status_code >= 500:
            custom_response_data['message'] = 'Internal server error'
            custom_response_data['details'] = {'server': ['An internal server error occurred']}
            
        else:
            # For other status codes, use the original response data
            if hasattr(response, 'data'):
                if isinstance(response.data, dict):
                    custom_response_data['details'] = response.data
                else:
                    custom_response_data['details'] = {'error': [str(response.data)]}
        
        response.data = custom_response_data
    
    return response


class TherapySessionException(Exception):
    """Base exception for therapy session related errors"""
    pass


class PatientNotConnectedException(TherapySessionException):
    """Raised when trying to access a patient not connected to the therapist"""
    pass


class SessionNotAvailableException(TherapySessionException):
    """Raised when trying to perform an action on a session that's not in the right state"""
    pass


class MaxPatientsReachedException(TherapySessionException):
    """Raised when therapist tries to add more patients than allowed"""
    pass


class AccountLinkingException(TherapySessionException):
    """Raised when account linking fails"""
    pass


def validate_session_status_transition(current_status, new_status):
    """
    Validate if a session status transition is allowed.
    
    Args:
        current_status: Current session status
        new_status: Desired new status
        
    Raises:
        ValidationError: If transition is not allowed
    """
    valid_transitions = {
        'scheduled': ['in_progress', 'cancelled', 'no_show'],
        'in_progress': ['completed', 'cancelled'],
        'completed': [],  # Completed sessions cannot be changed
        'cancelled': ['scheduled'],  # Can reschedule cancelled sessions
        'no_show': ['scheduled'],  # Can reschedule no-show sessions
        'rescheduled': ['scheduled']
    }
    
    if current_status not in valid_transitions:
        raise ValidationError(f"Invalid current status: {current_status}")
    
    if new_status not in valid_transitions[current_status]:
        raise ValidationError(
            f"Cannot change session status from '{current_status}' to '{new_status}'. "
            f"Valid transitions: {valid_transitions[current_status]}"
        )


def validate_user_role_for_action(user, required_role, action_description):
    """
    Validate that user has the required role for an action.
    
    Args:
        user: User instance
        required_role: Required user role ('patient', 'therapist', 'admin')
        action_description: Description of the action for error message
        
    Raises:
        ValidationError: If user doesn't have required role
    """
    if not user.is_authenticated:
        raise ValidationError("Authentication required")
    
    if user.user_type != required_role:
        role_messages = {
            'patient': f"Only patients can {action_description}",
            'therapist': f"Only therapists can {action_description}",
            'admin': f"Only administrators can {action_description}"
        }
        raise ValidationError(role_messages.get(required_role, f"Invalid role required: {required_role}"))


def validate_patient_therapist_connection(patient, therapist):
    """
    Validate that a patient is connected to a specific therapist.
    
    Args:
        patient: Patient user instance
        therapist: Therapist user instance
        
    Raises:
        PatientNotConnectedException: If patient is not connected to therapist
    """
    if not hasattr(patient, 'patient_profile'):
        raise PatientNotConnectedException("Patient profile not found")
    
    if not patient.patient_profile.therapist:
        raise PatientNotConnectedException("Patient is not connected to any therapist")
    
    if patient.patient_profile.therapist.user != therapist:
        raise PatientNotConnectedException("Patient is not connected to this therapist")


def validate_session_timing(scheduled_date, duration_minutes):
    """
    Validate session timing parameters.
    
    Args:
        scheduled_date: Scheduled date/time for the session
        duration_minutes: Duration in minutes
        
    Raises:
        ValidationError: If timing parameters are invalid
    """
    from django.utils import timezone
    from datetime import timedelta
    
    if scheduled_date < timezone.now():
        raise ValidationError("Cannot schedule sessions in the past")
    
    if duration_minutes < 15:
        raise ValidationError("Session duration must be at least 15 minutes")
    
    if duration_minutes > 480:  # 8 hours
        raise ValidationError("Session duration cannot exceed 8 hours")
    
    # Check if scheduled too far in advance (1 year)
    max_advance = timezone.now() + timedelta(days=365)
    if scheduled_date > max_advance:
        raise ValidationError("Cannot schedule sessions more than 1 year in advance")