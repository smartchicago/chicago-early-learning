# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations


class Migration(migrations.Migration):

    dependencies = [
        ('portal', '0014_location_other_features_bucket'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='location',
            name='other_features_bucket',
        ),
    ]
