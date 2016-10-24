import random
import unicodecsv as csv

from django.core.management.base import BaseCommand, CommandError

from portal.models import Location


class Command(BaseCommand):
    """
    """

    def handle(self, *args, **options):
        """
        """

        with open('export.csv', 'rb') as availability_file:

            reader = csv.DictReader(availability_file, delimiter="|", encoding="Latin1")

            for row in reader:

                try:
                    key = row['ECMKey']
                    l = Location.objects.get(ecm_key=key)
                    old = l.availability
                    new = row['Availability_Level']
                    
                    if old != new:
                        print key
                        print "Old: {}".format(old)
                        print "New: {}".format(new)
                        print ''
                        l.availability = new
                        l.save()

                except:
                    print ''
                    print '**********'
                    print 'Problem with {}'.format(row['ECMKey'])
                    print '**********'
                    print ''


    def test_delta(self, l):

        smart_swap(l.site_name, row['site_name'])
        smart_swap(l.q_stmt, row['q_stmt'])
        smart_swap(l.q_stmt_en, row['q_stmt_en'])
        smart_swap(l.ages, row['ages'])
        smart_swap(l.ecm_key, int(row['ecm_key']))
        smart_swap(l.q_rating, row['q_rating'])
        smart_swap(l.q_stmt_es, row['q_stmt_es'])
        smart_swap(l.is_part_day, parse_null_boolean(row['is_part_day']))
        smart_swap(l.id, int(row['id']))
        smart_swap(l.prg_hours, row['prg_hours'])
        smart_swap(l.city, row['city'])
        smart_swap(l.site_type, row['site_type'])
        smart_swap(l.zip, row['zip'])
        smart_swap(l.placeholder_2, row['placeholder_2'])
        smart_swap(l.state, row['state'])
        smart_swap(l.is_full_week, parse_null_boolean(row['is_full_week']))
        smart_swap(l.is_age_lt_3, parse_null_boolean(row['is_age_lt_3']))
        smart_swap(l.geom, GEOSGeometry(row['geom']))
        smart_swap(l.availability, row['availability'])
        smart_swap(l.is_age_gt_3, parse_null_boolean(row['is_age_gt_3']))
        smart_swap(l.is_community_based, parse_null_boolean(row['is_community_based']))
        smart_swap(l.is_school_year, parse_null_boolean(row['is_school_year']))
        smart_swap(l.email, row['email'])
        smart_swap(l.accred, row['accred'])
        smart_swap(l.is_hs, parse_null_boolean(row['is_hs']))
        smart_swap(l.curriculum, row['curriculum'])
        smart_swap(l.language_1, row['language_1'])
        smart_swap(l.language_3, row['language_3'])
        smart_swap(l.language_2, row['language_2'])
        smart_swap(l.is_part_week, parse_null_boolean(row['is_part_week']))
        smart_swap(l.phone, row['phone'])
        smart_swap(l.accept_ccap, parse_null_boolean(row['accept_ccap']))
        smart_swap(l.address, row['address'])
        smart_swap(l.accepted, row['accepted'])
        smart_swap(l.is_ehs, parse_null_boolean(row['is_ehs']))
        smart_swap(l.is_full_day, parse_null_boolean(row['is_full_day']))
        smart_swap(l.is_full_year, parse_null_boolean(row['is_full_year']))
        smart_swap(l.url, row['url'])
        smart_swap(l.enrollment, row['enrollment'])
        smart_swap(l.enrollment_en, row['enrollment_en'])
        smart_swap(l.is_home_visiting, parse_null_boolean(row['is_home_visiting']))
        smart_swap(l.curriculum_es, row['curriculum_es'])
        smart_swap(l.curriculum_en, row['curriculum_en'])
        smart_swap(l.open_house_en, row['open_house_en'])
        smart_swap(l.placeholder_1, row['placeholder_1'])
        smart_swap(l.open_house, row['open_house'])
        smart_swap(l.open_house_es, row['open_house_es'])
        smart_swap(l.enrollment_es, row['enrollment_es'])
        smart_swap(l.is_cps_based, parse_null_boolean(row['is_cps_based']))


def smart_swap(old, new):

    if new:
        print old
        print new
        print '----'