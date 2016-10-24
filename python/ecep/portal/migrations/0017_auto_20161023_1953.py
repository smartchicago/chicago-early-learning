# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations


class Migration(migrations.Migration):

    dependencies = [
        ('portal', '0016_auto_20161023_1952'),
    ]

    operations = [
        migrations.AlterField(
            model_name='location',
            name='prg_hours',
            field=models.CharField(max_length=200, verbose_name='Program Hours', blank=True),
            preserve_default=True,
        ),
    ]
