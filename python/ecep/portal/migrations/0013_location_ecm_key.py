# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations


class Migration(migrations.Migration):

    dependencies = [
        ('portal', '0012_location_availability'),
    ]

    operations = [
        migrations.AddField(
            model_name='location',
            name='ecm_key',
            field=models.IntegerField(default=0, verbose_name=b'ECM Key', blank=True),
            preserve_default=True,
        ),
    ]
