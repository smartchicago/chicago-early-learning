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

        if not self.load(csv_file):
            raise CommandError('Spreadsheet could not be imported completely.')

        self.stdout.write('Google Doc data downloaded and imported successfully.')


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

    def load(self, filename):
        """
        Load a retrieved CSV into the data model.
        """
        reader = csv.DictReader(filename)

        for row in reader:
            l = Location(
                site_name = row['Site name'],
                address = row['Address'],
                city = row['City'],
                state = row['State'],
                zip = row['Zip'],
                phone1 = row['Phone number'],
                phone2 = row['Phone number 2'],
                phone3 = row['Phone number 3'],
                fax = row['Fax'],
                is_child_care = parse_maybe(row['Child Care']),
                is_child_parent_center = parse_maybe(row['Child Parent Center']),
                is_comm_partner = parse_maybe(row['Community Partnerships']),
                is_ehs = parse_maybe(row['Early Head Start']),
                is_hs = parse_maybe(row['Head Start']),
                is_prek_all = parse_maybe(row['Prekindergarten For All']),
                is_school_age = parse_maybe(row['School Age']),
                is_st_prek = parse_maybe(row['State Pre-Kindergarten']),
                is_tuition_based = parse_maybe(row['Tuition Based Preschool']),
                is_montessori = parse_maybe(row['Montessori']),
                is_special_ed = parse_maybe(row['Special Ed']),
                exec_director = row['Executive director'],
                ctr_director = row['Center director'],
                site_affil = row['Site affiliation'],
                url = row['Website'],
                email = row['Email'],
                q_stmt = row['Quality statement'],
                e_info = row['Eligibility information'],
                as_proc = row['Application and selection process'],
                accred = row['Accreditation'],
                prg_sched = row['Program schedule'],
                prg_dur = row['Program duration'],
                prg_size = row['Program size'],
                n_classrooms = row['Number of classrooms and ages served in each classroom'],
                waitlist = row['Waitlist situation']
            )
            try:
                l.save()
            except Exception, ex:
                self.stdout.write('Could not save "%s"\n' % row['Site name']) 
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

