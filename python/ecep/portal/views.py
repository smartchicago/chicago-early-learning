# Copyright (c) 2012 Azavea, Inc.
# See LICENSE in the project root for copying permission

from django.template import RequestContext
from django.shortcuts import render_to_response, get_object_or_404
from django.conf import settings
from django.http import HttpResponse, HttpResponseRedirect
from django.views.decorators.cache import cache_control
from models import Location, Neighborhood
import logging
import hashlib
from faq.models import Topic, Question
from django.utils.translation import check_for_language
from django.utils import simplejson
from django.db.models import Count, Q
from django.contrib.gis.geos import Polygon
from operator import attrgetter
import json
from django.utils.functional import Promise
from django.utils.encoding import force_unicode
from django.utils.translation import ugettext as _

logger = logging.getLogger(__name__)


def index(request):
    ctx = RequestContext(request, {})
    response = render_to_response('index.html', context_instance=ctx)
    return response


def about(request):
    ctx = RequestContext(request, {})
    return render_to_response('about.html', context_instance=ctx)


def search(request):
    ctx = RequestContext(request, {})
    response = render_to_response('search.html', context_instance=ctx)
    return response


def browse(request):
    fields = Location.get_filter_fields()

    # TODO: for now left/right split is kinda random, might want more control
    ctx = RequestContext(request, {
        'filters_left': fields[:len(fields) / 2],
        'filters_right': fields[len(fields) / 2:]
    })

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
    })
    return render_to_response(tpl, context_instance=ctx)


def setlang(request, language):
    """Set Language cookie, reload current page"""
    response = HttpResponseRedirect(request.META.get('HTTP_REFERER'))
    
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

_location_bool_fields = {f.get_attname() for f in Location._meta.fields}


def _make_location_filter(query_params, etag_hash=''):
    """Helper function that converts boolean filter query params to a filter object

    The resulting filter object consists of the boolean fields ORed together, then ANDed
    with the bounding box query.  Something like this:
        (filtera OR not filterb OR filterc ... ) AND bbox.Overlaps(Location.geom)

    query_params: dict containing boolean fields in Location model with true/false string values
                  and/or 'bbox'
        'bbox'  : CSV of points of the form xmin,ymin,xmax,ymax
    etag_hash   : Current string used to make etag for request
    returns     : (Q object, etag_hash)

    """
    def make_rectangle(bbox):
        """Given a bbox csv returns a geometry object for it"""
        xmin, ymin, xmax, ymax = (float(x) for x in bbox.split(','))
        return Polygon(((xmin, ymin), (xmin, ymax), (xmax, ymax), (xmax, ymin), (xmin, ymin)))

    # Filter by any boolean filters provided
    result = Q()
    for f, val in query_params.iteritems():
        if f in _location_bool_fields:
            logger.debug('Adding Filter: %s = %s' % (f, val))
            kw = {f: val == 'true'}
            etag_hash += str(kw)
            result |= Q(**kw)

    # Filter by any bbox if provided
    if 'bbox' in query_params:
        etag_hash = ''            # Can't cache bbox queries
        bbox = make_rectangle(query_params['bbox'])
        bbox_filter = Q(geom__bboverlaps=bbox)
        result &= bbox_filter

    return result, etag_hash


class LazyEncoder(json.JSONEncoder):
    """Encodes django's lazy i18n strings.
    Used to serialize translated strings to JSON, because
    simplejson chokes on it otherwise.

    Taken from: http://khamidou.com/django-translation-in-json.html
    """
    def default(self, obj):
        if isinstance(obj, Promise):
            return force_unicode(obj)
        return obj


def _make_response(context, etag_hash):
    rsp = HttpResponse(json.dumps(context, cls=LazyEncoder), content_type="application/json")

    if etag_hash:
        md5 = hashlib.md5()
        md5.update(etag_hash)
        rsp['Etag'] = md5.hexdigest()

    return rsp


def location_details(location_id):
    """
    Helper method that gets all the fields for a specific location.

    This is called by the detail page and the comparison page.
    """
    item = get_object_or_404(Location, id=location_id)
    return item.get_context_dict()


@cache_control(must_revalidate=False, max_age=3600)
def location_api(request, location_ids=None):
    """
    API endpoint for locations.

    location_ids: optional comma separated list of location ids to filter.
        If no values are provided all Locations will be examined

    request.GET params:
        <any boolean field in Locations>:   value may be either 'true' or 'false'
        'bbox':                             value is a csv of points of the form
            xmin,ymin,xmax,ymax

    returns: Locations filtered like so:
        (Location.id in location_ids) AND (filtera OR not filterb OR ...) AND
            bbox.Overlaps(Location.geom)
        result has the following structure:
            {"locations": [ Locations filtered as described above ]}

    """
    etag_hash = 'empty'

    # Filter by ids if provided
    item_filter = None
    if location_ids:
        location_ids_array = [int(l_id) for l_id in location_ids.split(',') if l_id]
        item_filter = Q(pk__in=location_ids_array)
    else:
        item_filter = ~Q(geom=None)

    bool_filter, etag_hash = _make_location_filter(request.GET, etag_hash)
    item_filter &= bool_filter

    location_contexts = [l.get_context_dict() for l in Location.objects.filter(item_filter)]
    logger.debug('Retrieved %d location_contexts.' % len(location_contexts))
    context = {'locations': location_contexts}
    return _make_response(context, etag_hash)


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


@cache_control(must_revalidate=False, max_age=60*60*24)
def neighborhood_api(request):
    """API endpoint for neighborhoods.  Returns metadata about all neighborhoods in db.

    request.GET params:
        <any boolean field in Locations>:   value may be either 'true' or 'false'
        'bbox':                             value is a csv of points of the form
            xmin,ymin,xmax,ymax

    returns: A list of neighborhoods.  The query params only control which locations are counted
             in the 'schools' field.
             Included fields for each item:
                 'name':    Neighborhood.primary_name
                 'schools': Count of schools in the neighborhood, using the filtering mechanism
                            described for the locations endpoint
                 'id':      Primary key
                 'center':  lat/lng dict with the centroid of the neighborhood polygon
        result has the following structure:
            {"neighborhoods": [ List of neighborhoods as described above ]}
    """
    etag_hash = 'empty'
    nb_name = Neighborhood.__name__.lower()
    location_filter, etag_hash = _make_location_filter(request.GET, etag_hash)
    locations = Location.objects.filter(location_filter)

    # List of dicts with keys nb_name and 'nbc_count'
    # The order_by() is important, as it prevents django from adding extra fields to the
    # query and borking the group-by statement.
    # See
    # https://docs.djangoproject.com/en/1.4/topics/db/aggregation/#interaction-with-default-ordering-or-order-by
    count_by_nbh = locations.values(nb_name).annotate(nbc_count=Count(nb_name)).order_by()
    nbh_pk_to_count = {n[nb_name]: n['nbc_count'] for n in count_by_nbh if n[nb_name]}
    counts = Neighborhood.objects.all().order_by('primary_name')
    count_list = [{
        'name': n.primary_name,
        'schools': nbh_pk_to_count[n.pk] if n.pk in nbh_pk_to_count else 0,
        'id': n.pk,
        'center': n.get_center(),
        'explore': _('Explore')
    } for n in counts]

    context = {'neighborhoods': count_list}
    return _make_response(context, etag_hash)


## Starred Location Views
def starred(request):
    """
    Render starred locations page for as many favorites as are set in url or cookie
    """
    ctx = RequestContext(request, {})
    response = render_to_response('starred.html', context_instance=ctx)
    return response
