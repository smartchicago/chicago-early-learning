# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations


class Migration(migrations.Migration):

    dependencies = [
        ('portal', '0013_location_ecm_key'),
    ]

    operations = [
        migrations.AddField(
            model_name='location',
            name='other_features_bucket',
            field=models.CharField(max_length=200, verbose_name='Other Features', blank=True),
            preserve_default=True,
        ),
    ]
