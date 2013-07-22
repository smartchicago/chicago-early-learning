# Copyright (c) 2013 Azavea, Inc.
# See LICENSE in the project root for copying permission

from django.core.management.base import BaseCommand

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
        neighborhoods = Neighborhood.objects.filter()
        geoj = GeoJSON.GeoJSON()
        djf = Django.Django(geodjango='boundary', properties=['primary_name', 'pk'])

        json = geoj.encode(djf.decode(neighborhoods))
        
        output = open(data_path+'/neighborhoods.json', 'w')
        output.write(json)
        output.close()

        subprocess.check_call(['topojson', '-p', '-o', data_path+'/neighborhoods-topo.json', data_path + '/neighborhoods.json'])

        sys.stdout.write('Succesfully exported %s neighborhoods\n' % len(neighborhoods))