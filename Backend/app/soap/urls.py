from django.urls import path
from .views import BatchSOAPGenerationView, SOAPNoteDetailView

urlpatterns = [
    path('notes/batch-generate/', BatchSOAPGenerationView.as_view(), name='soap_batch_generate'),
    path('notes/<uuid:note_id>/', SOAPNoteDetailView.as_view(), name='soap_note_detail'),
]
