"""Daily inspiration views"""
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
import random
from drf_spectacular.utils import extend_schema

from ..models import DailyInspiration
from ..serializers import DailyInspirationSerializer
from .permissions import IsPatient


@extend_schema(
    tags=['Patient - Wellness'],
    summary='Get daily inspiration',
    description='Receive a daily inspirational quote with optional reflection prompt.',
    responses={200: DailyInspirationSerializer}
)
class DailyInspirationView(APIView):
    """Get daily inspiration quote"""
    permission_classes = [IsPatient]
    
    def get(self, request):
        # Try to get today's featured quote
        featured = DailyInspiration.objects.filter(is_active=True, featured=True).first()
        
        if not featured:
            # Get random active quote
            count = DailyInspiration.objects.filter(is_active=True).count()
            if count > 0:
                random_index = random.randint(0, count - 1)
                featured = DailyInspiration.objects.filter(is_active=True)[random_index]
        
        if featured:
            serializer = DailyInspirationSerializer(featured)
            return Response(serializer.data)
        
        return Response({'detail': 'No inspiration available'}, status=status.HTTP_404_NOT_FOUND)
