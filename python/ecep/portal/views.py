# Copyright (c) 2012, 2013 Azavea, Inc.
# See LICENSE in the project root for copying permission

import logging
import hashlib
import json

from django.shortcuts import render, get_object_or_404, redirect
from django.conf import settings
from django.core.urlresolvers import reverse
from django.http import HttpResponse, HttpResponseRedirect, JsonResponse
from django.views.decorators.cache import cache_control
from django.views.generic import TemplateView, DetailView
from django.utils.translation import check_for_language
from django.db.models import Count, Q
from django.contrib.gis.geos import Polygon
from django.utils.functional import Promise
from django.utils.encoding import force_unicode
from django.utils.translation import ugettext_lazy as _, ugettext
from django.template.defaultfilters import slugify

from faq.models import Topic, Question

from models import Location, Neighborhood, Contact
from operator import attrgetter

logger = logging.getLogger(__name__)


class Index(TemplateView):
    template_name = "index.html"

class IndexRedesign(TemplateView):
    template_name = "redesign/index.html"

class Connect(TemplateView):
    template_name = "connect.html"

class About(TemplateView):
    template_name = "about.html"

class SMSInfo(TemplateView):
    template_name = "smsinfo.html"

class Updates(TemplateView):
    template_name = "updates.html"

class Families(TemplateView):
    template_name = "families.html"

class CityResources(TemplateView):
    template_name = "city-resources.html"

class HowToApply(TemplateView):
    template_name = "how-to-apply.html"

class Announcements(TemplateView):
    template_name = "announcements.html"

class Outreach(TemplateView):
    template_name = "outreach.html"

class OutreachRedesign(TemplateView):
    template_name = "outreach-redesign.html"

class Starred(TemplateView):
    template_name = 'starred.html'


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

# This can probably go - ajb 9 July 2017
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
    location = get_object_or_404(Location, id=location_id)
    loc = location_details(location_id)
    fields = clean_context_dict(loc)

    if request.LANGUAGE_CODE == 'es' and location.q_stmt_es == '':
        no_es_description = True
    else:
        no_es_description = False


    return render(request, 'location.html', {
        'loc': loc,
        'loc_description': location.q_stmt,
        'loc_neighborhood': location.neighborhood,
        'location': location,
        'fields': fields,
        'no_es_description': no_es_description
    })

def clean_context_dict(context_dict):

    fields = {}
    for field in context_dict['sfields']:
        key = field['fieldname'].lower()
        key = key.replace(' ', '_')
        fields[key] = field['value']

    bfields = context_dict['bfields']
    fields['other_features'] = bfields['values']

    return fields


def location_json_api(request):
    """

    API Endpoint for returning a full JSON list of names and IDs of schools and locations
    for use in the homepage search bar autocomplete dropdown.

    """
    locs = Location.objects.all().values('site_name', 'id').order_by('site_name')
    loc_list = list(locs)

    for location in loc_list:
        location['label'] = location.pop('site_name')
        location['place_id'] = location.pop('id')
        location['category'] = 'Locations'

    return JsonResponse(loc_list, safe=False)


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


def location_csv(request):

    response = HttpResponse(content_type="text/csv")
    response['Content-Disposition'] = 'attachment; filename="locations.csv"'

    l = Location.objects.all()[:10]
    headers = ['Location ID', 'Site Name', 'Address', 'City', 'State', 'Zip Code', 'Neighborhood', 'Phone', 'Description', 'Full Day', 'Part Day']
    
    writer = csv.DictWriter(response, fieldnames=headers)
    writer.writeheader()

    for location in l:
        writer.writerow({
                'Location ID' : location.id,
                'Site Name': location.site_name,
                'Address' : location.address,
                'City' : location.city,
                'State' : location.state,
                'Zip Code' : location.zip,
                'Neighborhood' : location.neighborhood,
                'Phone' : location.phone,
                'Description' : 'Location Description in English',
                'Full Day' : location.is_full_day,
                'Part Day' : location.is_part_day,
            })

    return response


