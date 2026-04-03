from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
import uuid

User = get_user_model()

class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)
    password = serializers.CharField(required=True, write_only=True)
    role = serializers.ChoiceField(
        choices=[('patient', 'Patient'), ('therapist', 'Therapist')],
        required=False
    )


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
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 
                  'user_type', 'phone_number', 'date_of_birth', 'email_verified']
        read_only_fields = ['id', 'email', 'user_type', 'email_verified']


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


