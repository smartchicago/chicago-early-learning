from geopy.geocoders import GoogleV3

import csv
import logging
import os
import paramiko
import re
import time

from django.core.exceptions import ObjectDoesNotExist
from django.core.management.base import NoArgsCommand
from django.conf import settings

from portal.models import Location

class Command(NoArgsCommand):
    """
    Import sites from COPA exports.
      - Transfer latest report from SFTP
    """

    REMOTE_PATH = 'reports/'
    LOCAL_EXPORT = '/cel/app/python/ecep/portal/management/exports/export.txt'
    LOGFILE = ''

    def handle(self, *args, **options):

        with open(self.LOCAL_EXPORT, 'rb') as export:
            total = 0
            exceptions = 0
            bad = []

            reader = csv.DictReader(export, delimiter='\t')
            for row in reader:
                total += 1
                try:
                    copa_id = row['Site ID']
                    l = Location.objects.get(copa_key=copa_id)

                    #row['Agency ID']
                    #row['Agency Name']
                    #row['Site ID']
                    #row['Site Name'] - Site AKA Name is now main name
                    l.address = row['Address']
                    l.city = row['City']
                    l.state = row['State']
                    l.zip = row['Zip Code']
                    l.phone = row['Phone Number']
                    l.url = row['URL']
                    l.ages = row['Ages Served']
                    l.is_age_lt_3 = bool(row['Ages Zero To Three'])
                    l.is_age_gt_3 = bool(row['Ages Three To Five'])
                    l.is_part_day = bool(row['Part Day Program'])
                    l.is_full_day = bool(row['Full Day Program'])
                    l.is_full_year = bool(row['Full Year Program'])
                    l.is_school_year = bool(row['School Year Program'])
                    l.prg_hours = bool(row['Operating Hours'])
                    l.is_cps_based = bool(row['School Based'])
                    l.is_community_based = bool(row['Community Based'])
                    l.is_hs = bool(row['Head Start Program'])
                    l.accept_ccap = bool(row['Accept CCAP'])
                    l.is_home_visiting = bool(row['Home Visiting'])
                    l.language_1 = row['Other Languages']
                    #row['Other Features']
                    l.accred = row['Accreditation']
                    #row['Universal Application']
                    l.q_rating = row['Quality Rating']
                    l.availability = row['Slots available']
                    l.site_name = row['Site AKA Name']
                    l.q_stmt = row['Center Description']
                    l.q_stmt_es = row['Center Description (Spanish)']
                    #row['Neighborhood ID']
                    #row['Neighberhood Name']
                    l.geom = row['Geocode Coordinates']
                    l.is_part_week = bool(row['Part Week Program'])
                    l.is_full_week - bool(row['Full Week Program'])
                    l.is_ehs = bool(row['Early Head Start Program'])
                    #row['CEL ID']
                    l.email = row['Email']
                    l.curriculum = row['Curriculum']
                    #row['Community / Region ID']
                    #row['Community / Region Name']
                    l.last_modified_on = row['Last Update Date']
                    l.active = bool(row['Active'])

                    print copa_id
                    print ""
                except:
                    exceptions += 1
                    print '************'
                    print row['Site ID']
                    print '************'
                    print ''

                    if row['Universal Application'] == '1':
                        bad.append(copa_id)

            print total
            print exceptions
            print bad


    def download_export(self):

        host = settings.COPA_SFTP_HOST
        port = settings.COPA_SFTP_PORT
        key_path = settings.COPA_SFTP_KEY
        username = settings.COPA_SFTP_USERNAME
        key = paramiko.RSAKey.from_private_key_file(key_path)

        transport = paramiko.Transport((host, port))
        transport.connect(username=username, pkey=key)

        sftp = paramiko.SFTPClient.from_transport(transport)

        uploads = sftp.listdir('reports/')
        latest_export = uploads[-1]
        latest_export_path = self.REMOTE_PATH + latest_export
        sftp.get(remotepath=latest_export_path, localpath=self.LOCAL_EXPORT)

        sftp.close()
        transport.close()

        return latest_export


