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
        self.download_export()

        with open(self.LOCAL_EXPORT, 'rb') as export:
            reader = csv.DictReader(export, delimiter='\t')

            for row in reader:
                print row['Site ID']


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


