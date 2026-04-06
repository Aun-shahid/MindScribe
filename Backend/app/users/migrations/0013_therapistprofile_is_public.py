# Generated manually for TherapistProfile.is_public

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("users", "0012_user_avatar"),
    ]

    operations = [
        migrations.AddField(
            model_name="therapistprofile",
            name="is_public",
            field=models.BooleanField(
                blank=True,
                db_index=True,
                help_text="When True, this therapist appears in the public therapist directory.",
                null=True,
            ),
        ),
    ]
