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

        with open('portal/management/imports/matched.csv', 'rb') as copa:
            reader = unicodecsv.DictReader(copa)

            for row in reader:
                site = Location.objects.get(id=row["portal_id"])
                site.copa_id = row["copa_id"]
                site.save()
