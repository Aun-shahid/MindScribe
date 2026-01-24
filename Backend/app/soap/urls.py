from django.urls import path
from .views import (
    BatchSOAPGenerationView, SOAPNoteDetailView, SOAPNoteListView,
    SOAPNoteCreateView, SOAPNoteUpdateView, SOAPNoteDeleteView,
    SessionSOAPNoteView, SOAPNoteVersionsView
)

urlpatterns = [
    # SOAP note list and creation
    path('notes/', SOAPNoteListView.as_view(), name='soap_note_list'),
    path('notes/create/', SOAPNoteCreateView.as_view(), name='soap_note_create'),
    path('notes/batch-generate/', BatchSOAPGenerationView.as_view(), name='soap_batch_generate'),
    
    # Individual SOAP note operations
    path('notes/<uuid:note_id>/', SOAPNoteDetailView.as_view(), name='soap_note_detail'),
    path('notes/<uuid:note_id>/update/', SOAPNoteUpdateView.as_view(), name='soap_note_update'),
    path('notes/<uuid:note_id>/delete/', SOAPNoteDeleteView.as_view(), name='soap_note_delete'),
    path('notes/<uuid:note_id>/versions/', SOAPNoteVersionsView.as_view(), name='soap_note_versions'),
    
    # Session-specific SOAP note
    path('sessions/<uuid:session_id>/note/', SessionSOAPNoteView.as_view(), name='session_soap_note'),
]
