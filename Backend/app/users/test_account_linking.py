"""
Tests for the AccountLinkingService functionality.
"""

from django.test import TestCase
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta

from .models import PatientProfile, TherapistProfile
from .services import AccountLinkingService
from therapy_sessions.models import Session

User = get_user_model()


class AccountLinkingServiceTest(TestCase):
    """Test cases for AccountLinkingService"""
    
    def setUp(self):
        """Set up test data"""
        # Create a therapist
        self.therapist_user = User.objects.create_user(
            username='therapist1',
            email='therapist@example.com',
            password='testpass123',
            user_type='therapist',
            first_name='Dr. Jane',
            last_name='Smith'
        )
        
        self.therapist_profile = TherapistProfile.objects.create(
            user=self.therapist_user,
            license_number='LIC123',
            specialization='Clinical Psychology'
        )
        
        # Create a placeholder patient user (created by therapist)
        self.placeholder_user = User.objects.create_user(
            username='patient_placeholder',
            phone_number='+1234567890',
            user_type='patient',
            first_name='John',
            last_name='Doe',
            date_of_birth='1990-01-01'
        )
        
        # Create patient profile created by therapist
        self.patient_profile = PatientProfile.objects.create(
            user=self.placeholder_user,
            therapist=self.therapist_profile,
            created_by_therapist=self.therapist_profile,
            primary_concern='Anxiety',
            medical_history='No significant history'
        )
        
        # Create a session for the placeholder patient
        self.session = Session.objects.create(
            patient=self.placeholder_user,
            therapist=self.therapist_user,
            scheduled_date=timezone.now() + timedelta(days=1),
            session_notes='Initial session notes'
        )
    
    def test_find_existing_patient_success(self):
        """Test finding an existing patient profile by phone number"""
        found_profile = AccountLinkingService.find_existing_patient('+1234567890')
        
        self.assertIsNotNone(found_profile)
        self.assertEqual(found_profile.id, self.patient_profile.id)
        self.assertEqual(found_profile.user.phone_number, '+1234567890')
    
    def test_find_existing_patient_not_found(self):
        """Test finding non-existent patient profile"""
        found_profile = AccountLinkingService.find_existing_patient('+9999999999')
        
        self.assertIsNone(found_profile)
    
    def test_find_existing_patient_already_linked(self):
        """Test that already linked profiles are not returned"""
        # Mark profile as already linked
        self.patient_profile.is_linked_account = True
        self.patient_profile.save()
        
        found_profile = AccountLinkingService.find_existing_patient('+1234567890')
        
        self.assertIsNone(found_profile)
    
    def test_can_link_accounts_success(self):
        """Test successful account linking validation"""
        new_user = User.objects.create_user(
            username='newpatient',
            email='newpatient@example.com',
            password='testpass123',
            user_type='patient',
            phone_number='+1234567890'
        )
        
        can_link, reason = AccountLinkingService.can_link_accounts(new_user, self.patient_profile)
        
        self.assertTrue(can_link)
        self.assertEqual(reason, "Accounts can be linked")
    
    def test_can_link_accounts_already_linked(self):
        """Test validation when profile is already linked"""
        self.patient_profile.is_linked_account = True
        self.patient_profile.save()
        
        new_user = User.objects.create_user(
            username='newpatient',
            email='newpatient@example.com',
            password='testpass123',
            user_type='patient',
            phone_number='+1234567890'
        )
        
        can_link, reason = AccountLinkingService.can_link_accounts(new_user, self.patient_profile)
        
        self.assertFalse(can_link)
        self.assertEqual(reason, "Patient profile is already linked to another account")
    
    def test_can_link_accounts_phone_mismatch(self):
        """Test validation when phone numbers don't match"""
        new_user = User.objects.create_user(
            username='newpatient',
            email='newpatient@example.com',
            password='testpass123',
            user_type='patient',
            phone_number='+9999999999'  # Different phone number
        )
        
        can_link, reason = AccountLinkingService.can_link_accounts(new_user, self.patient_profile)
        
        self.assertFalse(can_link)
        self.assertEqual(reason, "Phone numbers do not match")
    
    def test_link_accounts_success(self):
        """Test successful account linking"""
        new_user = User.objects.create_user(
            username='newpatient',
            email='newpatient@example.com',
            password='testpass123',
            user_type='patient',
            phone_number='+1234567890'
        )
        
        success, message, linked_profile = AccountLinkingService.link_accounts(new_user, self.patient_profile)
        
        self.assertTrue(success)
        self.assertEqual(message, "Account successfully linked with existing patient profile")
        self.assertIsNotNone(linked_profile)
        
        # Verify the profile is now linked to the new user
        linked_profile.refresh_from_db()
        self.assertEqual(linked_profile.user, new_user)
        self.assertTrue(linked_profile.is_linked_account)
        self.assertIsNotNone(linked_profile.linked_at)
        
        # Verify the old placeholder user is deleted
        self.assertFalse(User.objects.filter(id=self.placeholder_user.id).exists())
        
        # Verify session history is transferred
        self.session.refresh_from_db()
        self.assertEqual(self.session.patient, new_user)
    
    def test_detect_and_link_during_registration_success(self):
        """Test automatic detection and linking during registration"""
        new_user = User.objects.create_user(
            username='newpatient',
            email='newpatient@example.com',
            password='testpass123',
            user_type='patient',
            phone_number='+1234567890'
        )
        
        linked, message, profile = AccountLinkingService.detect_and_link_during_registration(new_user)
        
        self.assertTrue(linked)
        self.assertIn("successfully linked", message)
        self.assertIsNotNone(profile)
        self.assertEqual(profile.user, new_user)
    
    def test_detect_and_link_during_registration_no_profile(self):
        """Test detection when no existing profile exists"""
        new_user = User.objects.create_user(
            username='newpatient',
            email='newpatient@example.com',
            password='testpass123',
            user_type='patient',
            phone_number='+9999999999'  # No existing profile with this number
        )
        
        linked, message, profile = AccountLinkingService.detect_and_link_during_registration(new_user)
        
        self.assertFalse(linked)
        self.assertEqual(message, "No existing patient profile found for linking")
        self.assertIsNone(profile)
    
    def test_detect_and_link_during_registration_therapist(self):
        """Test that therapists are not processed for linking"""
        therapist_user = User.objects.create_user(
            username='newtherapist',
            email='newtherapist@example.com',
            password='testpass123',
            user_type='therapist',
            phone_number='+1234567890'
        )
        
        linked, message, profile = AccountLinkingService.detect_and_link_during_registration(therapist_user)
        
        self.assertFalse(linked)
        self.assertEqual(message, "Account linking only available for patients")
        self.assertIsNone(profile)
    
    def test_detect_and_link_during_registration_no_phone(self):
        """Test detection when user has no phone number"""
        new_user = User.objects.create_user(
            username='newpatient',
            email='newpatient@example.com',
            password='testpass123',
            user_type='patient'
            # No phone number
        )
        
        linked, message, profile = AccountLinkingService.detect_and_link_during_registration(new_user)
        
        self.assertFalse(linked)
        self.assertEqual(message, "Phone number required for account linking")
        self.assertIsNone(profile)
    
    def test_get_linkable_profiles_for_phone(self):
        """Test getting all linkable profiles for a phone number"""
        profiles = AccountLinkingService.get_linkable_profiles_for_phone('+1234567890')
        
        self.assertEqual(len(profiles), 1)
        self.assertEqual(profiles[0].id, self.patient_profile.id)
    
    def test_get_linkable_profiles_for_phone_empty(self):
        """Test getting linkable profiles when none exist"""
        profiles = AccountLinkingService.get_linkable_profiles_for_phone('+9999999999')
        
        self.assertEqual(len(profiles), 0)
    
    def test_merge_session_history(self):
        """Test that session history is properly merged"""
        new_user = User.objects.create_user(
            username='newpatient',
            email='newpatient@example.com',
            password='testpass123',
            user_type='patient',
            phone_number='+1234567890'
        )
        
        # Create additional session
        session2 = Session.objects.create(
            patient=self.placeholder_user,
            therapist=self.therapist_user,
            scheduled_date=timezone.now() + timedelta(days=2),
            session_notes='Second session notes'
        )
        
        # Link accounts
        success, message, linked_profile = AccountLinkingService.link_accounts(new_user, self.patient_profile)
        
        self.assertTrue(success)
        
        # Verify both sessions are now linked to the new user
        sessions = Session.objects.filter(patient=new_user)
        self.assertEqual(sessions.count(), 2)
        
        session_notes = [s.session_notes for s in sessions]
        self.assertIn('Initial session notes', session_notes)
        self.assertIn('Second session notes', session_notes)
    
    def test_merge_user_data(self):
        """Test that user data is properly merged"""
        # Update placeholder user with additional data
        self.placeholder_user.date_of_birth = '1985-05-15'
        self.placeholder_user.gender = 'male'
        self.placeholder_user.save()
        
        new_user = User.objects.create_user(
            username='newpatient',
            email='newpatient@example.com',
            password='testpass123',
            user_type='patient',
            phone_number='+1234567890'
            # No date_of_birth or gender
        )
        
        # Link accounts
        success, message, linked_profile = AccountLinkingService.link_accounts(new_user, self.patient_profile)
        
        self.assertTrue(success)
        
        # Verify user data was merged
        new_user.refresh_from_db()
        self.assertEqual(str(new_user.date_of_birth), '1985-05-15')
        self.assertEqual(new_user.gender, 'male')