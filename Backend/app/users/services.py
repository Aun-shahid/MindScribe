"""
Account linking service for connecting therapist-created patient profiles with user accounts.
"""

from django.contrib.auth import get_user_model
from django.utils import timezone
from django.db import transaction
from typing import Optional, Tuple
import logging

from .models import PatientProfile
from therapy_sessions.models import Session

User = get_user_model()
logger = logging.getLogger(__name__)


class AccountLinkingService:
    """
    Service class for handling account linking between therapist-created patient profiles
    and user accounts created during registration.
    """
    
    @staticmethod
    def find_existing_patient(phone_number: str) -> Optional[PatientProfile]:
        """
        Find an existing patient profile created by a therapist with matching phone number.
        
        Args:
            phone_number: Phone number to match against
            
        Returns:
            PatientProfile instance if found, None otherwise
        """
        if not phone_number:
            return None
            
        try:
            # Look for patient profiles created by therapists (not linked to accounts yet)
            # that have matching phone numbers
            patient_profile = PatientProfile.objects.select_related('user', 'therapist').get(
                user__phone_number=phone_number,
                created_by_therapist__isnull=False,  # Created by a therapist
                is_linked_account=False,  # Not yet linked to an account
                user__email__isnull=True  # No email means no login credentials
            )
            return patient_profile
        except PatientProfile.DoesNotExist:
            return None
        except PatientProfile.MultipleObjectsReturned:
            # If multiple profiles exist, return the most recent one
            logger.warning(f"Multiple unlinked patient profiles found for phone {phone_number}")
            return PatientProfile.objects.filter(
                user__phone_number=phone_number,
                created_by_therapist__isnull=False,
                is_linked_account=False,
                user__email__isnull=True
            ).order_by('-user__created_at').first()
    
    @staticmethod
    def can_link_accounts(new_user: User, existing_patient_profile: PatientProfile) -> Tuple[bool, str]:
        """
        Check if accounts can be linked.
        
        Args:
            new_user: The newly registered user
            existing_patient_profile: The existing patient profile to link
            
        Returns:
            Tuple of (can_link: bool, reason: str)
        """
        # Check if the existing profile is already linked
        if existing_patient_profile.is_linked_account:
            return False, "Patient profile is already linked to another account"
        
        # Check if the new user already has a patient profile
        if hasattr(new_user, 'patient_profile'):
            return False, "User already has a patient profile"
        
        # Check if phone numbers match
        if new_user.phone_number != existing_patient_profile.user.phone_number:
            return False, "Phone numbers do not match"
        
        # Check if the existing profile was created by a therapist
        if not existing_patient_profile.created_by_therapist:
            return False, "Patient profile was not created by a therapist"
        
        return True, "Accounts can be linked"
    
    @staticmethod
    @transaction.atomic
    def link_accounts(new_user: User, existing_patient_profile: PatientProfile) -> Tuple[bool, str, Optional[PatientProfile]]:
        """
        Link a newly registered user account with an existing therapist-created patient profile.
        
        Args:
            new_user: The newly registered user
            existing_patient_profile: The existing patient profile to link
            
        Returns:
            Tuple of (success: bool, message: str, linked_profile: Optional[PatientProfile])
        """
        try:
            # Verify accounts can be linked
            can_link, reason = AccountLinkingService.can_link_accounts(new_user, existing_patient_profile)
            if not can_link:
                return False, reason, None
            
            # Store the old user for cleanup
            old_user = existing_patient_profile.user
            
            # Update the patient profile to point to the new user
            existing_patient_profile.user = new_user
            existing_patient_profile.is_linked_account = True
            existing_patient_profile.linked_at = timezone.now()
            existing_patient_profile.save()
            
            # Merge session history
            AccountLinkingService._merge_session_history(old_user, new_user)
            
            # Update user information with any additional data from the old profile
            AccountLinkingService._merge_user_data(old_user, new_user)
            
            # Clean up the old user account (it was just a placeholder)
            old_user.delete()
            
            logger.info(f"Successfully linked account {new_user.email} with patient profile {existing_patient_profile.patient_id}")
            
            return True, "Account successfully linked with existing patient profile", existing_patient_profile
            
        except Exception as e:
            logger.error(f"Error linking accounts: {str(e)}")
            return False, f"Error linking accounts: {str(e)}", None
    
    @staticmethod
    def _merge_session_history(old_user: User, new_user: User) -> None:
        """
        Merge session history from old user to new user.
        
        Args:
            old_user: The placeholder user created by therapist
            new_user: The newly registered user
        """
        try:
            # Update all sessions where old_user was the patient
            sessions_updated = Session.objects.filter(patient=old_user).update(patient=new_user)
            
            if sessions_updated > 0:
                logger.info(f"Merged {sessions_updated} sessions from old user to new user")
                
        except Exception as e:
            logger.error(f"Error merging session history: {str(e)}")
            raise
    
    @staticmethod
    def _merge_user_data(old_user: User, new_user: User) -> None:
        """
        Merge any additional user data from old user to new user.
        
        Args:
            old_user: The placeholder user created by therapist
            new_user: The newly registered user
        """
        try:
            # Update new user with any missing information from old user
            updated = False
            
            # Merge date of birth if not set in new user
            if not new_user.date_of_birth and old_user.date_of_birth:
                new_user.date_of_birth = old_user.date_of_birth
                updated = True
            
            # Merge gender if not set in new user
            if not new_user.gender and old_user.gender:
                new_user.gender = old_user.gender
                updated = True
            
            # Merge names if not set in new user (though this is unlikely)
            if not new_user.first_name and old_user.first_name:
                new_user.first_name = old_user.first_name
                updated = True
                
            if not new_user.last_name and old_user.last_name:
                new_user.last_name = old_user.last_name
                updated = True
            
            if updated:
                new_user.save()
                logger.info("Merged additional user data from old profile")
                
        except Exception as e:
            logger.error(f"Error merging user data: {str(e)}")
            # Don't raise here as this is not critical for the linking process
    
    @staticmethod
    def detect_and_link_during_registration(user: User) -> Tuple[bool, str, Optional[PatientProfile]]:
        """
        Detect and automatically link accounts during patient registration.
        
        Args:
            user: The newly registered user
            
        Returns:
            Tuple of (linked: bool, message: str, profile: Optional[PatientProfile])
        """
        # Only attempt linking for patient accounts
        if user.user_type != 'patient':
            return False, "Account linking only available for patients", None
        
        # Only attempt linking if user has a phone number
        if not user.phone_number:
            return False, "Phone number required for account linking", None
        
        # Look for existing patient profile
        existing_profile = AccountLinkingService.find_existing_patient(user.phone_number)
        
        if not existing_profile:
            return False, "No existing patient profile found for linking", None
        
        # Attempt to link the accounts
        success, message, linked_profile = AccountLinkingService.link_accounts(user, existing_profile)
        
        if success:
            logger.info(f"Automatically linked account during registration: {user.email}")
        
        return success, message, linked_profile
    
    @staticmethod
    def get_linkable_profiles_for_phone(phone_number: str) -> list:
        """
        Get all patient profiles that could potentially be linked for a given phone number.
        
        Args:
            phone_number: Phone number to search for
            
        Returns:
            List of PatientProfile instances that could be linked
        """
        if not phone_number:
            return []
        
        return list(PatientProfile.objects.select_related('user', 'therapist', 'created_by_therapist').filter(
            user__phone_number=phone_number,
            created_by_therapist__isnull=False,
            is_linked_account=False,
            user__email__isnull=True
        ).order_by('-user__created_at'))