# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations


class Migration(migrations.Migration):

    dependencies = [
        ('portal', '0019_auto_20170513_1910'),
    ]

    operations = [
        migrations.AlterField(
            model_name='location',
            name='copa_key',
            field=models.IntegerField(default=0, verbose_name=b'COPA Key', blank=True),
            preserve_default=True,
        ),
    ]
