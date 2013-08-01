# Copyright (c) 2012 Azavea, Inc.
# See LICENSE in the project root for copying permission

from django.core.management.base import BaseCommand, CommandError
from django.conf import settings

from portal.models import Location

import gdata.spreadsheet.service
import gdata.docs.service
import tempfile, getpass, csv

class Command(BaseCommand):
    """
    Import a dataset from a Google Spreadsheet into the application.
    """

    args = '<spreadsheet ID>'
    help = """This management command will download the content from a Google Spreadsheet 
document, and loads the fields into the portal.Location models of the django application."""

    baseuri = 'http://docs.google.com/feeds/documents/private/full/'

    def handle(self, *args, **options):
        """
        Download, 
        """
        username = raw_input('Google Docs email address: ')
        password = getpass.getpass('Google Docs password: ')

        if len(args) < 1:
            raise CommandError('No spreadsheet ID provided.')
            return

        csv_file = self.fetch(args[0], username, password)

        if not csv_file:
            raise CommandError('No spreadsheet downloaded.')
            return

        if not self.load(csv_file, **options):
            raise CommandError('Spreadsheet could not be imported completely.')

        self.stdout.write('Google Doc data downloaded and imported successfully.\n')


    def fetch(self, key, username, password):
        """
        Retrieve the data as a CSV export via the gdata python library.
        """
        localfile = tempfile.NamedTemporaryFile(suffix='.csv')

        try:
            spreadsheets_client = gdata.spreadsheet.service.SpreadsheetsService()
            spreadsheets_client.ClientLogin(username, password)


            gd_client = gdata.docs.service.DocsService()
            gd_client.ClientLogin(username, password)

            entry = gd_client.GetDocumentListEntry(self.baseuri + key)
            docs_auth_token = gd_client.GetClientLoginToken()

            gd_client.SetClientLoginToken(spreadsheets_client.GetClientLoginToken())
            gd_client.Export(entry, localfile.name)
            gd_client.SetClientLoginToken(docs_auth_token)

            return localfile
        except:
            return None

    def load(self, filename, **options):
        """
        Load a retrieved CSV into the data model.
        """
        reader = csv.DictReader(filename)

        if options['verbosity'] > 1:
            self.stdout.write('Found fields:\n')
            for f in reader.fieldnames:
                self.stdout.write('\t"%s"\n' % f)

        for row in reader:
            if row['Early Learning Site or School Name'] is None or row['Early Learning Site or School Name'] == '':
                continue

            STATE = (settings.STATE or row['State'])
                
            l = Location(
                site_name = row['Early Learning Site or School Name'],
                address = row['Address'],
                city = row['City'], # Yes, a space after city
                state = STATE,
                zip = row['Zip Code'],
                phone = row['Phone Number'],
                url = row['Website'],
                q_stmt = row['Program Statement'],
                accred = row['Accreditation'],
                prg_hours = row['Hours of Drop-Off/Pick-Up'],
                is_full_day = parse_maybe(row['Daily Schedule: Full Day Programming']),
                is_part_day = parse_maybe(row['Daily Schedule: Part Day Programming']),
                is_full_week = parse_maybe(row['Weekly Schedule: Full Week']),
                is_part_week = parse_maybe(row['Weekly Schedule: Part Week']),
                is_school_year = parse_maybe(row['Program Duration: School Year']),
                is_full_year = parse_maybe(row['Program Duration: Full Year']),
                ages = row['Ages Served'],
                is_age_lt_3 = parse_maybe(row['Ages Served 0-3']),
                is_age_gt_3 = parse_maybe(row['Ages Served 3-5']),
                language_1 = row['Language 1 Spoken (other than English)'],
                language_2 = row['Languages 2 Spoken (other than English)'],
                language_3 = row['Languages 3 Spoken (other than English)'],
                is_community_based = parse_maybe(row['Community-Based Program']),
                is_cps_based = parse_maybe(row['CPS School-Based Program']),
                is_home_visiting = parse_maybe(row['Home Visiting']),
                accept_ccap = parse_maybe(row['Accept CCAP?']),
                is_hs = parse_maybe(row['Head Start']),
                is_ehs = parse_maybe(row['Early Head Start']),
            )
            try:
                l.save()
            except Exception, ex:
                self.stdout.write('Could not save "%s"\n' % row['Early Learning Site or School Name']) 
                if options['verbosity'] > 1:
                    self.stdout.write('%s\n' % ex)
                return False

        return True

def parse_maybe(value):
    """
    Parse a boolean value which might be blank.
    """
    if value is None:
        return None
    lvalue = value.lower()
    return lvalue == 'yes' or lvalue == 'y' or lvalue == 'true'

