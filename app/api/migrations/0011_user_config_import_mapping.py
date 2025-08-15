from django.db import migrations, models

class Migration(migrations.Migration):

    dependencies = [
        ('api', '0010_account_model_and_mfholding_account_fk'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='config_import_mapping',
            field=models.JSONField(blank=True, null=True, default=dict),
        ),
    ]
