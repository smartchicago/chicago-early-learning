# Copyright (c) 2012, 2013 Azavea, Inc.
# See LICENSE in the project root for copying permission

"""
This module contains classes and utilities for interacting with SMS messages
"""

import logging
import re
import math
import socket
from django.views.generic import View
from django.utils.decorators import classonlymethod, method_decorator
from django.views.decorators.csrf import csrf_exempt
from django.http import HttpResponse
from django.conf import settings
from django.core.urlresolvers import reverse
from django.template.loader import render_to_string
from django.utils.translation import ugettext as _
from models import Location
from twilio.twiml import Response
from twilio.rest import TwilioRestClient
from django_twilio.decorators import twilio_view
from celery import chain, task

logger = logging.getLogger(__name__)


def myassert(condition, msg=""):
    """Same as assert, but doesn't pay attention to __debug__"""
    if not condition:
        raise AssertionError(msg)


def enum(**enums):
    """Utility method for nice Enum syntax"""
    return type('Enum', (), enums)


def flag_enum(*names):
    """
    Utility method for nice Enum syntax, where each value is a power of 2
    Each name should be a string

    Example:
    t = flag_enum("foo", "bar")
    t.foo & t.bar == 0
    """
    flags = dict([(name, 1 << i) for (i, name) in enumerate(names)])
    return type('Enum', (), flags)


class SmsMessage(object):
    """
    Object representing an SMS message
    """
    body = None
    from_phone = None
    to_phone = None
    to_country = None
    to_state = None
    to_city = None
    to_zip = None

    def __init__(self, request):
        """
        Creates an SMS object from an HttpRequest object (assumed to have come from
        Twilio, see http://www.twilio.com/docs/api/twiml/sms/twilio_request)
        Handles both POST and GET requests
        request: a Django HttpRequest object
        """
        if request is None:
            raise Exception("request was None")

        params = request.REQUEST
        if params is None:
            raise Exception("No POST or GET params provided")

        self.body = params['Body']
        self.from_phone = params['From']
        self.to_phone = params['To']
        self.to_country = params.get('ToCountry', None)
        self.to_state = params.get('ToState', None)
        self.to_city = params.get('ToCity', None)
        self.to_zip = params.get('ToZip', None)


