from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.utils import timezone
import uuid

from users.models import TherapistProfile

User = get_user_model()

class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)
    password = serializers.CharField(required=True, write_only=True)


# class RegisterSerializer(serializers.ModelSerializer):
#     password = serializers.CharField(
#         write_only=True, 
#         required=True, 
#         validators=[validate_password],
#         help_text="Password must be at least 8 characters long"
#     )
#     password_confirm = serializers.CharField(
#         write_only=True, 
#         required=True,
#         help_text="Must match the password field"
#     )
#     username = serializers.CharField(
#         required=True,
#         help_text="Unique username for the account"
#     )
#     email = serializers.EmailField(
#         required=True,
#         help_text="Valid email address"
#     )
#     first_name = serializers.CharField(
#         required=True,
#         help_text="User's first name"
#     )
#     last_name = serializers.CharField(
#         required=True,
#         help_text="User's last name"
#     )
#     user_type = serializers.ChoiceField(
#         choices=[('patient', 'Patient'), ('therapist', 'Therapist')],
#         default='patient',
#         help_text="Type of user account - either 'patient' or 'therapist'"
#     )
#     phone_number = serializers.CharField(
#         required=False,
#         allow_blank=True,
#         help_text="User's phone number"
#     )
#     date_of_birth = serializers.DateField(
#         required=False,
#         allow_null=True,
#         help_text="User's date of birth in YYYY-MM-DD format"
#     )
    
#     class Meta:
#         model = User
#         fields = ['username', 'email', 'password', 'password_confirm', 'first_name', 
#                   'last_name', 'user_type', 'phone_number', 'date_of_birth']
    
#     def validate(self, attrs):
        
#         if attrs['password'] != attrs['password_confirm']:
#             raise serializers.ValidationError({"password": "Password fields didn't match."})
#         return attrs
    
#     def create(self, validated_data):
#         validated_data.pop('password_confirm')
#         user = User.objects.create_user(
#             username=validated_data['username'],
#             email=validated_data['email'],
#             password=validated_data['password'],
#             first_name=validated_data.get('first_name', ''),
#             last_name=validated_data.get('last_name', ''),
#             user_type=validated_data.get('user_type', 'patient'),
#             phone_number=validated_data.get('phone_number', ''),
#             date_of_birth=validated_data.get('date_of_birth', None),
#         )
#         return user





class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(
        write_only=True, 
        required=True, 
        validators=[validate_password]
    )
    password_confirm = serializers.CharField(write_only=True, required=True)
    
    license_number = serializers.CharField(required=False, allow_blank=True)
    specialization = serializers.CharField(required=False, allow_blank=True)

    def validate_license_number(self, value):
        value = (value or '').strip()
        if not value:
            return value
        if TherapistProfile.objects.filter(license_number=value).exists():
            raise serializers.ValidationError(
                'A therapist with this license number already exists.'
            )
        return value

    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'password_confirm', 'first_name', 
                  'last_name', 'user_type', 'phone_number', 'date_of_birth',
                  'license_number', 'specialization']

    def validate(self, attrs):
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError({"password": "Passwords do not match."})

        if attrs['user_type'] == 'therapist':
            if not attrs.get('license_number'):
                raise serializers.ValidationError({"license_number": "This field is required for therapists."})
            if not attrs.get('specialization'):
                raise serializers.ValidationError({"specialization": "This field is required for therapists."})

        return attrs

    def create(self, validated_data):
        # Remove fields not in the User model
        license_number = validated_data.pop('license_number', None)
        specialization = validated_data.pop('specialization', None)
        validated_data.pop('password_confirm')

        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password'],
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', ''),
            user_type=validated_data.get('user_type', 'patient'),
            phone_number=validated_data.get('phone_number', ''),
            date_of_birth=validated_data.get('date_of_birth', None),
        )

        # TherapistProfile will be created in the view, not here.
        user._extra_profile_data = {
            "license_number": license_number,
            "specialization": specialization
        }

        return user

class UserProfileSerializer(serializers.ModelSerializer):
    can_change_username = serializers.SerializerMethodField(read_only=True)
    next_username_change_at = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'user_type', 'phone_number', 'date_of_birth', 'email_verified',
            'can_change_username', 'next_username_change_at',
        ]
        read_only_fields = ['id', 'email', 'user_type', 'email_verified', 'can_change_username', 'next_username_change_at']

    def get_can_change_username(self, obj):
        return obj.can_change_username_now()

    def get_next_username_change_at(self, obj):
        next_at = obj.next_username_change_allowed_at()
        if next_at is None or obj.can_change_username_now():
            return None
        return next_at.isoformat()

    def validate(self, attrs):
        user = self.instance
        if not user:
            return attrs
        if 'username' in attrs:
            new_username = (attrs.get('username') or '').strip()
            if not new_username:
                raise serializers.ValidationError({'username': ['This field may not be blank.']})
            attrs['username'] = new_username
            if new_username != user.username:
                if not user.can_change_username_now():
                    next_at = user.next_username_change_allowed_at()
                    msg = (
                        f'You can change your username again after {next_at.date().isoformat()}.'
                        if next_at
                        else 'You cannot change your username yet.'
                    )
                    raise serializers.ValidationError({'username': [msg]})
                if User.objects.exclude(pk=user.pk).filter(username=new_username).exists():
                    raise serializers.ValidationError(
                        {'username': ['This username is already taken.']}
                    )
        return attrs

    def update(self, instance, validated_data):
        new_username = validated_data.get('username')
        if new_username is not None and new_username != instance.username:
            instance.username_last_changed_at = timezone.now()
        return super().update(instance, validated_data)


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True, validators=[validate_password])
    new_password_confirm = serializers.CharField(required=True)

    def validate(self, attrs):
        if attrs['new_password'] != attrs['new_password_confirm']:
            raise serializers.ValidationError({"new_password": "Password fields didn't match."})
        return attrs


class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)


class PasswordResetConfirmSerializer(serializers.Serializer):
    token = serializers.UUIDField(required=True)
    password = serializers.CharField(required=True, validators=[validate_password])
    password_confirm = serializers.CharField(required=True)
    
    def validate(self, attrs):
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError({"password": "Password fields didn't match."})
        return attrs


class EmailVerificationSerializer(serializers.Serializer):
    code = serializers.RegexField(regex=r'^\d{6}$', required=True)


class DeleteAccountSerializer(serializers.Serializer):
    password = serializers.CharField(required=True, write_only=True)


