from django.conf import settings
from django.core import mail
from django.template import Context
from django.template.loader import get_template
from models import Location
from celery import task
import logging

connection = mail.get_connection()
logger = logging.getLogger(__name__)

@task()
def send_emails(inquirer_info, location_ids):
  default_email = 'smarziano@cct.org'
  locations = Location.objects.filter(pk__in=location_ids)
  messages = []

  # Email the inquirer
  i_template = get_template('email/inquirer.html').render(Context({
      'info': inquirer_info,
      'locations': locations,
    }))
  i_subject = "You contacted %d Chicago Early Learning locations" % len(locations)
  i_message = mail.EmailMessage(i_subject, i_template, default_email, [inquirer_info['email']])
  i_message.content_subtype = "html"
  messages.append(i_message)

  # Group by location's email
  location_emails = {}
  for l in locations:
    location_emails.setdefault(l.email,[]).append(l)
  for e, l in location_emails.iteritems():
    l_template = get_template('email/location.html').render(Context({
        'info': inquirer_info,
        'locations': l,
      }))
    l_subject = "Chicago Early Learning inquiry from %s %s" % (inquirer_info['first_name'], inquirer_info['last_name'])
    l_message = mail.EmailMessage(l_subject, l_template, default_email, [default_email], headers={'Reply-To': inquirer_info['first_name']})
    l_message.content_subtype = "html"
    messages.append(l_message)

  # Send all emails
  connection.send_messages(messages)