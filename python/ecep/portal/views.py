from django.template import Context, loader
from django.shortcuts import render_to_response, get_object_or_404
from django.views.decorators.cache import cache_control
from django.db.models import Q
from models import Location
import logging

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

@cache_control(must_revalidate=False, max_age=30)
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

    rsp = render_to_response('locations.json', {'items':items}, mimetype='application/json')
    rsp['Etag'] = 'v1.0'
    return rsp


def about(request):
    return render_to_response('about.html')


def faq(request):
    return render_to_response('faq.html')

