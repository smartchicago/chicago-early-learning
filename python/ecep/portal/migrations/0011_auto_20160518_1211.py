# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations


def populate_enrollment_info(apps, schema_editor):
    """
    Populate the Enrollment info based on static text
    """
    Location = apps.get_model('portal', 'Location')

    for loc in Location.objects.all():
        if loc.is_cps_based:
            loc.enrollment_en = """<p>Chicago Public Schools early childhood school based preschool programs work to ensure children ages 3 and 4 years old, particularly those most in need, have access to high-quality programs. Schools are committed to creating an engaging, developmentally appropriate learning environment that supports and respects the unique potential of each individual child through best professional practices, parent engagement, and community involvement.</p>"""
            loc.save()


class Migration(migrations.Migration):

    dependencies = [
        ('portal', '0010_auto_20160518_1210'),
    ]

    operations = [
    	migrations.RunPython(populate_enrollment_info),
    ]
