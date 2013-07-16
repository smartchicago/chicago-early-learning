# Copyright (c) 2012 Azavea, Inc.
# See LICENSE in the project root for copying permission

from django.template import RequestContext
from django.shortcuts import render_to_response, get_object_or_404
from django.views.decorators.cache import cache_control
from django.db.models import Q
from django.conf import settings
from django.http import HttpResponse, HttpResponseRedirect, Http404
from models import Location, Neighborhood
import logging, hashlib
from faq.models import Topic, Question
from django.utils.translation import ugettext as _
from django.utils.translation import check_for_language
from django.utils import translation, simplejson
from operator import attrgetter
from portal.utils import TermDistance


logger = logging.getLogger(__name__)


# TODO: We probably don't need this function for the new version, I'm moving
# it in from the old version for now to avoid lots of refactoring.
def get_opts(selected_val='2'):
    """
    Gets option list for the distance dropdown (see base.html)
    selected_val: string representing the value of the dropdown that should be selected
    Default is '2'
    """
    # Options for distance dropdown
    # option value => (option text, enabled)
    distance_opts = { '-1': [_('Distance'), False],
                      '0.5': [_('< 0.5 mi'), False],
                      '1': [_('< 1 mi'), False],
                      '2': [_('< 2 mi'), False],
                      '5': [_('< 5 mi'), False],
                      '10': [_('< 10 mi'), False] }

    key = selected_val if selected_val in distance_opts else '2'
    distance_opts[key][1] = True
    result = [[k] + v for k, v in distance_opts.items()]
    return sorted(result, key=lambda a: float(a[0]))


def index(request):
    ctx = RequestContext(request, { })
    response = render_to_response('index.html', context_instance=ctx)
    return response


def about(request):
    ctx = RequestContext(request, {
        'options': get_opts(),
        'mapbarEnabled': True
    })
    return render_to_response('about.html', context_instance=ctx)


class TopicWrapper(object):
    topic = None
    questions = None

    def __init__(self, t, request):
        self.topic = t
        qs = Question.objects.filter(topic=t, status=Question.ACTIVE)
        if request.user.is_anonymous():
            qs = qs.exclude(protected=True)
        self.questions = list(qs)


def faq(request):
    tpl = 'faq-models.html'

    # get the language of the request
    lang = request.LANGUAGE_CODE

    # get the topics in this language
    topics = Topic.objects.filter(slug__startswith=lang + '-')
    if topics.count() == 0:
        topics = Topic.objects.filter(slug__startswith=settings.LANGUAGE_CODE[0:2] + '-')

    ctx = RequestContext(request, {
        'topics': [TopicWrapper(t, request) for t in topics],
        'options': get_opts(),
        'mapbarEnabled': True
    })
    return render_to_response(tpl, context_instance=ctx)


def setlang(request, language):
    nxt = '/'
    if 'next' in request.REQUEST:
        nxt = request.REQUEST['next']

    response = HttpResponseRedirect(nxt)
    if language and check_for_language(language):
        response.set_cookie(settings.LANGUAGE_COOKIE_NAME, language)

    return response


def api(request, class_name, query):
    """ View for handling portal api requests

    Make query against the database for relevant Location and Neighborhood
        requests. Uses the TermDistance class to sort first by relevance to query,
        then alphabetically.

    class_name -- case-insensitive name of the class to get data from
    query -- autocomplete query to perform on the database
    returns json with results stored in an array

    """
    class_name_lower = class_name.lower()

    # is there a more pythonic way to do associate the key to the class? 
    db_list = None
    field = ''
    if class_name_lower == "neighborhood":
        field = 'primary_name'
        db_list = Neighborhood.objects.filter(primary_name__icontains=query)
    elif class_name_lower == "school":
        field = 'site_name'
        db_list = Location.objects.filter(site_name__icontains=query)
    else:
        return HttpResponse('{"error": "Invalid search parameter ' + class_name + '"}', mimetype='application/json')

    db_list = db_list.values(field)
    comparison = [TermDistance(item[field], query) for item in db_list]
    comparison = sorted(comparison, key=attrgetter('termDistance', 'a'))
    results = [item.a for item in comparison]
    data = {
        class_name_lower: results
    }

    return HttpResponse(simplejson.dumps(data), mimetype='application/json')

