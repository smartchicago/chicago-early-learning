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

        with open('export.txt', 'rb') as master:
            reader = csv.DictReader(master, delimiter='|')

            for row in reader:
                self.process_row(row)

        print 'Done!'


    def process_row(self, row):

        try: 
            l = Location.objects.get(ecm_key=row['Key'])
            print l.site_name

            l.q_stmt_en = self.test(l.q_stmt_en, row['Description'])
            l.q_stmt_es = self.test(l.q_stmt_es, row['Description (Spanish)'])
            l.city = self.test(l.city, row['City'])
            l.state = self.test(l.state, row['State'])
            l.zip = self.test(l.zip, row['ZIP'])
            l.phone = self.test(l.phone, row['Phone Number'])
            l.url = self.test(l.url, row['URL'])
            l.ages = self.test(l.ages, row['Ages Served'])
            l.is_age_lt_3 = self.test_bool(l.is_age_lt_3, row['Ages 0-3 (Y/N)'])
            l.is_age_gt_3 = self.test_bool(l.is_age_gt_3, row['Ages 3-5 (Y/N)'])
            l.is_part_day = self.test_bool(l.is_part_day, row['Part Day (Y/N)'])
            l.is_full_day = self.test_bool(l.is_full_day, row['Full Day (Y/N)'])
            l.is_full_year = self.test_bool(l.is_full_year, row['Full Year (Y/N)'])
            l.is_school_year = self.test_bool(l.is_school_year, row['School Year (Y/N)'])
            l.prg_hours = self.test(l.prg_hours, row['Operating Hours'])
            l.is_cps_based = self.test_bool(l.is_cps_based, row['School Based (Y/N)'])
            l.is_community_based = self.test_bool(l.is_community_based, row['Community Based (Y/N)'])
            l.is_hs = self.test_bool(l.is_hs, row['Head Start (Y/N)'])
            l.accept_ccap = self.test_bool(l.accept_ccap, row['Accepts CCAP (Y/N)'])
            l.is_home_visiting = self.test_bool(l.is_home_visiting, row['Home Visiting (Y/N)'])
            l.language_1 = self.test(l.language_1, row['Languages other than English'])
            l.other_features_bucket = self.test(l.other_features_bucket, row['Other Features'])
            l.accred = self.test(l.accred, row['Accreditation'])
            l.availability = self.test(l.availability, row['Availability Level'])
            l.neighborhood = self.test(l.neighborhood, row['Neighborhood'])

            print l.site_name

        except:
            print "**** RUH ROH ****"
            print row['Key']
            print ""


    def test(self, existing, new):
        if new:
            return new
            print 'changed!'
        else:
            return existing


    def test_bool(self, existing, new):
        if new:
            return bool(new)
            print 'changed!'
        else:
            return existing



