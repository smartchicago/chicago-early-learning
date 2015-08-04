# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations


class Migration(migrations.Migration):

    dependencies = [
        ('portal', '0004_auto_20150721_1538'),
    ]

    operations = [
        migrations.AddField(
            model_name='location',
            name='site_type',
            field=models.IntegerField(default=0, verbose_name=b'Site Type', choices=[(0, b'Normal Location'), (1, b'Application Site')]),
            preserve_default=True,
        ),
    ]
