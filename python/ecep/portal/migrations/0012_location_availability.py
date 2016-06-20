# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations


class Migration(migrations.Migration):

    dependencies = [
        ('portal', '0011_auto_20160519_1120'),
    ]

    operations = [
        migrations.AddField(
            model_name='location',
            name='availability',
            field=models.CharField(blank=True, max_length=10, verbose_name='Availability', choices=[(b'High', 'High'), (b'Medium', 'Medium'), (b'Low', 'Low')]),
            preserve_default=True,
        ),
    ]
