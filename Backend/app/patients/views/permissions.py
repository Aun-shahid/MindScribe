"""Common utilities for patient views"""
from rest_framework.permissions import IsAuthenticated


class IsPatient(IsAuthenticated):
    """Permission class to ensure user is a patient"""
    def has_permission(self, request, view):
        return super().has_permission(request, view) and request.user.user_type == 'patient'