# This function overwrites the existing json API endpoint, specifically for the starred 
# page. We need better control over what we display and when in location-based views,
# so this logic replaces the default data transition function. This function should serve
# as the new basis for site-wide data transfers going forward, if more refactoring is 
# necessary. - ajb, 1 June 2016
#
def starred_location_api(request, location_ids=None):
    if location_ids:
        location_ids_array = [int(l_id) for l_id in location_ids.split(',') if l_id]
    else:
        location_ids_array = "none"

    r = {}

    locations_array = []
    for location_id in location_ids_array:
        # Retrieve location object:
        location = Location.objects.get(id=location_id)

        l = {}
        
        # Basic Info
        l['id'] = location.id
        l['site_name'] = location.site_name
        l['address'] = location.address
        l['city'] = location.city
        l['state'] = location.state
        l['zip'] = location.zip
        l['phone'] = location.phone
        l['url'] = location.url
        l['not_enrollment_site'] = not location.is_enrollment
        l['location-page'] = reverse('location-view', 
                                     kwargs = {'location_id': location.id})

        # Is 
        copa = {}
        copa_warning_display = ugettext('Contact this site directly to apply.')
        copa['warning'] = copa_warning_display
        copa['key'] = location.copa_key
        copa['value'] = (location.copa_key == 0)
        l['copa'] = copa


        # Description
        d = {}
        description_display = location.verbose_name('q_stmt')
        d['display'] = description_display
        d['value'] = location.q_stmt
        l['description'] = d

        # Ages Served
        l['ages_served'] = ugettext('Ages Served')

        ## Ages 0 - 3
        a1 = {}
        ages_0_to_3_display = location.verbose_name('is_age_lt_3')
        a1['display'] = ages_0_to_3_display
        a1['value'] = location.is_age_lt_3
        l['ages_0_to_3'] = a1

        ## Ages 3 - 5
        a2 = {}
        ages_3_to_5_display = location.verbose_name('is_age_gt_3')
        a2['display'] = ages_3_to_5_display
        a2['value'] = location.is_age_gt_3
        l['ages_3_to_5'] = a2

        # Duration and Hours
        l['duration_and_hours'] = ugettext('Duration and Hours')

        ## Hours
        prg_hours = {}
        prg_hours_display = ugettext('No Hours Listed')
        prg_hours['display'] = prg_hours_display
        prg_hours['value'] = location.prg_hours
        l['prg_hours'] = prg_hours

        ## Full Day
        full_day = {}
        full_day_display = location.verbose_name('is_full_day')
        full_day['display'] = full_day_display
        full_day['value'] = location.is_full_day
        l['full_day'] = full_day

        ## Part Day
        part_day = {}
        part_day_display = location.verbose_name('is_part_day')
        part_day['display'] = part_day_display
        part_day['value'] = location.is_part_day
        l['part_day'] = part_day

        ## Full Year
        full_year = {}
        full_year_display = location.verbose_name('is_full_year')
        full_year['display'] = full_year_display
        full_year['value'] = location.is_full_year
        l['full_year'] = full_year

        ## School Year
        school_year = {}
        school_year_display = location.verbose_name('is_school_year')
        school_year['display'] = school_year_display
        school_year['value'] = location.is_school_year
        l['school_year'] = school_year

        # Program Information
        l['program_information'] = ugettext('Program Information')

        ## CPS Based
        cps_based = {}
        cps_based_display = location.verbose_name('is_cps_based')
        cps_based['display'] = cps_based_display
        cps_based['value'] = location.is_cps_based
        l['cps_based'] = cps_based

        ## Community Based
        community_based = {}
        community_based_display = location.verbose_name('is_community_based')
        community_based['display'] = community_based_display
        community_based['value'] = location.is_community_based
        l['community_based'] = community_based

        ## Head Start
        head_start = {}
        head_start_display = location.verbose_name('is_hs')
        head_start['display'] = head_start_display
        head_start['value'] = location.is_hs
        l['head_start'] = head_start

        ## Early Head Start
        early_head_start = {}
        early_head_start_display = location.verbose_name('is_ehs')
        early_head_start['display'] = early_head_start_display
        early_head_start['value'] = location.is_ehs
        l['early_head_start'] = early_head_start

        ## Accepts CCAP
        ccap = {}
        ccap_display = location.verbose_name('accept_ccap')
        ccap['display'] = ccap_display
        ccap['value'] = location.accept_ccap
        l['ccap'] = ccap

        ## Home Visiting
        home_visiting = {}
        home_visiting_display = location.verbose_name('is_home_visiting')
        home_visiting['display'] = home_visiting_display
        home_visiting['value'] = location.is_home_visiting
        l['home_visiting'] = home_visiting

        # Languages
        languages = {}
        languages_display = ugettext('Languages (other than English)')
        languages['display'] = languages_display
        languages['value'] = location.combine_languages()
        l['languages'] = languages

        # Other Features
        other_features = {}
        other_features_display = ugettext('Other Features')
        other_features['display'] = other_features_display
        other_features['value'] = location.combine_other_features()
        l['other_features'] = other_features

        # Accreditation
        accreditation = {}
        accreditation_display = location.verbose_name('accred')
        accreditation['display'] = accreditation_display
        accreditation['value'] = location.accred
        l['accreditation'] = accreditation

        # Quality Rating
        quality_rating = {}
        quality_rating_display = location.verbose_name('q_rating')
        quality_rating['display'] = quality_rating_display
        quality_rating['value'] = location.get_q_rating_display()
        l['quality_rating'] = quality_rating

        # Seat Availability
        availability = {}
        availability_rating_display = ugettext('Seats Available')
        availability['display'] = availability_rating_display
        availability['value'] = location.get_availability_display()
        availability['note'] = ugettext('Note: Availability and placement are subject to eligibility.')
        l['availability'] = availability

        # Add to final location array
        locations_array.append(l)

    r['locations'] = locations_array

    return JsonResponse(r)

