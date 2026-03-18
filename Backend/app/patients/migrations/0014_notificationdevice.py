from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):

    dependencies = [
        ('patients', '0013_remove_push_fields'),
    ]

    operations = [
        migrations.CreateModel(
            name='NotificationDevice',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('expo_push_token', models.CharField(max_length=255, unique=True)),
                ('device_id', models.CharField(blank=True, max_length=255, null=True)),
                ('platform', models.CharField(choices=[('ios', 'iOS'), ('android', 'Android'), ('unknown', 'Unknown')], default='unknown', max_length=20)),
                ('is_active', models.BooleanField(default=True)),
                ('last_seen_at', models.DateTimeField(auto_now=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='notification_devices', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'db_table': 'notification_devices',
                'ordering': ['-updated_at'],
                'indexes': [models.Index(fields=['user', 'is_active'], name='notificatio_user_id_316b89_idx'), models.Index(fields=['platform', 'is_active'], name='notificatio_platfor_04d7a2_idx')],
            },
        ),
    ]
