# Copyright (c) 2012 Azavea, Inc.
# See LICENSE in the project root for copying permission

from django.template import RequestContext
from django.shortcuts import render_to_response, get_object_or_404
from django.conf import settings
from django.http import HttpResponse, HttpResponseRedirect
from models import Location, Neighborhood
import logging
from faq.models import Topic, Question
from django.utils.translation import ugettext as _
from django.utils.translation import check_for_language
from django.utils import simplejson
from django.db.models import Count, Q
from operator import attrgetter
import json

logger = logging.getLogger(__name__)


# TODO: We probably don't need this function for the new version, I'm moving
# it in from the old version for now to avoid lots of refactoring.
def _get_opts(selected_val='2'):
    """Gets option list for the distance dropdown (see base.html)
    selected_val: string representing the value of the dropdown that
                  should be selected.
                  Default is '2'

    """
    # Options for distance dropdown
    # option value => (option text, enabled)
    distance_opts = {'-1': [_('Distance'), False],
                     '0.5': [_('< 0.5 mi'), False],
                     '1': [_('< 1 mi'), False],
                     '2': [_('< 2 mi'), False],
                     '5': [_('< 5 mi'), False],
                     '10': [_('< 10 mi'), False]}

    key = selected_val if selected_val in distance_opts else '2'
    distance_opts[key][1] = True
    result = [[k] + v for k, v in distance_opts.items()]
    return sorted(result, key=lambda a: float(a[0]))


def index(request):
    ctx = RequestContext(request, {})
    response = render_to_response('index.html', context_instance=ctx)
    return response


def about(request):
    ctx = RequestContext(request, {
        'options': _get_opts(),
        'mapbarEnabled': True
    })
    return render_to_response('about.html', context_instance=ctx)


def search(request):
    ctx = RequestContext(request, {})
    response = render_to_response('search.html', context_instance=ctx)
    return response


def browse(request):
    ctx = RequestContext(request, {})
    response = render_to_response('browse.html', context_instance=ctx)
    return response


class TopicWrapper(object):
    """Wrapper for Topic model, enforces visibility rules for anonymous users"""

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
        'options': _get_opts(),
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


def portal_autocomplete(request, query):
    """ Return as json Location & Neighborhood names that match query

    Make query against the database for Locations and Neighborhoods with
        matching names. Uses the TermDistance class to sort first by relevance
        to query, then alphabetically.

    json output format:
    {
        "response": [
            {
                "id": object database id,
                "name": "object name",
                "type": "type of object"
            }, ...
        ]
    }

    query -- autocomplete query to perform on the database

    """
    locations = Location.objects.filter(site_name__icontains=query).values('id', 'site_name')
    comparison = [TermDistance(location, 'location', 'site_name', query) for location in locations]

    neighborhoods = Neighborhood.objects.filter(primary_name__icontains=query).values('id', 'primary_name')
    comparison.extend([TermDistance(neighborhood, 'neighborhood', 'primary_name', query)
                       for neighborhood in neighborhoods])

    comparison = sorted(comparison, key=attrgetter('termDistance', 'field_value'))
    sorted_comparisons = [{"id": item.obj['id'],  "name": item.field_value, "type": item.objtype}
                          for item in comparison]

    data = {
        "response": sorted_comparisons
    }

    return HttpResponse(simplejson.dumps(data), mimetype='application/json')


class TermDistance:
    """ TermDistance utility class for portal autocomplete

    Use a pseudo-hamming distance to compare a string field of the
        django ValueQuerySet against an arbitrary term

    """
    def __init__(self, obj, objtype, field, term):
        """Initialize TermDistance class

        obj -- obj of type ValuesQuerySet
        objtype -- type of database object eg. Neighborhood or Location
        field -- field in ValuesQuerySet to do the comparison with
        term -- second string in comparison

        """
        if not obj:
            raise ValueError("object required for sorting")
        if not field:
            raise ValueError("database field required for sorting")
        if not term:
            term = ""
        if not objtype:
            objtype = ""
        if not obj[field]:
            raise ValueError("field " + field + " not in obj " + str(obj))

        self.obj = obj
        self.field = field
        self.field_value = self.obj[field]
        self.term = term
        self.objtype = objtype
        self.getTermDistance()

    def getTermDistance(self):
        """Compute pseudo-hamming distance for the two strs

        Result stored in self.termDistance

        """
        a = self.field_value.lower()
        b = self.term.lower()
        alen = len(a)
        blen = len(b)
        minlen = min(alen, blen)
        result = 0

        for i in range(minlen):
            result += (i + 1) * abs(ord(a[i]) - ord(b[i]))

        self.termDistance = result

    def __repr__(self):
        return self.__str__()

    def __str__(self):
        """ String representation of TermDistance """
        return "[" + self.field_value + "|" + self.term + "|" + str(self.termDistance) + "]"


# Location Stuff
def location_details(location_id):
    """
    Helper method that gets all the fields for a specific location.

    This is called by the detail page and the comparison page.
    """
    item = get_object_or_404(Location, id=location_id)
    return item.get_context_dict()


def location_api(request, location_ids=None):
    """
    API endpoint for locations.

    location_ids -- comma separated list of location ids to return

    If location_ids is passed, return JSON representation of those locations,
    else return an array with data on every location.
    """
    if location_ids:
        location_ids_array = [int(l_id) for l_id in location_ids.split(',') if l_id]
        locations = Location.objects.filter(pk__in=location_ids_array)
    else:
        locations = Location.objects.filter(~Q(geom=None))

    location_contexts = [l.get_context_dict() for l in locations]
    context = {'locations': location_contexts}
    return HttpResponse(json.dumps(context), content_type="application/json")


def location(request):
    ctx = RequestContext(request, {})
    response = render_to_response('location.html', context_instance=ctx)
    return response


def location_position(request, location_id):
    """
    Render a json response with the longitude and latitude of a single location.
    """
    loc = get_object_or_404(Location, id=location_id)
    results = [{'pk': location_id, 'lng': loc.geom[0], 'lat': loc.geom[1]}]
    return HttpResponse(json.dumps(results), content_type="application/json")


def neighborhood_api(request):
    counts = Neighborhood.objects.annotate(num_schools=Count('location'))
    count_list = [{'name': n.primary_name, 'schools': n.num_schools, 'id': n.pk, 'center': n.center()} for n in counts]
    count_list.sort(key=lambda x: x['name'])
    context = {'neighborhoods': count_list}
    return HttpResponse(json.dumps(context), content_type="application/json")


## Starred Location Views
def starred(request):
    """
    Render starred locations page for as many favorites as are set in url or cookie
    """
    ctx = RequestContext(request, {})
    response = render_to_response('starred.html', context_instance=ctx)
    return response
