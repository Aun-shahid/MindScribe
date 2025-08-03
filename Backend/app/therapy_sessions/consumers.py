"""
WebSocket consumers for therapy sessions.
Handles secure WebSocket connections for real-time therapy session communication.
"""

import json
import uuid
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model
from django.utils import timezone
from .models import Session
import logging

User = get_user_model()
logger = logging.getLogger(__name__)


class TherapySessionConsumer(AsyncWebsocketConsumer):
    """
    WebSocket consumer for therapy sessions.
    Handles real-time communication between therapist and patient during sessions.
    """
    
    async def connect(self):
        """Handle WebSocket connection"""
        self.room_id = self.scope['url_route']['kwargs']['room_id']
        self.room_group_name = f'therapy_session_{self.room_id}'
        self.user = self.scope['user']
        
        # Validate user authentication
        if not self.user.is_authenticated:
            await self.close(code=4001)  # Unauthorized
            return
        
        # Validate session access
        session = await self.get_session()
        if not session:
            await self.close(code=4004)  # Not Found
            return
        
        # Validate user permission to join session
        if not await self.can_join_session(session):
            await self.close(code=4003)  # Forbidden
            return
        
        # Join room group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        
        # Accept WebSocket connection
        await self.accept()
        
        # Mark WebSocket as active
        await self.mark_websocket_active(session, True)
        
        # Send connection confirmation
        await self.send(text_data=json.dumps({
            'type': 'connection_established',
            'message': 'Connected to therapy session',
            'session_id': str(session.id),
            'room_id': str(self.room_id),
            'user_type': self.user.user_type,
            'timestamp': timezone.now().isoformat()
        }))
        
        # Notify other participants
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'user_joined',
                'user_id': str(self.user.id),
                'user_name': self.user.full_name,
                'user_type': self.user.user_type,
                'timestamp': timezone.now().isoformat()
            }
        )
        
        logger.info(f"User {self.user.id} connected to therapy session {session.id}")
    
    async def disconnect(self, close_code):
        """Handle WebSocket disconnection"""
        # Get session before leaving group
        session = await self.get_session()
        
        # Leave room group
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )
        
        # Mark WebSocket as inactive if this was the last connection
        if session:
            await self.mark_websocket_active(session, False)
            
            # Notify other participants
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'user_left',
                    'user_id': str(self.user.id),
                    'user_name': self.user.full_name,
                    'user_type': self.user.user_type,
                    'timestamp': timezone.now().isoformat()
                }
            )
        
        logger.info(f"User {self.user.id} disconnected from therapy session (code: {close_code})")
    
    async def receive(self, text_data):
        """Handle messages from WebSocket"""
        try:
            text_data_json = json.loads(text_data)
            message_type = text_data_json.get('type')
            
            # Validate session is still active
            session = await self.get_session()
            if not session or session.status not in ['scheduled', 'in_progress']:
                await self.send(text_data=json.dumps({
                    'type': 'error',
                    'message': 'Session is not active',
                    'code': 'SESSION_INACTIVE'
                }))
                return
            
            # Handle different message types
            if message_type == 'session_message':
                await self.handle_session_message(text_data_json)
            elif message_type == 'session_control':
                await self.handle_session_control(text_data_json)
            elif message_type == 'audio_data':
                await self.handle_audio_data(text_data_json)
            elif message_type == 'heartbeat':
                await self.handle_heartbeat(text_data_json)
            else:
                await self.send(text_data=json.dumps({
                    'type': 'error',
                    'message': f'Unknown message type: {message_type}',
                    'code': 'UNKNOWN_MESSAGE_TYPE'
                }))
                
        except json.JSONDecodeError:
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': 'Invalid JSON format',
                'code': 'INVALID_JSON'
            }))
        except Exception as e:
            logger.error(f"Error handling WebSocket message: {str(e)}")
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': 'Internal server error',
                'code': 'INTERNAL_ERROR'
            }))
    
    async def handle_session_message(self, data):
        """Handle session chat messages"""
        message = data.get('message', '')
        if not message.strip():
            return
        
        # Broadcast message to all participants
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'session_message',
                'message': message,
                'sender_id': str(self.user.id),
                'sender_name': self.user.full_name,
                'sender_type': self.user.user_type,
                'timestamp': timezone.now().isoformat()
            }
        )
    
    async def handle_session_control(self, data):
        """Handle session control commands (start, pause, end)"""
        action = data.get('action')
        session = await self.get_session()
        
        # Only therapists can control sessions
        if self.user.user_type != 'therapist':
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': 'Only therapists can control sessions',
                'code': 'PERMISSION_DENIED'
            }))
            return
        
        if action == 'start_session':
            if session.status == 'scheduled':
                await self.start_session(session)
        elif action == 'end_session':
            if session.status == 'in_progress':
                await self.end_session(session)
        elif action == 'pause_session':
            # Handle session pause logic
            await self.pause_session(session)
        else:
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': f'Unknown session action: {action}',
                'code': 'UNKNOWN_ACTION'
            }))
    
    async def handle_audio_data(self, data):
        """Handle audio data for recording/transcription"""
        # This would integrate with your transcription service
        audio_chunk = data.get('audio_data')
        if audio_chunk:
            # Forward audio data to transcription service
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'audio_data',
                    'audio_data': audio_chunk,
                    'sender_id': str(self.user.id),
                    'timestamp': timezone.now().isoformat()
                }
            )
    
    async def handle_heartbeat(self, data):
        """Handle heartbeat messages to keep connection alive"""
        await self.send(text_data=json.dumps({
            'type': 'heartbeat_response',
            'timestamp': timezone.now().isoformat()
        }))
    
    # Group message handlers
    async def session_message(self, event):
        """Send session message to WebSocket"""
        await self.send(text_data=json.dumps({
            'type': 'session_message',
            'message': event['message'],
            'sender_id': event['sender_id'],
            'sender_name': event['sender_name'],
            'sender_type': event['sender_type'],
            'timestamp': event['timestamp']
        }))
    
    async def user_joined(self, event):
        """Send user joined notification to WebSocket"""
        # Don't send to the user who just joined
        if event['user_id'] != str(self.user.id):
            await self.send(text_data=json.dumps({
                'type': 'user_joined',
                'user_id': event['user_id'],
                'user_name': event['user_name'],
                'user_type': event['user_type'],
                'timestamp': event['timestamp']
            }))
    
    async def user_left(self, event):
        """Send user left notification to WebSocket"""
        # Don't send to the user who just left
        if event['user_id'] != str(self.user.id):
            await self.send(text_data=json.dumps({
                'type': 'user_left',
                'user_id': event['user_id'],
                'user_name': event['user_name'],
                'user_type': event['user_type'],
                'timestamp': event['timestamp']
            }))
    
    async def session_status_changed(self, event):
        """Send session status change to WebSocket"""
        await self.send(text_data=json.dumps({
            'type': 'session_status_changed',
            'status': event['status'],
            'timestamp': event['timestamp']
        }))
    
    async def audio_data(self, event):
        """Forward audio data to WebSocket"""
        # Don't echo back to sender
        if event['sender_id'] != str(self.user.id):
            await self.send(text_data=json.dumps({
                'type': 'audio_data',
                'audio_data': event['audio_data'],
                'sender_id': event['sender_id'],
                'timestamp': event['timestamp']
            }))
    
    # Database operations
    @database_sync_to_async
    def get_session(self):
        """Get session by room ID"""
        try:
            return Session.objects.select_related('patient', 'therapist').get(
                websocket_room_id=self.room_id
            )
        except Session.DoesNotExist:
            return None
    
    @database_sync_to_async
    def can_join_session(self, session):
        """Check if user can join the session"""
        if self.user.user_type == 'therapist':
            return session.therapist == self.user
        elif self.user.user_type == 'patient':
            return session.patient == self.user
        return False
    
    @database_sync_to_async
    def mark_websocket_active(self, session, active):
        """Mark WebSocket connection as active/inactive"""
        session.websocket_active = active
        session.save(update_fields=['websocket_active'])
    
    @database_sync_to_async
    def start_session(self, session):
        """Start the therapy session"""
        session.start_session()
        # Notify all participants
        self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'session_status_changed',
                'status': 'in_progress',
                'timestamp': timezone.now().isoformat()
            }
        )
    
    @database_sync_to_async
    def end_session(self, session):
        """End the therapy session"""
        session.end_session()
        # Notify all participants
        self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'session_status_changed',
                'status': 'completed',
                'timestamp': timezone.now().isoformat()
            }
        )
    
    @database_sync_to_async
    def pause_session(self, session):
        """Pause the therapy session"""
        # Add pause logic if needed
        pass