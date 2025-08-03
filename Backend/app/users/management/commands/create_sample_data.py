from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from users.models import TherapistProfile, PatientProfile
from therapy_sessions.models import Session
from django.utils import timezone
from datetime import timedelta
import random

User = get_user_model()

class Command(BaseCommand):
    help = 'Create sample therapists and patients for testing'

    def add_arguments(self, parser):
        parser.add_argument(
            '--therapists',
            type=int,
            default=2,
            help='Number of therapists to create',
        )
        parser.add_argument(
            '--patients',
            type=int,
            default=5,
            help='Number of patients to create',
        )

    def handle(self, *args, **options):
        self.stdout.write('Creating sample data...')
        
        # Create therapists
        therapists = []
        for i in range(options['therapists']):
            therapist_user = User.objects.create_user(
                username=f'therapist{i+1}@example.com',
                email=f'therapist{i+1}@example.com',
                password='password123',
                first_name=f'Dr. Therapist',
                last_name=f'{i+1}',
                user_type='therapist',
                phone_number=f'+1234567890{i}',
                date_of_birth='1980-01-01',
                gender='prefer_not_to_say'
            )
            
            therapist_profile = TherapistProfile.objects.create(
                user=therapist_user,
                license_number=f'LIC{1000+i}',
                specialization='Clinical Psychology',
                years_of_experience=random.randint(5, 20),
                education='PhD in Clinical Psychology',
                clinic_name=f'Wellness Clinic {i+1}',
                clinic_address=f'123 Health St, City {i+1}',
                consultation_fee=150.00,
                working_hours_start='09:00',
                working_hours_end='17:00',
                working_days='monday,tuesday,wednesday,thursday,friday',
                session_duration_minutes=60,
                max_patients=50,
                bio=f'Experienced therapist specializing in anxiety and depression treatment.',
                languages_spoken='English,Urdu'
            )
            therapists.append(therapist_profile)
            
            self.stdout.write(
                self.style.SUCCESS(f'Created therapist: {therapist_user.email}')
            )
            self.stdout.write(f'  - PIN: {therapist_profile.therapist_pin}')
            self.stdout.write(f'  - Pairing Code: {therapist_profile.pairing_code}')

        # Create patients
        for i in range(options['patients']):
            patient_user = User.objects.create_user(
                username=f'patient{i+1}@example.com',
                email=f'patient{i+1}@example.com',
                password='password123',
                first_name=f'Patient',
                last_name=f'{i+1}',
                user_type='patient',
                phone_number=f'+1234567891{i}',
                date_of_birth=f'199{random.randint(0,9)}-0{random.randint(1,9)}-{random.randint(10,28)}',
                gender=random.choice(['male', 'female', 'other'])
            )
            
            # Assign to random therapist
            therapist = random.choice(therapists)
            
            patient_profile = PatientProfile.objects.create(
                user=patient_user,
                therapist=therapist,
                created_by_therapist=therapist,
                connected_at=timezone.now(),
                primary_concern=random.choice([
                    'Anxiety and stress management',
                    'Depression and mood disorders',
                    'Relationship issues',
                    'Work-related stress',
                    'Family conflicts'
                ]),
                therapy_start_date=timezone.now().date() - timedelta(days=random.randint(30, 365)),
                session_frequency=random.choice(['weekly', 'biweekly', 'monthly']),
                preferred_session_days='monday,wednesday,friday',
                emergency_contact_name=f'Emergency Contact {i+1}',
                emergency_contact_phone=f'+1234567892{i}',
                medical_history='No significant medical history',
                current_medications='None',
                preferred_language='en'
            )
            
            self.stdout.write(
                self.style.SUCCESS(f'Created patient: {patient_user.email}')
            )
            self.stdout.write(f'  - Patient ID: {patient_profile.patient_id}')
            self.stdout.write(f'  - Assigned to: {therapist.user.full_name}')
            
            # Create some sample sessions
            for j in range(random.randint(1, 5)):
                session_date = timezone.now() + timedelta(days=random.randint(-30, 30))
                Session.objects.create(
                    patient=patient_user,
                    therapist=therapist.user,
                    session_type='individual',
                    scheduled_date=session_date,
                    duration_minutes=60,
                    status=random.choice(['scheduled', 'completed', 'cancelled']),
                    location='Clinic Room 1',
                    is_online=random.choice([True, False]),
                    session_notes='Sample session notes' if random.choice([True, False]) else '',
                    patient_mood_before=random.randint(1, 10),
                    patient_mood_after=random.randint(1, 10),
                    session_effectiveness=random.randint(6, 10),
                    consent_recording=True,
                    consent_ai_analysis=True,
                    fee_charged=150.00,
                    payment_status='paid',
                    created_by=therapist.user
                )

        self.stdout.write(
            self.style.SUCCESS(f'Successfully created {options["therapists"]} therapists and {options["patients"]} patients with sample sessions!')
        )
        
        self.stdout.write('\n' + '='*50)
        self.stdout.write('SAMPLE LOGIN CREDENTIALS:')
        self.stdout.write('='*50)
        self.stdout.write('Therapists:')
        for i in range(options['therapists']):
            self.stdout.write(f'  Email: therapist{i+1}@example.com')
            self.stdout.write(f'  Password: password123')
        self.stdout.write('\nPatients:')
        for i in range(options['patients']):
            self.stdout.write(f'  Email: patient{i+1}@example.com')
            self.stdout.write(f'  Password: password123')
        self.stdout.write('='*50)