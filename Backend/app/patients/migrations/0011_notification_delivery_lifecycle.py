from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('patients', '0010_activitylog'),
    ]

    operations = [
        migrations.AddField(
            model_name='notification',
            name='delivered_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='notification',
            name='delivery_attempts',
            field=models.PositiveIntegerField(default=0),
        ),
        migrations.AddField(
            model_name='notification',
            name='delivery_error',
            field=models.TextField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='notification',
            name='delivery_status',
            field=models.CharField(
                choices=[('pending', 'Pending'), ('sent', 'Sent'), ('delivered', 'Delivered'), ('failed', 'Failed')],
                default='pending',
                help_text='Websocket delivery status',
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name='notification',
            name='last_delivery_attempt_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='notification',
            name='next_retry_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddIndex(
            model_name='notification',
            index=models.Index(fields=['delivery_status', 'next_retry_at'], name='notificatio_deliver_a6a03e_idx'),
        ),
    ]
