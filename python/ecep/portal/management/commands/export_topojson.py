# Copyright (c) 2013 Azavea, Inc.
# See LICENSE in the project root for copying permission

from django.core.management.base import BaseCommand
from django.db.models import Count

from vectorformats.Formats import Django, GeoJSON
from portal.models import Neighborhood

import sys
import subprocess

class Command(BaseCommand):
    """
    Exports neighborhood boundaries as a geojson file

    For reference, see: http://stackoverflow.com/questions/3034482/rendering-spatial-data-of-geoqueryset-in-a-custom-view-on-geodjango
    """

    args = '<none>'
    help = """This management command exports a topojson and geojson file into the static directory folder
    using the node package topojson"""

    def handle(self, *args, **options):
        """
        Exports neighborhood to data directory
        """
        data_path = 'portal/static/js'
        neighborhoods = Neighborhood.objects.annotate(num_schools=Count('location')).filter()

        for n in neighborhoods:
            n.center = n.get_center()

        geoj = GeoJSON.GeoJSON()
        djf = Django.Django(geodjango='boundary', properties=['primary_name', 'pk', 'center', 'num_schools'])

        json = geoj.encode(djf.decode(neighborhoods))

        output = open(data_path+'/neighborhoods.json', 'w')
        output.write(json)
        output.close()

        topo_path = data_path + '/neighborhoods-topo.json'
        geo_path = data_path + '/neighborhoods.json'
        subprocess.check_call(['topojson', '-p', '-o', topo_path, geo_path])

        sys.stdout.write('Succesfully exported %s neighborhoods\n' % len(neighborhoods))
