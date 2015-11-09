# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations


def clear_enrollment_info(apps, schema_editor):
    """
    Get rid of all that dumb crap.
    """
    Location = apps.get_model('portal', 'Location')

    for loc in Location.objects.all():
        loc.enrollment_en = None
        loc.save()


class Migration(migrations.Migration):

    dependencies = [
        ('portal', '0008_auto_20150804_1635'),
    ]

    operations = [
        migrations.RunPython(clear_enrollment_info),
    ]
