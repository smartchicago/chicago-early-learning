# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations


class Migration(migrations.Migration):

    dependencies = [
        ('portal', '0018_location_copa_key'),
    ]

    operations = [
        migrations.AlterField(
            model_name='location',
            name='availability',
            field=models.CharField(blank=True, max_length=25, verbose_name='Availability', choices=[(b'Slots Available', 'Slots Available'), (b'Limited Availability', 'Limited Availability')]),
            preserve_default=True,
        ),
    ]
