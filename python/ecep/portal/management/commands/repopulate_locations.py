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

                try: 

                    key = row['ECMKey']
                    l = Location.objects.get(ecm_key=key)

                    print ""
                    print "!!!!!!!!!!!!!!!!!!!!!!"
                    print key
                    print "!!!!!!!!!!!!!!!!!!!!!!"
                    print ""

                    print "Name"
                    print l.site_name
                    print row['Site_Name']
                    print ""

                    print "Ages Served"
                    print l.ages
                    print row['Ages_Served']
                    print ""

                    print "ECM Key"
                    print l.ecm_key
                    print int(row['ECMKey'])
                    print ""

                    print "Quality Rating"
                    print l.q_rating
                    print row['Quality_Rating']
                    print ""

                    print "Part Day"
                    print l.is_part_day
                    print parse_null_boolean(row['Part_Day_Y_N'])
                    print ""

                    print "Operating Hours"
                    print l.prg_hours
                    print row['Operating_Hours']
                    print ""

                    print "City"
                    print l.city
                    print row['LocCity']
                    print ""

                    print "Zip"
                    print l.zip
                    print row['LocZip']
                    print ""

                    print "State"
                    print l.state
                    print row['LocState']
                    print ""

                    print "0 - 3"
                    print l.is_age_lt_3
                    print parse_null_boolean(row['Ages_Zero_Three_Y_N'])
                    print ""

                    print "3 - 5"
                    print l.is_age_gt_3
                    print parse_null_boolean(row['Ages_Three_Five_Y_N'])
                    print ""

                    print "Community Based"
                    print l.is_community_based
                    print parse_null_boolean(row['Community_Based_Y_N'])
                    print ""

                    print "School Year"
                    print l.is_school_year
                    print parse_null_boolean(row['School_Year_Y_N'])
                    print ""

                    print "Accreditation"
                    print l.accred
                    print row['Accreditation']
                    print ""

                    print "Languages"
                    print l.language_1
                    print row['Languages_other_than_English']
                    print l.language_2
                    print row['Lang2']
                    print l.language_3
                    print row['Lang3']
                    print ""

                    print "Phone Number"
                    print l.phone
                    print row['Phone_Number']
                    print ""

                    print "CCAP"
                    print l.accept_ccap
                    print parse_null_boolean(row['Accepts_CCAP_Y_N'])
                    print ""

                    print "Address"
                    print l.address
                    print row['LocAddress']
                    print ""

                    print "Head Start"
                    print l.is_hs
                    print parse_null_boolean(row['Head_Start_Y_N'])
                    print ""

                    print "Early Head Start"
                    # print l.is_ehs
                    # print parse_null_boolean(row['is_ehs'])
                    print ""

                    print "Full Day"
                    print l.is_full_day
                    print parse_null_boolean(row['Full_Day_Y_N'])
                    print ""

                    print "Full Year"
                    print l.is_full_year
                    print parse_null_boolean(row['Full_Year_Y_N'])
                    print ""

                    print "URL"
                    print l.url
                    print row['URL']
                    print ""

                    print "Home Visiting"
                    print l.is_home_visiting
                    print parse_null_boolean(row['Home_Visiting_Y_N'])
                    print ""

                    print "CPS Based"
                    print l.is_cps_based
                    print parse_null_boolean(row['School_Based_Y_N'])
                    print ""

                    print ""
                    input("Next...")

                    
                except:

                    print ''
                    print '*********'
                    print "Whoops! Something went wrong with "
                    print row['ECMKey']
                    print '*********'
                    print ''





def parse_null_boolean(boolean):

    if boolean == '':
        return ''

    elif boolean == None:
        return None

    else:
        return boolean == 'True'

    