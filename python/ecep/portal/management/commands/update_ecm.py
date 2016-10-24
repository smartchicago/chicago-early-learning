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
    Import Cleaned Site Name, Address, and ECM Keys
    """
    remote_path = 'Exports/'
    local_export_dir_path = '/cel/app/python/ecep/portal/management/exports/export.csv'

    geolocator = GoogleV3()

    def handle(self, *args, **options):

        timestr = time.strftime("%Y%m%d_%H%M%S")
        logfile = 'portal/management/commands/logs/ecm_import_' + timestr + '.log'
        logging.basicConfig(filename=logfile, level=logging.INFO)

        self.download_export()

        with open(self.local_export_dir_path, 'rb') as master:
            reader = csv.DictReader(master, delimiter='|')

            for row in reader:
                self.process_row(row)


    def download_export(self):

        host = settings.ECM_SFTP_HOST
        port = 22

        transport = paramiko.Transport((host, port))

        username = settings.ECM_SFTP_USERNAME
        password = settings.ECM_SFTP_PASSWORD

        transport.connect(username=username, password=password)
        sftp = paramiko.SFTPClient.from_transport(transport)

        uploads = sftp.listdir('Exports/')
        latest_export = uploads[-1]
        latest_export_path = self.remote_path + latest_export
        sftp.get(remotepath=latest_export_path, localpath=self.local_export_dir_path)
        
        sftp.close()
        transport.close()

        return latest_export


    def process_row(self, row):

        try:

            key = row['ECMKey']
            l = Location.objects.get(ecm_key=key)

            logging.info("")
            logging.info(key)
            logging.info(l.site_name)

            # Special handling for address and geolocation
            if l.address != row['LocAddress'] and row['LocAddress'] is not None:

                location = self.geocode(row['LocAddress'], row['LocCity'], row['LocState'], row['LocZip'])
                l.address = row['LocAddress']
                logging.info("Updated address to {}".format(row['LocAddress']))
                l.geom = 'POINT({} {})'.format(location.longitude, location.latitude)
                logging.info('Updated geometry!')

            l.ages = smart_swap(l.ages, row['Ages_Served'], l.verbose_name('ages'))
            l.q_rating = smart_swap(l.q_rating, row['Quality_Rating'], l.verbose_name('q_rating'))
            l.is_part_day = smart_swap(l.is_part_day, parse_null_boolean(row['Part_Day_Y_N']), l.verbose_name('is_part_day'))
            l.prg_hours = smart_swap(l.prg_hours, row['Operating_Hours'], l.verbose_name('prg_hours'))
            l.city = smart_swap(l.city, row['LocCity'], l.verbose_name('city'))
            l.zip = smart_swap(l.zip, row['LocZip'], l.verbose_name('zip'))
            l.state = smart_swap(l.state, row['LocState'], l.verbose_name('state'))
            l.is_age_lt_3 = smart_swap(l.is_age_lt_3, parse_null_boolean(row['Ages_Zero_Three_Y_N']), l.verbose_name('is_age_lt_3'))
            l.is_age_gt_3 = smart_swap(l.is_age_gt_3, parse_null_boolean(row['Ages_Three_Five_Y_N']), l.verbose_name('is_age_gt_3'))
            l.is_community_based = smart_swap(l.is_community_based, parse_null_boolean(row['Community_Based_Y_N']), l.verbose_name('is_community_based'))
            l.is_school_year = smart_swap(l.is_school_year, parse_null_boolean(row['School_Year_Y_N']), l.verbose_name('is_school_year'))
            l.accred = smart_swap(l.accred, row['Accreditation'], l.verbose_name('accred'))

            # Special processing for languages:
            cleaned_languages = clean_languages(row['Languages_other_than_English'])
            l.language_1 = smart_swap(l.language_1, cleaned_languages, l.verbose_name('language_1'))
            l.language_2 = ''
            l.language_3 = ''

            l.phone = smart_swap(l.phone, row['Phone_Number'], l.verbose_name('phone'))
            l.accept_ccap = smart_swap(l.accept_ccap, parse_null_boolean(row['Accepts_CCAP_Y_N']), l.verbose_name('accept_ccap'))
            l.address = smart_swap(l.address, row['LocAddress'], l.verbose_name('address'))
            l.is_hs = smart_swap(l.is_hs, parse_null_boolean(row['Head_Start_Y_N']), l.verbose_name('is_hs'))
            l.is_full_day = smart_swap(l.is_full_day, parse_null_boolean(row['Full_Day_Y_N']), l.verbose_name('is_full_day'))
            l.is_full_year = smart_swap(l.is_full_year, parse_null_boolean(row['Full_Year_Y_N']), l.verbose_name('is_full_year'))
            l.url = smart_swap(l.url, row['URL'], l.verbose_name('url'))
            l.is_home_visiting = smart_swap(l.is_home_visiting, parse_null_boolean(row['Home_Visiting_Y_N']), l.verbose_name('is_home_visiting'))
            l.is_cps_based = smart_swap(l.is_cps_based, parse_null_boolean(row['School_Based_Y_N']), l.verbose_name('is_cps_based'))
                
            # Save results
            l.save()

        except ObjectDoesNotExist:

            self.create_new_school(row)

        except:

            logging.warning('')
            logging.warning('*********')
            logging.warning("Whoops! Something went wrong with ")
            logging.warning(row['ECMKey'])
            logging.warning('*********')
            logging.warning('')


    def geocode(self, address, city, state, zip):

        address_string = " ".join([address, city, state, zip])

        point = self.geolocator.geocode(address_string)
        return point


    def process_location(self, row):

        time.sleep(1)
        location = self.geocode(row['LocAddress'], row['LocCity'], row['LocState'], row['LocZip'])
        try:
            x = location.longitude

        except:
            print ""
            print "UH OH"
            print row['ECMKey']
            print "UH OH"

    def create_new_school(self, row):

        l = Location(
            ecm_key = smart_swap('', row['ECMKey'], None),
            site_name = smart_swap('', row['Site_Name'], None),
            address = smart_swap('', row['LocAddress'], None),
            city = smart_swap('Chicago', row['LocCity'], None), # Yes, a space after city
            state = smart_swap('IL', row['LocState'], None),
            zip = smart_swap('', row['LocZip'], None),
            phone = smart_swap('', row['Phone_Number'], None),
            url = smart_swap('', row['URL'], None),
            accred = smart_swap('', row['Accreditation'], None),
            q_rating = smart_swap('', row['Quality_Rating'], None),
            prg_hours = smart_swap('', row['Operating_Hours'], None),
            is_full_day = parse_null_boolean(row['Full_Day_Y_N']),
            is_part_day = parse_null_boolean(row['Part_Day_Y_N']),
            is_school_year = parse_null_boolean(row['School_Year_Y_N']),
            is_full_year = parse_null_boolean(row['Full_Year_Y_N']),
            ages = smart_swap('', row['Ages_Served'], None),
            is_age_lt_3 = parse_null_boolean(row['Ages_Zero_Three_Y_N']),
            is_age_gt_3 = parse_null_boolean(row['Ages_Three_Five_Y_N']),
            is_community_based = parse_null_boolean(row['Community_Based_Y_N']),
            is_cps_based = parse_null_boolean(row['School_Based_Y_N']),
            is_home_visiting = parse_null_boolean(row['Home_Visiting_Y_N']),
            accept_ccap = parse_null_boolean(row['Accepts_CCAP_Y_N']),
            is_hs = parse_null_boolean(row['Head_Start_Y_N']),
            availability = smart_swap('', row['Availability_Level'], None)
        )

        location = self.geocode(row['LocAddress'], row['LocCity'], row['LocState'], row['LocZip'])
        l.geom = 'POINT({} {})'.format(location.longitude, location.latitude)

        l.languages = clean_languages(row['Languages_other_than_English'])
    
        try:
            l.save()
            logging.info('')
            logging.info(row['ECMKey'])
            logging.info('Created new location!')
            logging.info('')


        except Exception as e:
            logging.error('')
            logging.error('!!!!!')
            logging.error('Could not create new school!')
            logging.error(row['ECMKey'])
            logging.error(e)
            logging.error('!!!!!')
            logging.error('')


def parse_null_boolean(boolean):

    if boolean == '':
        return ''

    elif boolean == None:
        return None

    else:
        return boolean == '1'

    
def smart_swap(current, new, name):

    if new and new != '_' and current != new and new != 'n/a':
        if name:
            logging.info("Updated {} to {}".format(name, str(new)))
        return new

    else:
        return current


def clean_languages(languages):

    if languages == "_" or languages == ";;":
        return ''
    elif languages.endswith(";;"):
        return languages.strip(";;")
    else:
        # Chained replace catches both scenarios like
        #  a) "Spanish;;French"
        #  b) "Spanish;French;Latin"
        return languages.replace(";;", ", ").replace(";", ", ")
