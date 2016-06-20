import csv
import os
import re

from django.core.management.base import NoArgsCommand
from django.conf import settings

from portal.models import Location


class Command(NoArgsCommand):
    """
    Import Cleaned Site Name, Address, and ECM Keys
    """

    def handle(self, *args, **options):

        with open('master-list.csv', 'rb') as master:
            reader = csv.DictReader(master)

            for row in reader:
                try:
                    l = Location.objects.get(pk=int(row['Portal ID']))
                    l.site_name = row['Master Site Name']
                    l.address = row['Master Address']
                    l.ecm_key = row['ECM Key']
                    l.save()
                    print l.site_name
            
                except:
                    print "Ruh roh!"
                    continue

