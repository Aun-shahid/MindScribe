from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("users", "0009_patienttherapistconnection"),
    ]

    operations = [
        migrations.AddField(
            model_name="user",
            name="username_last_changed_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
