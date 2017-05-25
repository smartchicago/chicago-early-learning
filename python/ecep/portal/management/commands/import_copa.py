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

    def handle(self, *args, **options):
        pass