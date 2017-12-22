from geopy.geocoders import GoogleV3

import csv
import logging
import os
import paramiko
import re
import time
import pdb

from django.core.exceptions import ObjectDoesNotExist
from django.core.management.base import NoArgsCommand
from django.conf import settings

from portal.models import Location

class Command(NoArgsCommand):
    """
    Import sites from COPA exports.
      - Transfer latest report from SFTP
    """

    REMOTE_PATH = 'reports/CEL-New.txt'
    LOCAL_EXPORT = '/cel/app/python/ecep/portal/management/exports/export.txt'
    LOGFILE = ''

    def handle(self, *args, **options):
        self.download_export()

        with open(self.LOCAL_EXPORT, 'rb') as export:
            total = 0
            exceptions = 0
            changes = 0
            bad = []

            reader = csv.DictReader(export, delimiter='\t')
            for row in reader:
                total += 1
                try:
                    copa_id = row['Site ID']
                    l = Location.objects.get(copa_key=copa_id)
                    if not l:
                        l = Location.objects.get(id=row['CEL ID'])

                    old = Location.objects.get(copa_key=copa_id)

                    # Unused components, may be needed later:
                    #row['Agency ID']
                    #row['Agency Name']
                    #row['Site Name'] - Site AKA Name is now main name

                    l.address = row['Address']
                    l.city = row['City']
                    l.state = row['State']
                    l.zip = row['Zip Code']
                    l.phone = row['Phone Number']
                    l.url = row['URL']
                    l.ages = row['Ages Served']
                    l.is_age_lt_3 = self.parse_bool(row['Ages Zero To Three'])
                    l.is_age_gt_3 = self.parse_bool(row['Ages Three To Five'])
                    l.is_part_day = self.parse_bool(row['Part Day Program'])
                    l.is_full_day = self.parse_bool(row['Full Day Program'])
                    l.is_full_year = self.parse_bool(row['Full Year Program'])
                    l.is_school_year = self.parse_bool(row['School Year Program'])
                    l.prg_hours = row['Operating Hours']
                    l.is_cps_based = self.parse_bool(row['School Based'])
                    l.is_community_based = self.parse_bool(row['Community Based'])
                    l.is_hs = self.parse_bool(row['Head Start Program'])
                    l.accept_ccap = self.parse_bool(row['Accept CCAP'])
                    l.is_home_visiting = self.parse_bool(row['Home Visiting'])
                    l.language_1 = row['Other Languages']
                    #row['Other Features']
                    l.accred = row['Accreditation']
                    l.universal_application = self.parse_bool(row['Universal Application'])
                    l.q_rating = row['Quality Rating']
                    l.availability = row['Slots available']
                    l.site_name = row['Site AKA Name']
                    l.q_stmt = row['Center Description']
                    l.q_stmt_es = row['Center Description (Spanish)']

                    # COPA and the City distinguish neighborhoods differently than CEL.
                    # These are not currently used anywhere, but may be needed in the future.
                    l.copa_neighborhood_id = int(row['Neighborhood ID'])
                    l.copa_neighborhood = row['Neighberhood Name']

                    l.geom = row['Geocode Coordinates']
                    l.is_part_week = self.parse_bool(row['Part Week Program'])
                    l.is_full_week = self.parse_bool(row['Full Week Program'])
                    l.is_ehs = self.parse_bool(row['Early Head Start Program'])

                    # CEL IDs are assigned by the system, should *never* be imported:
                    #row['CEL ID']

                    l.email = row['Email']
                    l.curriculum = row['Curriculum']

                    # Do not overwrite these, they are programmatically determined
                    # by l.geom coordinates on object save. - AJB 22 Dec 2017
                    #row['Community / Region ID']
                    #row['Community / Region Name']

                    l.last_modified_on = row['Last Update Date']
                    l.active = self.parse_bool(row['Active'])
                    l.display = self.parse_display(row['Display On CEL'])

                    # Save changes:
                    l.save()

                    # Successful changes output:
                    diffs = self.diff(old, l)
                    if len(diffs) > 0:
                        changes+=1
                        print copa_id
                        print diffs
                        print ""

                except Exception, e:
                    #pdb.set_trace()
                    exceptions += 1
                    print '************'
                    print row['Site ID']
                    print row['CEL ID']
                    print e
                    print '************'
                    print ''
                    bad.append(copa_id)

            print "TOTAL:"
            print total
            print "EXCEPTIONS:"
            print exceptions
            print "CHANGES:"
            print changes
            print "BAD:"
            print bad
            print len(bad)

    def download_export(self):

        host = settings.COPA_SFTP_HOST
        port = settings.COPA_SFTP_PORT
        key_path = settings.COPA_SFTP_KEY
        username = settings.COPA_SFTP_USERNAME
        key = paramiko.RSAKey.from_private_key_file(key_path)

        transport = paramiko.Transport((host, port))
        transport.connect(username=username, pkey=key)

        sftp = paramiko.SFTPClient.from_transport(transport)
        sftp.get(remotepath=self.REMOTE_PATH, localpath=self.LOCAL_EXPORT)
        sftp.close()
        transport.close()

        return latest_export

    def parse_bool(self, value):

        if value == "1":
            return True
        else:
            return False

    def parse_display(self, value):
    # We're working with incomplete data, so this just sets blank display
    # values to True until COPA adds display values to their exports
        if value == "":
            return True
        else:
            return self.parse_bool(value)

    def diff(self, old, new):
        my_model_fields = Location._meta.get_all_field_names()
        return filter(lambda field: getattr(old,field,None)!=getattr(new,field,None), my_model_fields)
