"""
Availability and Session Scheduling Services.

Provides robust conflict detection, slot availability checking, and session booking validation.
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, date, time, timedelta
from typing import List, Optional, Tuple, Dict, Any
from django.db import models, transaction
from django.db.models import Q
from django.utils import timezone
from django.contrib.auth import get_user_model

from .models import Session, TherapistAvailability, TherapistDateOverride

User = get_user_model()


@dataclass
class TimeSlot:
    """Represents an available time slot"""
    start_time: datetime
    end_time: datetime
    duration_minutes: int
    is_online_available: bool = True
    is_in_person_available: bool = True
    location: Optional[str] = None


@dataclass
class ConflictResult:
    """Result of a conflict check"""
    has_conflict: bool
    conflicting_sessions: List[Session]
    conflict_reason: Optional[str] = None


@dataclass
class ValidationResult:
    """Result of booking validation"""
    is_valid: bool
    errors: List[str]
    warnings: List[str]


class AvailabilityService:
    """Service for managing therapist availability and scheduling"""
    
    def get_therapist_availability_for_date(self, therapist: User, target_date: date) -> Optional[TherapistAvailability]:
        """
        Get the effective availability for a therapist on a specific date.
        Considers both regular weekly availability and date overrides.
        """
        # First check for date overrides
        override = TherapistDateOverride.objects.filter(
            therapist=therapist,
            date__lte=target_date
        ).filter(
            Q(end_date__isnull=True, date=target_date) |
            Q(end_date__gte=target_date)
        ).first()
        
        if override:
            if not override.is_available:
                return None  # Day off or vacation
            # Return a synthetic availability based on override
            return self._create_availability_from_override(override, target_date)
        
        # Get regular weekly availability
        day_of_week = target_date.weekday()
        availability = TherapistAvailability.objects.filter(
            therapist=therapist,
            day_of_week=day_of_week,
            is_day_off=False
        ).filter(
            Q(effective_from__isnull=True) | Q(effective_from__lte=target_date)
        ).filter(
            Q(effective_until__isnull=True) | Q(effective_until__gte=target_date)
        ).first()
        
        return availability
    
    def _create_availability_from_override(self, override: TherapistDateOverride, target_date: date) -> Optional[TherapistAvailability]:
        """Create a synthetic availability object from a date override"""
        if not override.is_available:
            return None
        
        # Create a temporary TherapistAvailability object (not saved to DB)
        avail = TherapistAvailability(
            therapist=override.therapist,
            day_of_week=target_date.weekday(),
            is_day_off=False,
            start_time=override.start_time,
            end_time=override.end_time,
            break_start=override.break_start,
            break_end=override.break_end,
        )
        return avail
    
    def get_available_slots(
        self, 
        therapist: User, 
        start_date: date, 
        end_date: date,
        duration_minutes: int = 60,
        is_online: Optional[bool] = None
    ) -> Dict[date, List[TimeSlot]]:
        """
        Get all available time slots for a therapist within a date range.
        Returns a dictionary mapping dates to available slots.
        """
        available_slots = {}
        current_date = start_date
        
        while current_date <= end_date:
            slots = self.get_available_slots_for_date(
                therapist, current_date, duration_minutes, is_online
            )
            if slots:
                available_slots[current_date] = slots
            current_date += timedelta(days=1)
        
        return available_slots
    
    def get_available_slots_for_date(
        self,
        therapist: User,
        target_date: date,
        duration_minutes: int = 60,
        is_online: Optional[bool] = None
    ) -> List[TimeSlot]:
        """
        Get all available time slots for a therapist on a specific date.
        Considers existing sessions and availability configuration.
        """
        availability = self.get_therapist_availability_for_date(therapist, target_date)
        if not availability:
            return []
        
        # Check online/in-person availability
        if is_online is not None:
            if is_online and not availability.is_online_available:
                return []
            if not is_online and not availability.is_in_person_available:
                return []
        
        # Get existing sessions for the day
        existing_sessions = Session.objects.filter(
            therapist=therapist,
            scheduled_date__date=target_date,
            status__in=['UPCOMING', 'REQUESTED', 'IN_PROGRESS', 'EMERGENCY_REQUESTED']
        ).order_by('scheduled_date')
        
        # Calculate buffer time
        buffer = getattr(availability, 'buffer_minutes', 15)
        
        # Generate available slots
        slots = []
        current_time = datetime.combine(target_date, availability.start_time)
        end_time = datetime.combine(target_date, availability.end_time)
        
        # Make timezone-aware
        if timezone.is_aware(timezone.now()):
            current_time = timezone.make_aware(current_time)
            end_time = timezone.make_aware(end_time)
        
        # Skip past times if date is today
        now = timezone.now()
        if target_date == now.date():
            if current_time < now:
                current_time = now + timedelta(minutes=buffer)
        
        # Build list of blocked periods
        blocked_periods = []
        
        # Add break period if exists
        if availability.break_start and availability.break_end:
            break_start = datetime.combine(target_date, availability.break_start)
            break_end = datetime.combine(target_date, availability.break_end)
            if timezone.is_aware(timezone.now()):
                break_start = timezone.make_aware(break_start)
                break_end = timezone.make_aware(break_end)
            blocked_periods.append((break_start, break_end))
        
        # Add existing sessions with buffer
        for session in existing_sessions:
            session_start = session.scheduled_date - timedelta(minutes=buffer)
            session_end = session.scheduled_date + timedelta(minutes=session.duration_minutes + buffer)
            blocked_periods.append((session_start, session_end))
        
        # Sort blocked periods
        blocked_periods.sort(key=lambda x: x[0])
        
        # Find available slots
        while current_time + timedelta(minutes=duration_minutes) <= end_time:
            slot_end = current_time + timedelta(minutes=duration_minutes)
            
            # Check if slot conflicts with any blocked period
            is_blocked = False
            for block_start, block_end in blocked_periods:
                if not (slot_end <= block_start or current_time >= block_end):
                    is_blocked = True
                    # Move current_time past this blocked period
                    current_time = block_end + timedelta(minutes=buffer)
                    break
            
            if not is_blocked:
                slots.append(TimeSlot(
                    start_time=current_time,
                    end_time=slot_end,
                    duration_minutes=duration_minutes,
                    is_online_available=availability.is_online_available,
                    is_in_person_available=availability.is_in_person_available,
                    location=availability.location
                ))
                current_time = slot_end + timedelta(minutes=buffer)
            
            # Safety check for max sessions
            if len(slots) >= getattr(availability, 'max_sessions_per_day', 8):
                break
        
        return slots
    
    def check_slot_conflict(
        self,
        therapist: User,
        proposed_datetime: datetime,
        duration_minutes: int = 60,
        exclude_session_id: Optional[str] = None
    ) -> ConflictResult:
        """
        Check if a proposed time slot conflicts with existing sessions.
        Returns detailed conflict information.
        """
        proposed_end = proposed_datetime + timedelta(minutes=duration_minutes)
        
        # Get therapist buffer time
        buffer_minutes = 15
        try:
            therapist_profile = therapist.therapist_profile
            buffer_minutes = getattr(therapist_profile, 'buffer_between_sessions', 15)
        except:
            pass
        
        # Adjust for buffer
        check_start = proposed_datetime - timedelta(minutes=buffer_minutes)
        check_end = proposed_end + timedelta(minutes=buffer_minutes)
        
        # Find conflicting sessions
        conflicts_query = Session.objects.filter(
            therapist=therapist,
            status__in=['UPCOMING', 'REQUESTED', 'IN_PROGRESS', 'EMERGENCY_REQUESTED']
        ).filter(
            Q(scheduled_date__lt=check_end) &
            Q(scheduled_date__gt=check_start - models.F('duration_minutes') * timedelta(minutes=1))
        )
        
        # Exclude the session being rescheduled if provided
        if exclude_session_id:
            conflicts_query = conflicts_query.exclude(id=exclude_session_id)
        
        conflicting_sessions = list(conflicts_query)
        
        # Filter out sessions that don't actually overlap
        actual_conflicts = []
        for session in conflicting_sessions:
            session_end = session.scheduled_date + timedelta(minutes=session.duration_minutes)
            # Check overlap with buffer
            if not (proposed_end + timedelta(minutes=buffer_minutes) <= session.scheduled_date or 
                   proposed_datetime >= session_end + timedelta(minutes=buffer_minutes)):
                actual_conflicts.append(session)
        
        if actual_conflicts:
            return ConflictResult(
                has_conflict=True,
                conflicting_sessions=actual_conflicts,
                conflict_reason=f"Time slot conflicts with {len(actual_conflicts)} existing session(s)"
            )
        
        return ConflictResult(
            has_conflict=False,
            conflicting_sessions=[],
            conflict_reason=None
        )
    
    def validate_booking(
        self,
        therapist: User,
        patient: User,
        proposed_datetime: datetime,
        duration_minutes: int = 60,
        is_online: bool = False,
        is_emergency: bool = False,
        exclude_session_id: Optional[str] = None
    ) -> ValidationResult:
        """
        Comprehensive booking validation.
        Checks availability, conflicts, and business rules.
        """
        errors = []
        warnings = []
        
        # Emergency sessions bypass availability checks but still check conflicts
        if not is_emergency:
            # Check if date is in the past
            if proposed_datetime < timezone.now():
                errors.append("Cannot book sessions in the past")
            
            # Check therapist availability for the date
            target_date = proposed_datetime.date()
            availability = self.get_therapist_availability_for_date(therapist, target_date)
            
            if not availability:
                errors.append(f"Therapist is not available on {target_date}")
            else:
                # Check working hours
                proposed_time = proposed_datetime.time()
                proposed_end_time = (proposed_datetime + timedelta(minutes=duration_minutes)).time()
                
                if proposed_time < availability.start_time:
                    errors.append(f"Session starts before working hours ({availability.start_time})")
                
                if proposed_end_time > availability.end_time:
                    errors.append(f"Session ends after working hours ({availability.end_time})")
                
                # Check break time
                if availability.break_start and availability.break_end:
                    break_start = availability.break_start
                    break_end = availability.break_end
                    if not (proposed_end_time <= break_start or proposed_time >= break_end):
                        errors.append(f"Session overlaps with therapist's break ({break_start} - {break_end})")
                
                # Check online/in-person availability
                if is_online and not availability.is_online_available:
                    errors.append("Online sessions not available on this day")
                if not is_online and not availability.is_in_person_available:
                    errors.append("In-person sessions not available on this day")
        
        # Always check for conflicts (even for emergency sessions)
        conflict_result = self.check_slot_conflict(
            therapist, proposed_datetime, duration_minutes, exclude_session_id
        )
        
        if conflict_result.has_conflict:
            if is_emergency:
                warnings.append(conflict_result.conflict_reason + " (Emergency session override)")
            else:
                errors.append(conflict_result.conflict_reason)
        
        # Check patient connection to therapist
        try:
            patient_profile = patient.patient_profile
            if patient_profile.therapist and patient_profile.therapist.user != therapist:
                warnings.append("Patient is connected to a different therapist")
        except:
            warnings.append("Patient profile not found")
        
        return ValidationResult(
            is_valid=len(errors) == 0,
            errors=errors,
            warnings=warnings
        )
    
    def create_recurring_sessions(
        self,
        therapist: User,
        patient: User,
        start_datetime: datetime,
        recurring_weeks: int,
        duration_minutes: int = 60,
        session_type: str = 'individual',
        is_online: bool = False,
        location: Optional[str] = None,
        fee_charged: Optional[float] = None
    ) -> Tuple[List[Session], List[Dict[str, Any]]]:
        """
        Create a series of recurring sessions.
        Returns tuple of (created_sessions, conflicts/errors).
        """
        created_sessions = []
        conflicts = []
        
        with transaction.atomic():
            # Create the parent session first
            parent_session = None
            current_datetime = start_datetime
            
            for week_index in range(recurring_weeks):
                # Validate the slot
                validation = self.validate_booking(
                    therapist=therapist,
                    patient=patient,
                    proposed_datetime=current_datetime,
                    duration_minutes=duration_minutes,
                    is_online=is_online
                )
                
                if not validation.is_valid:
                    conflicts.append({
                        'week': week_index + 1,
                        'date': current_datetime,
                        'errors': validation.errors,
                        'warnings': validation.warnings
                    })
                    current_datetime += timedelta(weeks=1)
                    continue
                
                # Create the session
                session_data = {
                    'patient': patient,
                    'therapist': therapist,
                    'scheduled_date': current_datetime,
                    'duration_minutes': duration_minutes,
                    'session_type': session_type,
                    'is_online': is_online,
                    'location': location,
                    'status': 'UPCOMING',
                    'is_recurring': True,
                    'recurring_weeks': recurring_weeks,
                    'recurrence_index': week_index + 1,
                    'created_by': therapist,
                }
                
                if fee_charged is not None:
                    session_data['fee_charged'] = fee_charged
                
                if parent_session:
                    session_data['recurrence_parent'] = parent_session
                
                session = Session.objects.create(**session_data)
                
                if week_index == 0:
                    parent_session = session
                
                created_sessions.append(session)
                
                # Move to next week
                current_datetime += timedelta(weeks=1)
        
        return created_sessions, conflicts
    
    def handle_availability_change(
        self,
        therapist: User,
        affected_dates: List[date]
    ) -> List[Session]:
        """
        Handle sessions affected by availability changes.
        Marks sessions as NEEDS_RESCHEDULING if they now conflict.
        """
        affected_sessions = []
        
        for target_date in affected_dates:
            # Get sessions on this date
            sessions = Session.objects.filter(
                therapist=therapist,
                scheduled_date__date=target_date,
                status__in=['UPCOMING', 'REQUESTED']
            )
            
            for session in sessions:
                # Check if session is still valid
                validation = self.validate_booking(
                    therapist=therapist,
                    patient=session.patient,
                    proposed_datetime=session.scheduled_date,
                    duration_minutes=session.duration_minutes,
                    is_online=session.is_online,
                    exclude_session_id=str(session.id)
                )
                
                if not validation.is_valid:
                    session.mark_needs_rescheduling(
                        reason=f"Availability changed: {'; '.join(validation.errors)}"
                    )
                    affected_sessions.append(session)
        
        return affected_sessions


# Global service instance
availability_service = AvailabilityService()
