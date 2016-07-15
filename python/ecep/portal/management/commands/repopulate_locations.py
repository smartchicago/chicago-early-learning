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

        with open('master.csv', 'rb') as masterfile:

            # Welp.
            Location.objects.all().delete()

            # Import the new
            reader = csv.DictReader(masterfile, encoding='utf-8-sig')
            rows = 1

            for row in reader:

                try: 
                    print rows
                    l = Location()

                    l.site_name = row['site_name']
                    l.q_stmt = row['q_stmt']
                    l.q_stmt_en = row['q_stmt_en']
                    l.ages = row['ages']
                    l.ecm_key = int(row['ecm_key'])
                    l.q_rating = row['q_rating']
                    l.q_stmt_es = row['q_stmt_es']
                    l.is_part_day = parse_null_boolean(row['is_part_day'])
                    l.id = int(row['id'])
                    l.prg_hours = row['prg_hours']
                    l.city = row['city']
                    l.site_type = row['site_type']
                    l.zip = row['zip']
                    l.placeholder_2 = row['placeholder_2']
                    l.state = row['state']
                    l.is_full_week = parse_null_boolean(row['is_full_week'])
                    l.is_age_lt_3 = parse_null_boolean(row['is_age_lt_3'])
                    l.geom = GEOSGeometry(row['geom'])
                    l.availability = row['availability']
                    l.is_age_gt_3 = parse_null_boolean(row['is_age_gt_3'])
                    l.is_community_based = parse_null_boolean(row['is_community_based'])
                    l.is_school_year = parse_null_boolean(row['is_school_year'])
                    l.email = row['email']
                    l.accred = row['accred']
                    l.is_hs = parse_null_boolean(row['is_hs'])
                    l.curriculum = row['curriculum']
                    l.language_1 = row['language_1']
                    l.language_3 = row['language_3']
                    l.language_2 = row['language_2']
                    l.is_part_week = parse_null_boolean(row['is_part_week'])
                    l.phone = row['phone']
                    l.accept_ccap = parse_null_boolean(row['accept_ccap'])
                    l.address = row['address']
                    l.accepted = row['accepted']
                    l.is_ehs = parse_null_boolean(row['is_ehs'])
                    l.is_full_day = parse_null_boolean(row['is_full_day'])
                    l.is_full_year = parse_null_boolean(row['is_full_year'])
                    l.url = row['url']
                    l.enrollment = row['enrollment']
                    l.enrollment_en = row['enrollment_en']
                    l.is_home_visiting = parse_null_boolean(row['is_home_visiting'])
                    l.curriculum_es = row['curriculum_es']
                    l.curriculum_en = row['curriculum_en']
                    l.open_house_en = row['open_house_en']
                    l.placeholder_1 = row['placeholder_1']
                    l.open_house = row['open_house']
                    l.open_house_es = row['open_house_es']
                    l.enrollment_es = row['enrollment_es']
                    l.is_cps_based = parse_null_boolean(row['is_cps_based'])

                    print ''
                    print 'Added {}'.format(str(l.id)) 
                    print ''
                    rows +=1
                    
                except:

                    print ''
                    print '*********'
                    print "Whoops! Something went wrong with "
                    print row['id']
                    print '*********'
                    print ''




def parse_null_boolean(boolean):

    if boolean == '':
        return ''

    elif boolean == None:
        return None

    else:
        return boolean == 'True'

    