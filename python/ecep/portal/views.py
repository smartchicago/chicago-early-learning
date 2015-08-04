# Copyright (c) 2012, 2013 Azavea, Inc.
# See LICENSE in the project root for copying permission

import logging
import hashlib
import json

from django.shortcuts import render, get_object_or_404, redirect
from django.conf import settings
from django.http import HttpResponse, HttpResponseRedirect
from django.views.decorators.cache import cache_control
from django.views.generic import TemplateView, DetailView
from django.utils.translation import check_for_language
from django.db.models import Count, Q
from django.contrib.gis.geos import Polygon
from django.utils.functional import Promise
from django.utils.encoding import force_unicode
from django.utils.translation import ugettext_lazy as _
from django.template.defaultfilters import slugify

from faq.models import Topic, Question

from models import Location, Neighborhood, Contact
from tasks import send_emails
from forms import ContactForm
from operator import attrgetter

logger = logging.getLogger(__name__)


class Index(TemplateView):
    template_name = "index.html"


class About(TemplateView):
    template_name = "about.html"


class SMSInfo(TemplateView):
    template_name = 'smsinfo.html'


def browse(request):
    # If a search query was passed in, see if we can find a matching location
    query = request.GET.get('lq', '').strip()
    if query:
        locations = Location.objects.filter(
            site_name__icontains=query,
            accepted=True
        ).values(
            'id',
            'site_name',
        )

        if len(locations) > 0:
            loc = locations[0]
            return redirect(
                'location-view',
                location_id=loc['id'],
                slug=slugify(loc['site_name']),
            )

    fields = Location.get_filter_fields()

    return render(request, 'browse.html', {
        'filters_main': fields[:6],
        'filters_more': fields[6:],
    })


def contact(request, location_ids):
    location_ids = location_ids.split(',')
    all_locations = Location.objects.filter(pk__in=location_ids, accepted=True)

    form = ContactForm(request.POST or None)

    if form.is_valid():
        cd = form.cleaned_data

        # Figure out which locations have already been contacted
        existing_locations_ids = Contact.objects.filter(
            email=cd['email'],
            location__in=location_ids
        ).values_list(
            'location',
            flat=True,
        )

        new_locations_ids = [l.pk for l in all_locations if l.pk not in existing_locations_ids]

        if len(new_locations_ids) > 0:
            # Create Contact objects for the new locations
            Contact.objects.bulk_create([
                Contact(
                    email=cd['email'],
                    first_name=cd['first_name'],
                    last_name=cd['last_name'],
                    phone=cd['phone'],
                    address_1=cd['address_1'],
                    address_2=cd['address_2'],
                    city=cd['city'],
                    state=cd['state'],
                    zip=cd['zip'],
                    child_1=cd['child_1'],
                    child_2=cd['child_2'],
                    child_3=cd['child_3'],
                    child_4=cd['child_4'],
                    child_5=cd['child_5'],
                    message=cd['message'],
                    location_id=lid
                ) for lid in new_locations_ids
            ])

            # Send emails to the inquirer and locations
            send_emails.delay(cd, new_locations_ids)

        # Redirect to the thanks page
        return HttpResponseRedirect('/contact-thanks/?new=%s&existing=%s' % (','.join([str(i) for i in new_locations_ids]), ','.join([str(i) for i in existing_locations_ids])))

    return render(request, 'contact.html', {
        'locations': [l.get_context_dict() for l in all_locations],
        'form': form,
    })


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
    # get the language of the request
    lang = request.LANGUAGE_CODE

    # get the topics in this language
    topics = Topic.objects.filter(slug__startswith=lang + '-')

    if topics.count() == 0:
        topics = Topic.objects.filter(
            slug__startswith=settings.LANGUAGE_CODE[0:2] + '-',
        )

    return render(request, 'faq-models.html', {
        'topics': [TopicWrapper(t, request) for t in topics],
    })


def setlang(request, language):
    """Set Language cookie, reload current page"""
    response = HttpResponseRedirect(request.META.get('HTTP_REFERER'))

    if language and check_for_language(language):
        response.set_cookie(settings.LANGUAGE_COOKIE_NAME, language)

    return response


def portal_autocomplete(request):
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
    query = request.GET.get('query', '').strip()
    locations = Location.objects.filter(
        site_name__icontains=query,
        accepted=True,
    ).values(
        'id',
        'site_name',
    )

    comparison = [TermDistance(location, 'location', 'site_name', query) for location in locations]

    neighborhoods = Neighborhood.objects.filter(
        primary_name__icontains=query
    ).values(
        'id',
        'primary_name',
    )

    comparison.extend([TermDistance(neighborhood, 'neighborhood', 'primary_name', query)
                       for neighborhood in neighborhoods])

    comparison = sorted(comparison, key=attrgetter('termDistance', 'field_value'))
    sorted_comparisons = [{"id": item.obj['id'],  "name": item.field_value, "type": item.objtype}
                          for item in comparison]

    data = {
        "response": sorted_comparisons
    }

    return HttpResponse(json.dumps(data), mimetype='application/json')


class TermDistance(object):
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

    The resulting filter object consists of the boolean fields ANDed together, then ANDed
    with the bounding box query.  Something like this:
        (filtera AND not filterb AND filterc ... ) AND bbox.Overlaps(Location.geom)

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
            result &= Q(**kw)

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
    rsp = HttpResponse(
        json.dumps(context, cls=LazyEncoder),
        content_type="application/json",
    )

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
        (Location.id in location_ids) AND (filtera AND not filterb AND ...) AND
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

    location_contexts = [l.get_context_dict() for l in Location.objects.filter(item_filter, accepted=True)]
    logger.debug('Retrieved %d location_contexts.' % len(location_contexts))
    context = {'locations': location_contexts}
    return _make_response(context, etag_hash)


def location(request, location_id=None, slug=None):
    loc = get_object_or_404(Location, id=location_id)
    return render(request, 'location.html', {
        'loc': location_details(location_id),
        'loc_description': loc.q_stmt,
        'loc_neighborhood': loc.neighborhood,
        'location': loc,
        'enrollment_hide': [  # hide values for enrollment centers
            'accred',
            'weekday_availability',
            'program_info',
            'quality_rating',
            'duration_hours',
            'ages',
        ]
    })


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
    locations = Location.objects.filter(location_filter, accepted=True)

    # List of dicts with keys nb_name and 'nbc_count'
    # The order_by() is important, as it prevents django from adding extra fields to the
    # query and borking the group-by statement.
    # See
    # https://docs.djangoproject.com/en/1.4/topics/db/aggregation/#interaction-with-default-ordering-or-order-by
    count_by_nbh = locations.values(nb_name).annotate(
        nbc_count=Count(nb_name)
    ).order_by()

    nbh_pk_to_count = {n[nb_name]: n['nbc_count'] for n in count_by_nbh if n[nb_name]}

    counts = Neighborhood.objects.all().order_by('primary_name')
    count_list = [{
        'name': n.primary_name,
        'schools': nbh_pk_to_count[n.pk] if n.pk in nbh_pk_to_count else 0,
        'id': n.pk,
        'center': n.get_center(),
        'explore': _('Explore'),
        'tooltip': {'explore': _('Click to see locations in this neighborhood')}
    } for n in counts]

    context = {'neighborhoods': count_list}
    return _make_response(context, etag_hash)


class Starred(TemplateView):
    template_name = 'starred.html'


class EnrollCommunityPlan(DetailView):
    """ Display customized printable enrollment plan """
    template_name = 'enroll-plan-community.html'
    model = Location
