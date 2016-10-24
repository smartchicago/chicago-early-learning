# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations


class Migration(migrations.Migration):

    dependencies = [
        ('portal', '0015_remove_location_other_features_bucket'),
    ]

    operations = [
        migrations.AlterField(
            model_name='location',
            name='language_1',
            field=models.CharField(max_length=200, verbose_name=b'Language 1 (other than English)', blank=True),
            preserve_default=True,
        ),
        migrations.AlterField(
            model_name='location',
            name='language_2',
            field=models.CharField(max_length=200, verbose_name=b'Language 2 (other than English)', blank=True),
            preserve_default=True,
        ),
        migrations.AlterField(
            model_name='location',
            name='language_3',
            field=models.CharField(max_length=200, verbose_name=b'Language 3 (other than English)', blank=True),
            preserve_default=True,
        ),
    ]