class Conversation(object):
    """
    Represents the state of an SMS "Conversation"

    This is the language it recognizes:
    'h'       - Returns usage (case insensitive)
    '12345'   - 5 digit zipcode.  Returns a numbered list of "nearby" schools
                "nearby" is a straight text search of the zipcode column on the Locations
                model.
    '4'       - 1 or 2 digit number.  Only valid if the user has already sent a zipcode
                Returns detailed information about the corresponding school, or an error
                if the number doesn't make sense.  The number represents a 1-based index
                into the numbered list returned by zipcode.
    'm|more'  - Get next n pages of information for the current request.
    """
    # Constants
    _re_zip = re.compile(r"^\s*(\d{5})\s*$")
    _re_help = re.compile(r"^\s*h\s*$", re.IGNORECASE)
    _re_num = re.compile(r"^\s*(\d{1,2})\s*$")
    _re_more = re.compile(r"^\s*(m|more)\s*$", re.IGNORECASE)

    _max_responses = 3

    # I wanted _re_help to recognize "help" instead of "h", but Twilio intercepts it :(
    # http://www.twilio.com/help/faq/sms/does-twilio-support-stop-block-and-cancel-aka-sms-filtering

    USAGE = _('To get this message text "h".\n' +
              'Text a 5 digit zipcode to get a list of nearby places.' +
              'Text a number on the list to get more information.')
    ERROR =  _('Sorry, I didn\'t understand that. Please text "h" for instructions')
    FATAL =  _('We\'re sorry, something went wrong with your request! Please try again')
    MORE =   _('Reply "m" or "more" to receive the next few pages')
    LIST_HEADER = _('Places near %s. Reply with program number for more info\n')

    # Properties
    locations = None        # List of pks into models.Location, represents locations near this user
    zipcode = None          # type string
    current_state = None    # type Conversation.State
    last_msg = None         # type SmsMessage
    response = None         # type twilio.twiml.Response
    response_state = None   # tuple(list(string), int)

    # response_state is only set if current_state = INTERRUPTED
    # first element is the list of messages that make up the response
    # second element is the index of the next message to send

    def __init__(self, request):
        """
        Creates a new Converstation object, using data stored in request.session if available
        request: a Django HttpRequest object
        """
        s = request.session
        self.current_state = s.get('state', Conversation.State.INIT)
        self.locations = s.get('locations', [])
        self.zipcode = s.get('zipcode', None)
        self.response_state = s.get('response_state', None)
        try:
            self.last_msg = SmsMessage(request)
        except Exception as e:
            logger.debug(
                ("Tried to create a Conversation from a request," +
                    "but couldn't get SmsMessage object.  " +
                    "Request was: %s, Exception was: %s") %
                (request.get_full_path(), e))

    def update_session(self, session):
        """
        Updates session with the info saved in this object
        Requires django.contrib.sessions.middleware.SessionMiddleware to be enabled
        Twilio keeps track of sessions for us using cookies with a 2 hour expiration time
        session: a django HttpRequest.session object
        """
        session['state'] = self.current_state
        session['locations'] = self.locations
        session['zipcode'] = self.zipcode
        session['response_state'] = self.response_state

    def update_response(self, msg=None):
        """
        Updates self.response, performs chunking logic and updates self.current_state and
        self.response_state as necessary
        msg:    message for response.  If not supplied, it uses self.response_state.
        """
        pages = None
        i = None
        if msg is not None:
            pages = Sms.paginate(msg)
            i = 0
        else:
            rs = self.response_state
            myassert(rs is not None, "Conversation.response_state was not set!")
            pages = rs[0]
            i = rs[1]

        start = i
        end = i + Conversation._max_responses
        self.response = pages[start:end]
        if end < len(pages):
            self.response.append(Conversation.MORE)
            self.response_state = (pages, end)
            self.current_state |= Conversation.State.INTERRUPTED
        elif msg is None:
            #update previous state if we had to read it
            self.response_state = None
            self.current_state &= ~Conversation.State.INTERRUPTED

    def nearby_locations(self, zipcode, count=None):
        """Returns locations that fall inside zipcode"""
        return Location.objects.filter(zip=zipcode)[:count]

    def process_request(self, request):
        """
        Handles the updating of the object's state, saving it to request.session, and
        creating self.response.  This is the core logic of the SMS "language".
        request: a django HttpRequest object
        """
        msg = self.last_msg

        if msg is None:
            self.update_response(Conversation.FATAL)
            return

        matches = self._re_zip.match(msg.body)
        if matches is not None:
            # parse zipcodes
            zipcode = matches.groups()[0]
            self.zipcode = zipcode
            locations = self.nearby_locations(zipcode)
            self.locations = [l.pk for l in locations]

            if len(locations) > 0:
                self.current_state = Conversation.State.GOT_ZIP
                schools_list = []
                for (i, l) in enumerate(locations):
                    school = "%d: %s" % (i + 1, l.site_name)
                    schools_list.append(school)

                response = Conversation.LIST_HEADER % zipcode
                response += "\n".join(schools_list)
                self.update_response(response)
            else:
                self.update_response(_("Sorry, I couldn't find any schools in %(zipcode)s" % {'zipcode': zipcode}))
        elif self._re_help.match(msg.body):
            # parse "help" requests
            self.update_response(self.USAGE)
        elif (self._re_more.match(msg.body) and
                (self.current_state & Conversation.State.INTERRUPTED) != 0):
            # send next few pages
            self.update_response()
        elif (self.current_state & Conversation.State.GOT_ZIP) != 0:
            # parse location selection
            matches = self._re_num.match(msg.body)
            loc = self.locations or []
            length = len(loc)
            if matches is not None:
                idx = int(matches.groups()[0]) - 1
                if idx < 0 or idx >= length:
                    self.update_response(
                        _("Sorry, I don't know about that school near zipcode %(zipcode)s. " +
                            "Please text a number between 1 and %(length)d or a 5 digit zipcode") %
                        {'zipcode': self.zipcode, 'length': length})
                else:
                    l = Location.objects.get(pk=self.locations[idx])
                    ctx = l.get_context_dict()
                    body = render_to_string('location.sms', ctx).strip()
                    self.update_response(body)
            else:
                self.update_response(
                    _("Sorry, I didn't understand that number for zipcode %(zipcode)s. " +
                        "Please text a number between 1 and %(length)d or a 5 digit zipcode") %
                    {'zipcode': self.zipcode, 'length': length})
        else:
            self.update_response(self.ERROR)

# Enum representing the current state of the conversation
Conversation.State = flag_enum("INIT", "GOT_ZIP", "INTERRUPTED")


