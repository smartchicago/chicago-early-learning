# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('portal', '0022_auto_20171201_1435'),
    ]

    operations = [
        migrations.AddField(
            model_name='location',
            name='active',
            field=models.BooleanField(default=0, verbose_name=b'Active'),
        ),
        migrations.AddField(
            model_name='location',
            name='copa_neighborhood',
            field=models.CharField(max_length=50, verbose_name=b'Neighborhood Name (COPA)', blank=True),
        ),
        migrations.AddField(
            model_name='location',
            name='copa_neighborhood_id',
            field=models.IntegerField(default=0, verbose_name=b'Neighborhood Name ID', blank=True),
        ),
        migrations.AddField(
            model_name='location',
            name='last_modified_on',
            field=models.CharField(max_length=50, verbose_name=b'Last Modified On', blank=True),
        ),
        migrations.AddField(
            model_name='location',
            name='preschool_application',
            field=models.BooleanField(default=False, verbose_name=b'COPA Preschool Application'),
        ),
        migrations.AddField(
            model_name='location',
            name='site_name_alternate',
            field=models.CharField(max_length=100, verbose_name=b'Alternate Site Name', blank=True),
        ),
        migrations.AddField(
            model_name='location',
            name='universal_application',
            field=models.BooleanField(default=False, verbose_name=b'COPA Univeral Application'),
        ),
    ]
