from django.template import Context, loader
from django.shortcuts import render_to_response, get_object_or_404
from django.views.decorators.cache import cache_control
from django.db.models import Q
from models import Location
import logging, hashlib

logger = logging.getLogger(__name__)


def index(request):
    fields = Location.get_boolean_fields()
    return render_to_response('index.html', { 'fields':fields })


def location(request, location_id):
    """
    Render a detail page for a single location.
    """
    item = get_object_or_404(Location, id=location_id)

    simple_text = [
        'n_classrooms', 'prg_dur', 'prg_size', 'prg_sched', 'site_affil', 
        'ctr_director', 'exec_director', 'q_stmt', 'e_info', 'as_proc', 'accred',
        'waitlist']

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
                if field.get_attname() == simple and \
                    getattr(item, field.get_attname()) is not None and \
                    getattr(item, field.get_attname()) != '':
                        sfields.append( (field.verbose_name, getattr(item, field.get_attname()),) )

    tpl = 'location.html'
    if 'm' in request.GET:
        if request.GET['m'] == 'html':
            tpl = 'embed.html'
        elif request.GET['m'] == 'popup':
            tpl = 'popup.html'

    return render_to_response(tpl, {
        'item': item, 
        'bfields': bfields, 
        'sfields': sfields, 
        'is_popup': tpl == 'popup.html',
        'is_embed': tpl == 'embed.html'
    })


@cache_control(must_revalidate=False, max_age=30)
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


def about(request):
    return render_to_response('about.html')


def faq(request):
    return render_to_response('faq.html')

