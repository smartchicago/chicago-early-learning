# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations


class Migration(migrations.Migration):

    dependencies = [
        ('portal', '0003_auto_20150703_0946'),
    ]

    operations = [
        migrations.AddField(
            model_name='location',
            name='enrollment',
            field=models.TextField(verbose_name='Enrollment Process', blank=True),
            preserve_default=True,
        ),
        migrations.AddField(
            model_name='location',
            name='enrollment_en',
            field=models.TextField(null=True, verbose_name='Enrollment Process', blank=True),
            preserve_default=True,
        ),
        migrations.AddField(
            model_name='location',
            name='enrollment_es',
            field=models.TextField(null=True, verbose_name='Enrollment Process', blank=True),
            preserve_default=True,
        ),
    ]
