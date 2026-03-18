from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('patients', '0012_rename_notificatio_deliver_a6a03e_idx_notificatio_deliver_4d5d19_idx'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='notificationpreference',
            name='device_type',
        ),
        migrations.RemoveField(
            model_name='notificationpreference',
            name='push_token',
        ),
        migrations.RemoveField(
            model_name='notification',
            name='push_error',
        ),
        migrations.RemoveField(
            model_name='notification',
            name='push_sent',
        ),
        migrations.RemoveField(
            model_name='notification',
            name='push_sent_at',
        ),
    ]
