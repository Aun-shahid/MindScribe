from django.db import migrations


def add_column_if_missing(apps, schema_editor):
    """Repair DBs where 0010 is recorded but the column was never created."""
    connection = schema_editor.connection
    if connection.vendor != "postgresql":
        return
    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'users'
              AND column_name = 'username_last_changed_at'
            """
        )
        if cursor.fetchone():
            return
    with connection.cursor() as cursor:
        cursor.execute(
            """
            ALTER TABLE users
            ADD COLUMN username_last_changed_at timestamp with time zone NULL
            """
        )


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("users", "0010_user_username_last_changed_at"),
    ]

    operations = [
        migrations.RunPython(add_column_if_missing, noop_reverse),
    ]
