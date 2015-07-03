# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations


def set_rating_to_licensed(apps, schema_editor):
    """ Initially set all Locations to be 'Licensed' """
    Location = apps.get_model('portal', 'Location')
    for l in Location.objects.all():
        l.q_rating = 'Licensed'
        l.save()


class Migration(migrations.Migration):

    dependencies = [
        ('portal', '0002_auto_20150703_0928'),
    ]

    operations = [
        migrations.RunPython(set_rating_to_licensed),
    ]
