from django.core.management.base import BaseCommand, CommandError
from portal.models import Location
from geopy import geocoders
import geopy.geocoders.google
from django.contrib.gis.geos import GEOSGeometry
from optparse import make_option
import time, random

class Command(BaseCommand):
    """
    Geocode a set of models.
    """

    help = """This management command will geocode the portal.Location models, using
the Google Maps API via geopy."""

    option_list = BaseCommand.option_list + (
        make_option( '-f',
            '--force',
            action='store_true',
            dest='force',
            default=False,
            help='Force geocoding, and re-geocode any previously geocoded item.'),
        make_option( '-s',
            '--stop-on-failure',
            action='store_true',
            dest='failquick',
            default=False,
            help='Stop geocoding on the first failure.'),
        )

    geocoder = geocoders.Google()

    def handle(self, *args, **options):
        """
        Geocode some or all of the models.
        """
        qset = Location.objects.all()
        if not options['force']:
            qset = qset.filter(geom__isnull=True)

        self.stdout.write('Processing %d records.\n' % qset.count())
        cols = 0

        for i, item in enumerate(qset):
            time.sleep(random.uniform(0.1,0.5))

            found = '.'

            try:
                places = self.geocoder.geocode("%(address)s, %(city)s, %(state)s %(zip)s\n" % { 
                    'address': item.address, 
                    'city': item.city,
                    'state': item.state,
                    'zip': item.zip }, exactly_one=False)

                if len(places) >= 1:
                    stdaddr, (lat, lng) = places[0]
                    if len(places) > 1:
                        found = '?'

                item.geom = GEOSGeometry('POINT(%f %f)' % (lng, lat,))
                item.geom.srid = 4326
           
                item.save()

                cols += 1

                self.stdout.write(found)
                if cols % 80 == 0:
                    self.stdout.write('\n')
            except geopy.geocoders.google.GQueryError, gqe:
                self.stdout.write('\nCould not find address for %s\n' % item.site_name)
                if options['failquick']:
                    return 1
                cols = 1
            except ValueError, ve:
                self.stdout.write('\nMore than one location found for %s\n' % item.site_name)
                if options['verbosity'] > 1:
                    self.stdout.write('%s\n' % ve)
                if options['failquick']:
                    return 2
                cols = 1
