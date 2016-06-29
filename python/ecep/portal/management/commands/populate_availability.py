import random
import csv

from django.core.management.base import BaseCommand, CommandError

from portal.models import Location


class Command(BaseCommand):
    """
    """

    def handle(self, *args, **options):
        """
        """

        with open('availability.csv', 'rb') as availability_file:
            reader = csv.DictReader(availability_file)
            
            for row in reader:

                try:
                    key = row['Key']
                    l = Location.objects.get(ecm_key=key)
                    l.availability = row['Availability']
                    l.save()
                    print l.availability
                    print ''

                except:

                    print 'Uh oh!'

