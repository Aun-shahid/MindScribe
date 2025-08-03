from django.shortcuts import render, get_object_or_404
from rest_framework import generics, permissions, status, serializers
from rest_framework.response import Response
from rest_framework.views import APIView
from django.contrib.auth import get_user_model, authenticate, logout
from django.utils import timezone
from rest_framework.permissions import IsAuthenticated
from drf_spectacular.utils import extend_schema, OpenApiResponse, OpenApiExample
from django.core.mail import send_mail
from django.conf import settings
import uuid
from datetime import timedelta

from .models import PasswordResetToken, EmailVerificationToken
from .token_manager import TokenManager
from .serializers import (
    LoginSerializer, RegisterSerializer, UserProfileSerializer, 
    ChangePasswordSerializer, PasswordResetRequestSerializer,
    PasswordResetConfirmSerializer, EmailVerificationSerializer
)
from users.models import TherapistProfile
from users.services import AccountLinkingService

User = get_user_model()


class LoginView(APIView):
    permission_classes = [permissions.AllowAny]
    serializer_class = LoginSerializer

    @extend_schema(
        request=LoginSerializer,
        responses={
            200: OpenApiResponse(description='Login successful, tokens issued.'),
            401: OpenApiResponse(description='Invalid credentials.')
        },
        summary="User Login",
        description="Authenticate user with email and password, returning access and refresh tokens."
    )
    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        if serializer.is_valid():
            email = serializer.validated_data['email']
            password = serializer.validated_data['password']
            user = authenticate(request, email=email, password=password)
            if user is not None:
                # Use token manager to create tokens
                tokens = TokenManager.create_tokens(user, request)
                
                response_data = {
                    **tokens,
                    'user': {
                        'id': str(user.id),
                        'username': user.username,
                        'email': user.email,
                        'user_type': user.user_type,
                        'email_verified': user.email_verified
                    }
                }
                
                # Add therapist PIN if user is a therapist
                if user.user_type == 'therapist' and hasattr(user, 'therapist_profile'):
                    response_data['therapist_pin'] = user.therapist_profile.therapist_pin
                
                return Response(response_data, status=status.HTTP_200_OK)
            return Response({'detail': 'Invalid credentials.'}, status=status.HTTP_401_UNAUTHORIZED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# Radia chnages
# class RegisterView(generics.CreateAPIView):
#     serializer_class = RegisterSerializer
#     permission_classes = [permissions.AllowAny]
    
#     @extend_schema(
#         request=RegisterSerializer,
#         responses={201: UserProfileSerializer},
#         summary="User Registration",
#         description="Register a new user account.",
#         examples=[
#             OpenApiExample(
#                 'Registration Example',
#                 value={
#                     "username": "username",
#                     "email": "user@example.com",
#                     "password": "string123",
#                     "password_confirm": "string123",
#                     "first_name": "string",
#                     "last_name": "string",
#                     "user_type": "patient",
#                     "phone_number": "string",
#                     "date_of_birth": "2025-07-08"
#                 },
#                 request_only=True
#             )
#         ]
#     )
#     def create(self, request, *args, **kwargs):
#         serializer = self.get_serializer(data=request.data)
#         serializer.is_valid(raise_exception=True)
#         user = serializer.save()
        
#         # Create TherapistProfile with unique PIN if user is a therapist
#         therapist_pin = None
#         if user.user_type == 'therapist':
#             therapist_profile = TherapistProfile.objects.create(
#                 user=user,
#                 license_number='',  # Will be filled later
#                 specialization='',  # Will be filled later
#             )
#             therapist_pin = therapist_profile.therapist_pin
        
#         # Create verification token and send email
#         token = uuid.uuid4()
#         expires_at = timezone.now() + timedelta(days=1)
        
#         EmailVerificationToken.objects.create(
#             user=user,
#             token=token,
#             expires_at=expires_at
#         )
        
#         # In production, send actual email
#         # verification_link = f"{settings.FRONTEND_URL}/verify-email/{token}"
#         # send_mail(
#         #     'Verify your email',
#         #     f'Please verify your email by clicking this link: {verification_link}',
#         #     settings.DEFAULT_FROM_EMAIL,
#         #     [user.email],
#         #     fail_silently=False,
#         # )
        
#         print(f"Verification token for {user.email}: {token}")
#         if therapist_pin:
#             print(f"Therapist PIN for {user.email}: {therapist_pin}")
        
        
        
#         response_data = {
#             'user': UserProfileSerializer(user).data,
#             'message': 'User registered successfully. Please verify your email.'
#         }
        
#         # Add therapist PIN to response if user is a therapist
#         if therapist_pin:
#             response_data['therapist_pin'] = therapist_pin
        
#         return Response(response_data, status=status.HTTP_201_CREATED)

    
class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]

    @extend_schema(
        request=RegisterSerializer,
        responses={201: UserProfileSerializer},
        summary="User Registration",
        description="Register a new user account.",
        examples=[
            OpenApiExample(
                'Registration Example',
                value={
                    "username": "username",
                    "email": "user@example.com",
                    "password": "string123",
                    "password_confirm": "string123",
                    "first_name": "string",
                    "last_name": "string",
                    "user_type": "patient",
                    "phone_number": "string",
                    "date_of_birth": "2025-07-08"
                },
                request_only=True
            )
        ]
    )
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        therapist_pin = None
        account_linking_info = None

        # Handle therapist profile creation
        if user.user_type == 'therapist':
            extra = getattr(user, '_extra_profile_data', {})
            license_number = extra.get('license_number')
            specialization = extra.get('specialization')

            # Create the therapist profile
            therapist_profile = TherapistProfile.objects.create(
                user=user,
                license_number=license_number,
                specialization=specialization,
            )
            therapist_pin = therapist_profile.therapist_pin
        
        # Handle account linking for patients
        elif user.user_type == 'patient':
            # Attempt to detect and link with existing therapist-created patient profile
            linked, message, linked_profile = AccountLinkingService.detect_and_link_during_registration(user)
            
            if linked and linked_profile:
                account_linking_info = {
                    'account_linked': True,
                    'message': message,
                    'therapist_info': {
                        'id': str(linked_profile.therapist.user.id),
                        'name': linked_profile.therapist.user.full_name,
                        'specialization': linked_profile.therapist.specialization,
                        'clinic_name': linked_profile.therapist.clinic_name
                    },
                    'patient_id': linked_profile.patient_id,
                    'linked_at': linked_profile.linked_at
                }
                print(f"Account linked for {user.email} with patient profile {linked_profile.patient_id}")
            else:
                account_linking_info = {
                    'account_linked': False,
                    'message': message
                }

        # Email verification token
        token = uuid.uuid4()
        expires_at = timezone.now() + timedelta(days=1)

        EmailVerificationToken.objects.create(
            user=user,
            token=token,
            expires_at=expires_at
        )

        print(f"Verification token for {user.email}: {token}")
        if therapist_pin:
            print(f"Therapist PIN for {user.email}: {therapist_pin}")

        response_data = {
            'user': UserProfileSerializer(user).data,
            'message': 'User registered successfully. Please verify your email.'
        }

        if therapist_pin:
            response_data['therapist_pin'] = therapist_pin
        
        if account_linking_info:
            response_data['account_linking'] = account_linking_info

        return Response(response_data, status=status.HTTP_201_CREATED)


class UserProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = UserProfileSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user


class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]
    serializer_class = ChangePasswordSerializer

    @extend_schema(
        request=ChangePasswordSerializer,
        responses={
            200: OpenApiResponse(description='Password changed successfully.'),
            400: OpenApiResponse(description='Invalid old password or passwords did not match.')
        },
        summary="Change Password",
        description="Change the authenticated user's password."
    )
    def post(self, request, *args, **kwargs):
        serializer = self.serializer_class(data=request.data)
        if serializer.is_valid():
            user = request.user
            if not user.check_password(serializer.validated_data['old_password']):
                return Response({'old_password': 'Wrong password.'}, status=status.HTTP_400_BAD_REQUEST)
            
            user.set_password(serializer.validated_data['new_password'])
            user.save()
            
            # Generate new tokens after password change
            tokens = TokenManager.create_tokens(user, request)
            
            return Response({
                'detail': 'Password changed successfully.',
                **tokens,
            })
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]
    
    class LogoutSerializer(serializers.Serializer):
        refresh = serializers.CharField(required=False, help_text="Refresh token to blacklist")

    @extend_schema(
        request=LogoutSerializer,
        responses={200: OpenApiResponse(description='Logged out successfully.')},
        summary="Logout",
        description="Logout the authenticated user."
    )
    def post(self, request):
        try:
            # Get refresh token from request data
            refresh_token = request.data.get("refresh")
            if refresh_token:
                # Use token manager to blacklist token




                # made chnage
                # TokenManager.blacklist_token(refresh_token)



                # to this
                TokenManager.blacklist_refresh_token(refresh_token)

            return Response({'detail': 'Logged out successfully.'}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class PasswordResetRequestView(APIView):
    permission_classes = [permissions.AllowAny]
    serializer_class = PasswordResetRequestSerializer

    @extend_schema(
        request=PasswordResetRequestSerializer,
        responses={200: OpenApiResponse(description='Password reset email sent.')},
        summary="Request Password Reset",
        description="Request a password reset email."
    )
    def post(self, request):
        serializer = self.serializer_class(data=request.data)
        if serializer.is_valid():
            email = serializer.validated_data['email']
            try:
                user = User.objects.get(email=email)
                # Delete any existing reset tokens for this user
                PasswordResetToken.objects.filter(user=user).delete()
                
                # Create new reset token
                token = uuid.uuid4()
                expiry = timezone.now() + timedelta(hours=24)
                reset_token = PasswordResetToken.objects.create(
                    user=user,
                    token=token,
                    expires_at=expiry
                )
                
                # In production, send actual email, we'll handle this at the end or smth
                # reset_link = f"{settings.FRONTEND_URL}/reset-password/{token}"
                # send_mail(
                #     'Reset Your Password',
                #     f'Click this link to reset your password: {reset_link}',
                #     settings.DEFAULT_FROM_EMAIL,
                #     [user.email],
                #     fail_silently=False,
                # )


                # trying for the frontend
                frontend_url = "http://192.168.100.117:8081"
                reset_link = f"{frontend_url}/auth/reset-confirm?token={token}"

                send_mail(
                    subject="🔐 Reset Your TherapEase Password",
                    message=f"Hi {user.first_name},\n\nYou requested a password reset. Click the link below to set a new password:\n\n{reset_link}\n\nIf you didn't request this, you can ignore this email.",
                    from_email="noreply@therapease.local",
                    recipient_list=[user.email],
                    fail_silently=False,
                )
                
                print(f"Reset token for {user.email}: {token}")
                
            except User.DoesNotExist:
                # We don't want to reveal which emails exist in our system
                pass
            
            return Response({'detail': 'If your email is registered, you will receive a password reset link.'})
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class PasswordResetConfirmView(APIView):
    permission_classes = [permissions.AllowAny]
    serializer_class = PasswordResetConfirmSerializer

    @extend_schema(
        request=PasswordResetConfirmSerializer,
        responses={
            200: OpenApiResponse(description='Password reset successful.'),
            400: OpenApiResponse(description='Invalid or expired token.')
        },
        summary="Confirm Password Reset",
        description="Reset password using a valid reset token."
    )
    def post(self, request):
        serializer = self.serializer_class(data=request.data)
        if serializer.is_valid():
            token_uuid = serializer.validated_data['token']
            try:
                reset_token = PasswordResetToken.objects.get(
                    token=token_uuid,
                    is_used=False,
                    expires_at__gt=timezone.now()
                )
                
                user = reset_token.user
                user.set_password(serializer.validated_data['password'])
                user.save()
                
                # Mark token as used
                reset_token.is_used = True
                reset_token.save()
                
                return Response({'detail': 'Password reset successful.'})
                
            except PasswordResetToken.DoesNotExist:
                return Response(
                    {'detail': 'Invalid or expired token.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class EmailVerificationView(APIView):
    permission_classes = [permissions.AllowAny]
    serializer_class = EmailVerificationSerializer

    @extend_schema(
        request=EmailVerificationSerializer,
        responses={
            200: OpenApiResponse(description='Email verification successful.'),
            400: OpenApiResponse(description='Invalid verification token.')
        },
        summary="Verify Email",
        description="Verify user email using verification token."
    )
    def post(self, request):
        serializer = self.serializer_class(data=request.data)
        if serializer.is_valid():
            token_uuid = serializer.validated_data['token']
            try:
                verification_token = EmailVerificationToken.objects.get(
                    token=token_uuid,
                    is_used=False,
                    expires_at__gt=timezone.now()
                )
                
                user = verification_token.user
                user.email_verified = True
                user.save()
                
                # Mark token as used
                verification_token.is_used = True
                verification_token.save()
                
                return Response({'detail': 'Email verified successfully.'})
                
            except EmailVerificationToken.DoesNotExist:
                return Response(
                    {'detail': 'Invalid or expired verification token.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class RefreshTokenView(APIView):
    permission_classes = [permissions.AllowAny]
    
    class RefreshTokenSerializer(serializers.Serializer):
        refresh = serializers.CharField(required=True, help_text="Refresh token to exchange for new access token")
    
    @extend_schema(
        request=RefreshTokenSerializer,
        responses={
            200: OpenApiResponse(description='Tokens refreshed successfully.'),
            400: OpenApiResponse(description='Invalid or expired token.')
        },
        summary="Refresh Tokens",
        description="Refresh access token using a valid refresh token."
    )
    def post(self, request):
        refresh_token = request.data.get('refresh')
        
        if not refresh_token:
            return Response({'detail': 'Refresh token is required.'}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            new_tokens = TokenManager.refresh_token(refresh_token, request)
            return Response(new_tokens, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)