# Copyright (c) 2012 Azavea, Inc.
# See LICENSE in the project root for copying permission

from django.core.management.base import BaseCommand, CommandError
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
            if row['Site Name'] is None or row['Site Name'] == '':
                continue

            l = Location(
                site_name = row['Site Name'],
                address = row['Address'],
                city = row['City '], # Yes, a space after city
                state = row['State'],
                zip = row['Zip'],
                phone1 = row['Phone Number'],
                phone2 = row['Phone Number 2'],
                phone3 = row['Phone Number 3'],
                fax = row['Fax'],
                is_child_care = parse_maybe(row['CC']),
                is_hs = parse_maybe(row['HS']),
                is_ehs = parse_maybe(row['EHS']),
                is_pre4all = parse_maybe(row['PFA']),
                is_tuition_based = parse_maybe(row['TB']),
                is_special_ed = parse_maybe(row['SE']),
                is_montessori = parse_maybe(row['MONT']),
                is_child_parent_center = parse_maybe(row['CPC']),
                is_age_lt_3 = parse_maybe(row['Ages 0-3']),
                is_age_gt_3 = parse_maybe(row['Ages 3-5']),
                exec_director = row['Executive Director'],
                ctr_director = row['Director/Principal'],
                site_affil = row['Site Affiliation'],
                url = row['Website'],
                email = row['email'],
                q_stmt = row['Quality Statement'],
                e_info = row['Eligibility Information'],
                as_proc = row['Application and Selection Process'],
                accred = row['Accreditation'],
                prg_sched = row['Program Schedule'],
                prg_dur = row['Program Duration'],
                prg_size = row['Program Size'],
                ages = row['Ages Served'],
                waitlist = row['Waitlist']
            )
            try:
                l.save()
            except Exception, ex:
                self.stdout.write('Could not save "%s"\n' % row['Site Name']) 
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

