from django.db import migrations, models
import django.db.models.deletion
import django.utils.timezone


def backfill_existing_connections(apps, schema_editor):
    PatientProfile = apps.get_model('users', 'PatientProfile')
    PatientTherapistConnection = apps.get_model('users', 'PatientTherapistConnection')

    rows = PatientProfile.objects.exclude(therapist__isnull=True).values('id', 'therapist_id', 'connected_at')
    for row in rows:
        PatientTherapistConnection.objects.get_or_create(
            patient_id=row['id'],
            therapist_id=row['therapist_id'],
            defaults={'connected_at': row['connected_at'] or django.utils.timezone.now()},
        )


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0008_remove_patientprofile_history_id_and_more'),
    ]

    operations = [
        migrations.CreateModel(
            name='PatientTherapistConnection',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('connected_at', models.DateTimeField(default=django.utils.timezone.now)),
                ('patient', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='therapist_connections', to='users.patientprofile')),
                ('therapist', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='patient_connections', to='users.therapistprofile')),
            ],
            options={
                'db_table': 'patient_therapist_connections',
                'ordering': ['-connected_at'],
            },
        ),
        migrations.AddConstraint(
            model_name='patienttherapistconnection',
            constraint=models.UniqueConstraint(fields=('patient', 'therapist'), name='unique_patient_therapist_connection'),
        ),
        migrations.AddIndex(
            model_name='patienttherapistconnection',
            index=models.Index(fields=['therapist', 'connected_at'], name='ptc_therapist_connected_idx'),
        ),
        migrations.AddIndex(
            model_name='patienttherapistconnection',
            index=models.Index(fields=['patient', 'connected_at'], name='ptc_patient_connected_idx'),
        ),
        migrations.RunPython(backfill_existing_connections, migrations.RunPython.noop),
    ]
