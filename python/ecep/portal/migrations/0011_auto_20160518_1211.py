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
            loc.enrollment_en = """<p>Visit a child-friendly location near you:</p><ul><li><strong>Loop</strong> 42 W. Madison Street Hours: 9:00 AM - 5:00 PM</li><li><strong>Colman</strong> 4655 S. Dearborn Street Hours: 9:00 AM - 5:00 PM</li><li><strong>Hall Mall</strong> 4638 W. Diversey Avenue Hours 8:00 AM - 5:00 PM</li></ul><p>All sites are open until 7:00 PM on Wednesdays!</p><p>Many people find it helpful to make a plan to visit. You can make your plan <a href="/static/files/enrollment-plan-cps.pdf">here</a>.</p>"""
            loc.save()


class Migration(migrations.Migration):

    dependencies = [
        ('portal', '0010_auto_20160518_1210'),
    ]

    operations = [
    	migrations.RunPython(populate_enrollment_info),
    ]
