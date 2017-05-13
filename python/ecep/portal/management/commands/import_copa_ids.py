import csv
import unicodecsv
import re

from geopy.geocoders import Nominatim

from django.contrib.gis.geos import GEOSGeometry
from django.core.management.base import BaseCommand, CommandError

from portal.models import Location


class Command(BaseCommand):
    """
    """

    def handle(self, *args, **options):

        q = Location.objects.all()

        for loc in list(q):
            loc.copa_key = 0
            loc.availability = ''
            loc.save()

        with open('portal/management/imports/match.csv', 'rb') as copa:
            reader = unicodecsv.DictReader(copa)

            for row in reader:
                if row["portal_id"] == "XXXXXX":
                    pass
                else:
                    site = Location.objects.get(id=row["portal_id"])
                    site.copa_key = row["copa_id"]
                    site.availability = 'HIGH'
                    site.save()
                    print site.copa_key
