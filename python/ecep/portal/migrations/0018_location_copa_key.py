# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations


class Migration(migrations.Migration):

    dependencies = [
        ('portal', '0017_auto_20161023_1953'),
    ]

    operations = [
        migrations.AddField(
            model_name='location',
            name='copa_key',
            field=models.IntegerField(default=0, verbose_name=b'ECM Key', blank=True),
            preserve_default=True,
        ),
    ]
