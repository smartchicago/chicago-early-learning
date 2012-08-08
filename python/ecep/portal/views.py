from django.template import Context, loader
from django.shortcuts import render_to_response, get_object_or_404
from django.http import HttpResponse
from django.db.models import Q
from django.views.generic import View
from models import Location
import logging
import re

from twilio.twiml import Response
from django_twilio.decorators import twilio_view

logger = logging.getLogger(__name__)


def index(request):
    fields = Location.get_boolean_fields()
    return render_to_response('index.html', { 'fields':fields })


def location(request, location_id):
    """
    Render a detail page for a single location.
    """
    loc = get_object_or_404(Location, id=location_id)

    simple_text = [
        'n_classrooms', 'prg_dur', 'prg_size', 'prg_sched', 'site_affil', 
        'ctr_director', 'exec_director', 'q_stmt', 'e_info', 'as_proc', 'accred']

    # simple fields to present -- these are the attributes that have text content
    sfields = []

    # boolean fields to present -- these are the attributes that are set to True
    bfields = [] 

    for field in Location._meta.fields:
        # get boolean fields that are set, and set to True
        if field.get_internal_type() == 'NullBooleanField' and \
            getattr(loc, field.get_attname()):
                bfields.append(field.verbose_name)
        # get char fields & values if they are listed above, and not empty
        elif field.get_internal_type() == 'CharField' or field.get_internal_type() == 'TextField':
            for simple in simple_text:
                if field.get_attname() == simple and \
                    getattr(loc, field.get_attname()) is not None and \
                    getattr(loc, field.get_attname()) != '':
                        sfields.append( (field.verbose_name, getattr(loc, field.get_attname()),) )

    return render_to_response('location.html', {'model': loc, 'bfields': bfields, 'sfields': sfields })


def location_list(request):
    """
    Get a list of all the locations.
    """
    
    item_filter = None
    for f in request.GET:
        for field in Location._meta.fields:
            if field.get_attname() == f:
                logger.debug('Adding Filter: %s = %s' % (f, request.GET[f],))
                kw = { f: request.GET[f]=='true' }
                if item_filter is None:
                    item_filter = Q(**kw)
                else:
                    item_filter = item_filter & Q(**kw)
    if item_filter is None:
        items = list(Location.objects.all())
    else:
        items = list(Location.objects.filter(item_filter))

    logger.debug('Retrieved %d items.' % len(items))

    for i in range(0, len(items)):
        t = loader.get_template('popup.html')
        c = Context({'item': items[i]})
        content = t.render(c)
        content = content.replace('\n', '\\n').replace('"', '\\"')
        setattr(items[i], 'content', content)

    return render_to_response('locations.json', {'items':items}, mimetype='application/json')


def about(request):
    return render_to_response('about.html')


def faq(request):
    return render_to_response('faq.html')



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
    Represents the state of an sms "Conversation"
    """
    @staticmethod
    def _enum(**enums):
        return type('Enum', (), enums)

    #List of pks into models.Location, represents locations near this user
    locations = None
    zipcode = None
    current_state = None
    last_msg = None

    def __init__(self, request):
        """
        Creates a new Converstation object, using data stored in request.session if available
        """
        s = request.session
        self.current_state = s.get('state', Conversation.State.INIT)
        self.locations = s.get('locations', [])
        self.zipcode = s.get('zipcode', None)
        try:
            self.last_msg = SmsMessage(request)
        except Exception as e:
            logger.debug("Tried to create a Conversation from a request, " + 
                "but couldn't get SmsMessage object.  " + 
                "Request was: %s, Exception was: %s" % 
                (request.get_full_path(), e))

    def update_session(self, session):
        """
        Updates session with the info saved in this object
        """
        session['state'] = self.current_state
        session['locations'] = self.locations

Conversation.State = Conversation._enum(INIT=1, GOT_ZIP=2)
def get_module():
    return get_module.__module__
get_module()

class Sms(View):
    _re_zip = re.compile(r"^\s*(\d{5})\s*$")
    _re_help = re.compile(r"^\s*help\s*$", re.IGNORECASE)
    _re_num = re.compile(r"^\s*(\d{1,2})\s*$")

    USAGE = """
        To get this message text "help"
        Text a 5 digit zipcode to get a list of nearby schools. 
        Text a number on the list to get more information.
        """

    ERROR = 'Sorry, I didn\'t understand that. Please text "help" for instructions'
    FATAL = 'We\'re sorry, something went wrong with your request! Please try again'

    @staticmethod
    def reply(msg):
        """Simple wrapper for returning a text message response"""
        r = Response()
        r.sms(msg)
        return r

    def get(self, request):
        """Handler for GET requests, see View.dispatch"""
        result = sms(request)
        return result
                
    def post(self, request):
        """Handler for POST requests, see View.dispatch"""
        result = sms(request)
        return sms(request)


#TODO: I really hate putting this outside the Sms class where it belongs, but
#@twilio_view does not play nice with bound methods
@twilio_view
def sms(request):
    """Main request handler for SMS messages"""
    conv = Conversation(request)
    #print(conv.__dict__)
    msg = conv.last_msg
    response = None

    if msg is None:
        return Sms.reply(Sms.FATAL)
        
    matches = Sms._re_zip.match(msg.body)
    if matches is not None:
        #parse zipcodes
        zipcode = matches.groups()[0]
        conv.zipcode = zipcode
        #TODO: get real nearby location pks
        locations = [ 1, 2, 3 ] 
        conv.locations = locations
        if len(locations) > 0:
            conv.current_state = Conversation.State.GOT_ZIP
            #TODO: use real locations
            response = """Schools near %s:
                1. Foo school
                2. Bar school
                3. Baz school
                """ % zipcode
            conv.update_session(request.session)
        else:
            response = "Sorry, I couldn't find any schools near %s" % zipcode

    if Sms._re_help.match(msg.body):
        #parse "help" requests
        response = Sms.USAGE
    elif conv.current_state == Conversation.State.GOT_ZIP:
        #parse location selection
        matches = Sms._re_num.match(msg.body)
        loc = conv.locations or []
        length = len(loc)
        if matches is not None:
            idx = int(matches.groups()[0]) - 1
            if idx < 0 or idx >= length:
                response = "Sorry, I don't know about that school near zipcode %s. Please text a number between 1 and %d or a 5 digit zipcode" % (conv.zipcode, idx)
            else:
                #TODO: return real details
                response = "idx was %d, details for school go here"
        else:
            response = "Sorry, I didn't understand that number for zipcode %s. Please text a number between 1 and %d, or a 5 digit zipcode" % (conv.zipcode, length)
    else:
        err = "Illegal state in Conversation class. State was %s" % conv.current_state
        logger.debug(err)
        raise ValueError(err)
        
    return Sms.reply(response)

