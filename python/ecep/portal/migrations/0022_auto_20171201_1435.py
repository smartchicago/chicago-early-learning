# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('portal', '0021_auto_20170625_1454'),
    ]

    operations = [
        migrations.AlterField(
            model_name='location',
            name='availability',
            field=models.CharField(blank=True, max_length=25, verbose_name='Availability', choices=[(b'Slots Available', 'Slots Available'), (b'Few or No Slots', 'Limited Availability')]),
        ),
        migrations.AlterField(
            model_name='location',
            name='is_full_year',
            field=models.NullBooleanField(verbose_name='Year-round'),
        ),
        migrations.AlterField(
            model_name='location',
            name='is_part_day',
            field=models.NullBooleanField(verbose_name='Half Day'),
        ),
    ]
