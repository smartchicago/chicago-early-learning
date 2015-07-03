import csv
import os
import re

from django.core.management.base import NoArgsCommand
from django.conf import settings

from portal.models import Location


class Command(NoArgsCommand):
    """
    Import QRIS ratings from ecep/data/qris-ratings.csv
    """

    CANT_FIND = []

    help = """Load QRIS ratings from ecep/data/qris-ratings.csv"""

    def find_location(self, name, address, zip):
        name, _ = name.split(' ', 1)

        address = address.lower()
        parts = address.split()
        address = parts[0]

        if '-' in zip:
            zipcode, _ = zip.split('-', 1)
        else:
            zipcode = zip

        locations = Location.objects.filter(
            site_name__startswith=name,
            address__startswith=address,
            zip=zipcode,
        )
        if locations:
            return locations[0]
        else:
            return None

    def handle_noargs(self, *args, **options):
        csv_file = open(os.path.join(settings.BASE_DIR, 'data/qris-ratings.csv'))
        reader = csv.reader(csv_file)

        header = reader.next()
        for row in reader:
            loc = self.find_location(row[0], row[1], row[3])

            if loc is None:
                self.CANT_FIND.append(','.join(row))
            else:
                rating = row[5].lower()

                if 'gold' in rating:
                    loc.q_rating = Location.GOLD
                    loc.save()
                elif 'silver' in rating:
                    loc.q_rating = Location.SILVER
                    loc.save()

        for item in self.CANT_FIND:
            print item


