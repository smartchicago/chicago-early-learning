from django.template import RequestContext
from django.shortcuts import render_to_response, get_object_or_404
from django.views.decorators.cache import cache_control
from django.db.models import Q
from django.contrib.gis.measure import Distance
from django.contrib.gis.geos import GEOSGeometry
from django.conf import settings
from models import Location
import logging, hashlib
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

def index(request):
    fields = Location.get_boolean_fields()

    ctx = RequestContext(request, {
        'fields':fields
    })

    response = render_to_response('index.html', context_instance=ctx)

    # cookie for splash screen, defaults to true
    try:
        show_splash = request.COOKIES['show_splash']
    except:
        show_splash = 'true'
    expires = datetime.utcnow() + timedelta(seconds=60 * 60)

    response.set_cookie('show_splash', show_splash, expires=expires, httponly=False)

    return response

def location_details(location_id):
    """
    Helper method that gets all the fields for a specific location.

    This is called by the detail page and the comparison page.
    """
    item = get_object_or_404(Location, id=location_id)

    simple_text = [
        'ages', 'prg_dur', 'prg_sched', 'site_affil', 
        'ctr_director', 'exec_director', 'accred']

    # simple fields to present -- these are the attributes that have text content
    sfields = []

    # boolean fields to present -- these are the attributes that are set to True
    bfields = [] 

    for field in Location._meta.fields:
        # get boolean fields that are set, and set to True
        if field.get_internal_type() == 'NullBooleanField' and \
            getattr(item, field.get_attname()):
                bfields.append(field.verbose_name)
        # get char fields & values if they are listed above, and not empty
        elif field.get_internal_type() == 'CharField' or field.get_internal_type() == 'TextField':
            for simple in simple_text:
                if field.get_attname() == simple: 
                    sfields.append( (field.verbose_name, getattr(item, field.get_attname()),) )

    return { 'item': item, 'sfields': sfields, 'bfields': bfields }

def segment_info(ldet1, ldet2):
    """
    Segment the detailed information into discrete chunks.

    Parameters:
        ldet1 - The results from location_details for one location
        ldet2 - The results from location_details for the other location

    Returns:
        The segments of the display, with contents of ldet1 
        interleaved with ldet2
    """
    segments = {}

    segments.update({
        'name': (ldet1['item'].site_name, ldet2['item'].site_name,),
        'address': (ldet1['item'].address, ldet2['item'].address,),
        'city': (ldet1['item'].city, ldet2['item'].city,),
        'state': (ldet1['item'].state, ldet2['item'].state,),
        'zip': (ldet1['item'].zip, ldet2['item'].zip,),
        'url': (ldet1['item'].url, ldet2['item'].url,),
        'email': (ldet1['item'].email, ldet2['item'].email,),
        'phone1': (ldet1['item'].phone1, ldet2['item'].phone1,),
        'phone2': (ldet1['item'].phone2, ldet2['item'].phone2,),
        'phone3': (ldet1['item'].phone3, ldet2['item'].phone3,),
        'fax': (ldet1['item'].fax, ldet2['item'].fax,)
    })
    segments.update({'bfields': (ldet1['bfields'], ldet2['bfields'],)})
    segments.update({'sfields_zip': zip(ldet1['sfields'], ldet2['sfields'])})

    return segments

def location(request, location_id):
    """
    Render a detail page for a single location.
    """
    context = location_details(location_id)

    tpl = 'location.html'
    if 'm' in request.GET:
        if request.GET['m'] == 'html':
            tpl = 'embed.html'
        elif request.GET['m'] == 'popup':
            tpl = 'popup.html'

    context.update(is_popup=(tpl == 'popup.html'))
    context.update(is_embed=(tpl == 'embed.html'))

    context = RequestContext(request, context)

    return render_to_response(tpl, context_instance=context)


@cache_control(must_revalidate=False, max_age=3600)
def location_list(request):
    """
    Get a list of all the locations.
    """
    etag_hash = 'empty' 
    item_filter = None
    for f in request.GET:
        for field in Location._meta.fields:
            if field.get_attname() == f:
                logger.debug('Adding Filter: %s = %s' % (f, request.GET[f],))
                kw = { f: request.GET[f]=='true' }
                if item_filter is None:
                    etag_hash = str(kw)
                    item_filter = Q(**kw)
                else:
                    etag_hash += str(kw)
                    item_filter = item_filter | Q(**kw)

    if 'pos' in request.GET and 'rad' in request.GET:
        if request.GET['rad'] != '-1':
            geom = GEOSGeometry('POINT(%s)' % request.GET['pos'])
            rad_filter = Q(geom__distance_lte=(geom, Distance(mi=request.GET['rad'])))
            if item_filter is None:
                item_filter = rad_filter
            else:
                item_filter = item_filter & rad_filter

    if item_filter is None:
        items = list(Location.objects.all())
    else:
        items = list(Location.objects.filter(item_filter))

    logger.debug('Retrieved %d items.' % len(items))

    # compute this filter combination's hash
    md5 = hashlib.md5()
    md5.update(etag_hash)
    etag_hash = md5.hexdigest()

    rsp = render_to_response('locations.json', {'items':items}, mimetype='application/json')
    rsp['Etag'] = etag_hash
    return rsp

def compare(request, a, b):
    loc_a = location_details(a)
    loc_b = location_details(b)

    tpl = 'compare.html'
    if 'm' in request.GET and request.GET['m'] == 'embed':
        tpl = 'compare_content.html'

    locs = segment_info(loc_a, loc_b)

    ctx = RequestContext(request, { 
        'locations': locs
    })

    return render_to_response(tpl, context_instance=ctx)


def about(request):
    return render_to_response('about.html', context_instance=RequestContext(request))


def faq(request):
    return render_to_response('faq.html', context_instance=RequestContext(request))


