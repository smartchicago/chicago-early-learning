# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations


def update_enrollment_info(apps, schema_editor):
    """
    Get rid of all that dumb crap.
    """
    Location = apps.get_model('portal', 'Location')
    locations = Location.objects.all()

    for loc in locations:
        if loc.is_cps_based:
            loc.q_stmt = """<p>Chicago Public Schools early childhood school based preschool programs work to ensure children ages 3 and 4 years old, particularly those most in need, have access to high-quality programs. Schools are committed to creating an engaging, developmentally appropriate learning environment that supports and respects the unique potential of each individual child through best professional practices, parent engagement, and community involvement.</p>"""
            loc.save()

class Migration(migrations.Migration):

    dependencies = [
        ('portal', '0010_auto_20160518_1210'),
    ]

    operations = [
    	migrations.RunPython(update_enrollment_info),
    ]