class Sms(View):
    """
    View class for handling SMS messages from twilio
    """

    # For twilio trial accounts use 120 instead, otherwise it gets truncated
    _max_length = 160       # Max length of SMS payload

    # 6 seemed like a good default during testing
    _sms_delay = settings.SMS_DELAY or 6
    request = None          # Current django request object we're handling

    @classonlymethod
    def as_view(cls, **initkwargs):
        # twilio_view doesn't play nice with View classes, so we insert it manually here
        return twilio_view(super(Sms, cls).as_view(**initkwargs))

    def reply_str(self, sms_wrapper, msg):
        """Simple wrapper for returning a text message response given a string to return
        sms_wrapper:        SmsMessage object (used for metadata)
        msg:                String containing the message to send
        """
        return self.reply_list(sms_wrapper, Sms.paginate(msg))

    def reply_list(self, sms_wrapper, msgs):
        """Simple wrapper for returning a text message response given a list of texts to return
        sms_wrapper:        SmsMessage object (used for metadata)
        msg:                Iterable containing the messages to send. It is the caller's responsibility
                            to ensure they're the proper length.
        """
        if not msgs or len(msgs) < 1:
            return Response()

        callback_url = self.request.build_absolute_uri(reverse('sms-callback'))
        args = {
            'callback': callback_url,
            'from_': sms_wrapper.to_phone,
            'to': sms_wrapper.from_phone,
        }

        # First item uses different call/args
        # See http://docs.celeryproject.org/en/latest/userguide/canvas.html#chains
        msg_chain = [sms_bunny.s(args, msgs[0])]
        for m in msgs[1:]:
            msg_chain.append(sms_bunny.subtask((m,), countdown=self._sms_delay))

        try:
            chain(*msg_chain).apply_async()
        except socket.error:
            # Not finding celery counts as 502: bad gateway
            return HttpResponse('Couldn\'t connect to celery to send SMS messages', status=502)

        return Response()

    @staticmethod
    def paginate(msg, length=_max_length, min_percent_full=0.85,
                 page_formater=lambda i, m: _("(page %(current)d/%(total)d)") % {'current': i, 'total': m}, ellipsis="..."):
        """
        Takes a message a breaks it into chunks with no more than than length characters and
        more than length * min_percent_full characters (except for the last one).
        Automatically appends pagination information to the end of each page in form of
        page_formater(current_page, n_pages).  It does its best to respect newlines and spaces,
        but will split messages across either in order to obtain messages of minimum length.

        This function should work pretty well for sane inputs, but might act strange
        or explode for weird ones (e.g. length is only a few characters longer than
        len(page_formater(1, 1)), min_percent_full and length are both small, etc)

        msg (string):       The message to paginate
        length:             Maximum number of characters in a page
        min_percent_full:   Each page except the last must have at least this
                            percent characters used, including the pagination string at the end
        page_formater:      Determines the pagination string appended to each page. It will
                            be called with with two integers as arguments, the current page and
                            the number of pages respectively.  It should return the string to
                            append to each message denoting the page number.
                            It must have the property:
                            len(page_formater(n, n)) >= len(page_formater(i, n)) where n is the
                            number of pages and i < n.
                            It always has "\n" prepended to it.
        ellipsis:           This string is appended and prepended to words that are split
                            across messages.  For example, if "foobar" is split across two
                            messages, the payload for the first will end in "foo..." and
                            the payload for the next will start with "...bar"
        returns:            A list of strings representing the pages in order
        """

        msg_len = len(msg)
        if msg_len < length:
            return [msg]

        ell_len = len(ellipsis)
        min_percent_full = sorted((0.1, min_percent_full, 1.0))[1]
        pages_min = int(math.ceil(float(msg_len) / length))
        digits_max = len(str(pages_min))
        suffix_max = len(page_formater(10 ** digits_max, 10 ** digits_max))
        payload_min = math.floor(min_percent_full * length) - suffix_max
        payload_max = length - suffix_max
        #pages_max = math.ceil(float(msg_len) / payload_min)

        def add_word(pages, message, current):
            """
            Special case of paginate_internal for when separator == ""
            See docstring for paginate_internal
            """
            # remaining characters in current page (get at least 2 chars of our word in)
            remain_len = max(0, payload_max - len(current) - ell_len - 2)
            message_len = len(message)
            if remain_len > 0:
                # There's still some space in curent, so add beginning of word to it
                current += message[0:remain_len] + ellipsis
            pages.append(current)
            start = remain_len
            while True:
                end = start + payload_max - 2 * ell_len
                if end > message_len:
                    # we're on the last chunk
                    return ellipsis + message[start:end]
                elif end + ell_len > message_len:
                    # our last chunk will just barely fit, add it and return empty
                    pages.append(ellipsis + message[start:end + ell_len])
                    return ""
                else:
                    # Remainder won't all fit in one page, add next page and continue
                    pages.append(ellipsis + message[start:end] + ellipsis)
                    start = end

        def paginate_internal(pages, message, current="", separator="\n"):
            """
            This is the real function, declared as a lambda function because it is both
            recursive and needs most of the variables defined above (passing them in as
            arguments would be quite annoying).  This function takes message and reads
            through it, appending it to pages until it runs out of text.

            pages:      An array holding the pages we've created so far. This funtion will
                        append new pages to it as necessary. The pages are fully complete
                        except they have not yet had page_formater output appended to them.
            message:    The next block of text to add to pages.  Some substring of msg in
                        the outer scope.
            current:    The next page to add to pages, in some stage of completion.
            separator:  This denotes how message should be split up.  There are only
                        three valid values: "\n", " ", and "".  "\n" means message is added
                        to the current page in units of one line, " " means message is
                        added in units of one word, and "" means message is added to pages
                        in increments of max payload length.
            returns:    None if separator is "\n", otherwise the value of current once we
                        reach the end of message. This allows the calling function to pick
                        up where we left off.
            """
            curr_len = len(current)

            if curr_len + len(message) < payload_max:
                pages.append(current + message)
                return ""

            if separator == "":
                # message is one word
                return add_word(pages, message, current)

            myassert(separator != "",
                     "Illegal state in paginate_internal: separator was %s" % separator)
            parts = message.split(separator)
            n_parts = len(parts)
            subsep = " " if separator == "\n" else ""
            for i in xrange(0, n_parts):
                next_part = parts[i]
                curr_len = len(current)
                next_len = len(next_part)

                if curr_len + (1 + next_len) < payload_max:
                    # We have room to add the next part, keep going
                    current += next_part + separator
                elif curr_len > payload_min:
                    # No room to add next part, but we have our minimum, so start a new page
                    result.append(current.rstrip(separator))
                    if next_len < payload_max:
                        # Next part can fit in single page
                        current = next_part + separator
                    else:
                        # Next part is too big for single page, must split it
                        current = paginate_internal(
                            pages, next_part, current, subsep) + separator
                else:
                    current = paginate_internal(
                        pages, next_part, current, subsep) + separator
                    # No room to add next part and we haven't met our minimum

            current = current.rstrip(separator)
            if separator == "\n":
                # We're the top of the stack, so add last page if necessary and don't return anything
                # Don't bother making a page that's entirely whitespace
                if len(current) > 0 and not current.isspace():
                    pages.append(current)
                return
            else:
                return current

        # Actually call the above function
        result = []
        paginate_internal(result, msg)
        n_pages = len(result)
        # assert n_pages <= pages_max

        # Add page_formater suffix to all the pages
        for (i, page) in enumerate(result):
            result[i] += "\n" + page_formater(i + 1, n_pages)
            myassert(len(result[i]) <= length,
                     "length for one of the pages was too long!")

        return result

    def get(self, request):
        """Handler for GET requests, see View.dispatch"""
        result = self.handle_sms(request)
        return result

    def post(self, request):
        """Handler for POST requests, see View.dispatch"""
        result = self.handle_sms(request)
        return result

    def handle_sms(self, request):
        """Main request handler for SMS messages"""
        self.request = request
        conv = Conversation(request)
        conv.process_request(request)
        conv.update_session(request.session)
        return self.reply_list(SmsMessage(request), conv.response)


