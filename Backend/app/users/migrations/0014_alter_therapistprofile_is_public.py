# Ensure is_public is nullable so legacy/unset rows are NULL (private), not forced False.

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("users", "0013_therapistprofile_is_public"),
    ]

    operations = [
        migrations.AlterField(
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
