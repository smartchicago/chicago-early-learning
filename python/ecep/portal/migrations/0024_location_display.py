# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('portal', '0023_auto_20171210_1654'),
    ]

    operations = [
        migrations.AddField(
            model_name='location',
            name='display',
            field=models.BooleanField(default=0, verbose_name=b'Display'),
        ),
    ]