class SmsCallback(View):
    """View class for handling twilio callbacks. Simply logs errors, ignores success"""
    @method_decorator(csrf_exempt)
    def dispatch(self, *args, **kwargs):
        return super(SmsCallback, self).dispatch(*args, **kwargs)

    def post(self, request):
        """
        Logs errors, always returns 200
        See http://www.twilio.com/docs/api/twiml/sms#attributes-statusCallback
        """
        sid = request.POST['SmsSid']
        status = request.POST['SmsStatus']
        if status.lower() != 'sent':
            logger.debug('SMS with id %s failed!' % sid)

        return HttpResponse(status=200)


@task()
def sms_bunny(args, message):
    """Celery task for sending messages asynchronously
    args:       Dict containing the following required fields:
        to:         Phone number we're sending the text to (should come from twilio API args)
        from_:      Phone number we're sending from (should come from twilio API args)
        callback:   Url for twilio to hit when request completes
    message:    String containing SMS payload

    returns:    args (useful for chaining multiple calls together)

    Note: args isn't *args to make calling this using celery chain() easier
    """
    account_sid = settings.TWILIO_ACCOUNT_SID
    auth_token = settings.TWILIO_AUTH_TOKEN
    to = args['to']
    from_ = args['from_']
    callback = args['callback']
    client = TwilioRestClient(account_sid, auth_token)

    try:
        client.sms.messages.create(body=message, to=to, from_=from_, status_callback=callback)
        # print("Sending sms text: %s" % message)
    except Exception as e:
        # print e
        logger.debug('Sending SMS via twilio failed! %s' % e)
        pass

    return args
