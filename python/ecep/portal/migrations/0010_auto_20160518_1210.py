# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations


class Migration(migrations.Migration):

    dependencies = [
        ('portal', '0009_auto_20151022_1556'),
    ]

    operations = [
        migrations.AlterField(
            model_name='location',
            name='email',
            field=models.EmailField(max_length=75, blank=True),
            preserve_default=True,
        ),
        migrations.AlterField(
            model_name='location',
            name='is_age_gt_3',
            field=models.NullBooleanField(verbose_name='Ages 3 - 5'),
            preserve_default=True,
        ),
        migrations.AlterField(
            model_name='location',
            name='is_age_lt_3',
            field=models.NullBooleanField(verbose_name='Ages 0 - 3'),
            preserve_default=True,
        ),
        migrations.AlterField(
            model_name='location',
            name='is_home_visiting',
            field=models.NullBooleanField(verbose_name='Offers Home Visiting'),
            preserve_default=True,
        ),
    ]
