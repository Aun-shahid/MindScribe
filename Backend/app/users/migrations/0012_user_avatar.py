import django.core.validators
from django.db import migrations, models

import users.validators


class Migration(migrations.Migration):

    dependencies = [
        ("users", "0011_ensure_username_last_changed_at_column"),
    ]

    operations = [
        migrations.AddField(
            model_name="user",
            name="avatar",
            field=models.FileField(
                blank=True,
                null=True,
                upload_to="avatars/%Y/%m/",
                validators=[
                    django.core.validators.FileExtensionValidator(
                        allowed_extensions=("jpg", "jpeg", "png", "gif", "webp")
                    ),
                    users.validators.MaxFileSizeValidator(5242880),
                ],
            ),
        ),
    ]
