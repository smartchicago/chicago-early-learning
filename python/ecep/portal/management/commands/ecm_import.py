from geopy.geocoders import Nominatim
import unicodecsv as csv

from django.contrib.gis.geos import GEOSGeometry
from django.core.management.base import BaseCommand, CommandError

from portal.models import Location


class Command(BaseCommand):
    """
    """

    def handle(self, *args, **options):
        """
        """

        with open('cleaned_export.csv', 'rb') as masterfile:

            # Import the new
            reader = csv.DictReader(masterfile, encoding='utf-8-sig')
            rows = 1

            for row in reader:

                key = row['ECMKey']
                l = Location.objects.get(ecm_key=key)

                print ""
                print key
                print l.site_name

                if l.address != row['LocAddress'] and row['LocAddress'] is not None:

                    location = geocode(row['LocAddress'], row['LocCity'], row['LocState'], row['LocZip'])
                    l.address = row['LocAddress']
                    print "Updated address to {}".format(row['LocAddress'])
                    l.geom = 'POINT({} {})'.format(location.longitude, location.latitude)
                    print 'Updated geometry!'

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

                l.language_1 = smart_swap(l.language_1, row['Languages_other_than_English'], l.verbose_name('language_1'))
                l.language_2 = smart_swap(l.language_2, row['Lang2'], l.verbose_name('language_2'))
                l.language_3 = smart_swap(l.language_3, row['Lang3'], l.verbose_name('language_3'))

                l.phone = smart_swap(l.phone, row['Phone_Number'], l.verbose_name('phone'))

                l.accept_ccap = smart_swap(l.accept_ccap, parse_null_boolean(row['Accepts_CCAP_Y_N']), l.verbose_name('accept_ccap'))

                l.address = smart_swap(l.address, row['LocAddress'], l.verbose_name('address'))

                l.is_hs = smart_swap(l.is_hs, parse_null_boolean(row['Head_Start_Y_N']), l.verbose_name('is_hs'))

                l.is_full_day = smart_swap(l.is_full_day, parse_null_boolean(row['Full_Day_Y_N']), l.verbose_name('is_full_day'))

                l.is_full_year = smart_swap(l.is_full_year, parse_null_boolean(row['Full_Year_Y_N']), l.verbose_name('is_full_year'))

                l.url = smart_swap(l.url, row['URL'], l.verbose_name('url'))

                l.is_home_visiting = smart_swap(l.is_home_visiting, parse_null_boolean(row['Home_Visiting_Y_N']), l.verbose_name('is_home_visiting'))

                l.is_cps_based = smart_swap(l.is_cps_based, parse_null_boolean(row['School_Based_Y_N']), l.verbose_name('is_cps_based'))




def geocode(address, city, state, zip):
    
    geolocator = Nominatim()

    address_string = " ".join([address, city, state, zip])

    point = geolocator.geocode(address_string)
    return point


def parse_null_boolean(boolean):

    if boolean == '':
        return ''

    elif boolean == None:
        return None

    else:
        return boolean == 'True'

    
def smart_swap(current, new, name):

    if new and current != new:
        print "Updated {} to {}".format(name, str(new))


