from django.shortcuts import render
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from drf_spectacular.utils import extend_schema

# Create your views here.

class HealthCheckView(APIView):
    """
    Simple health check endpoint to verify the server is running.
    """
    permission_classes = [] # Allow anyone to check health
    authentication_classes = []

    @extend_schema(
        responses={200: {"type": "object", "properties": {"status": {"type": "string"}, "timestamp": {"type": "string"}}}},
        summary="Server Health Check",
        description="Check if the server is up and responsive."
    )
    def get(self, request):
        import datetime
        return Response({
            "status": "healthy",
            "timestamp": datetime.datetime.now().isoformat(),
            "service": "MindScribe API"
        }, status=status.HTTP_200_OK)
