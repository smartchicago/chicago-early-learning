# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations


class Migration(migrations.Migration):

    dependencies = [
        ('portal', '0001_initial'),
    ]

    operations = [
        migrations.AlterField(
            model_name='location',
            name='q_rating',
            field=models.CharField(blank=True, max_length=10, verbose_name='Quality Rating', choices=[(b'', 'Select a rating'), (b'None', 'None'), (b'Licensed', 'Licensed'), (b'Bronze', 'Bronze'), (b'Silver', 'Silver'), (b'Gold', 'Gold')]),
            preserve_default=True,
        ),
    ]
