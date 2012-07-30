from django.template import Context, loader
from django.shortcuts import render_to_response, get_object_or_404
from django.http import HttpResponse
from models import Location


def index(request):
    return render_to_response('index.html')

def location(request, location_id):
    loc = get_object_or_404(Location, id=location_id)

    simple_text = [
        'n_classrooms', 'prg_dur', 'prg_size', 'prg_sched', 'site_affil', 
        'ctr_director', 'exec_director', 'q_stmt', 'e_info', 'as_proc', 'accred']

    # simple fields to present -- these are the attributes that have text content
    sfields = []

    # boolean fields to present -- these are the attributes that are set to True
    bfields = [] 

    for field in Location._meta.fields:
        if field.get_internal_type() == 'NullBooleanField' and \
            getattr(loc, field.get_attname()):
                bfields.append(field.verbose_name)
        elif field.get_internal_type() == 'CharField' or field.get_internal_type() == 'TextField':
            for simple in simple_text:
                if field.get_attname() == simple and \
                    getattr(loc, field.get_attname()) is not None and \
                    getattr(loc, field.get_attname()) != '':
                        sfields.append( (field.verbose_name, getattr(loc, field.get_attname()),) )

    return render_to_response('location.html', {'model': loc, 'bfields': bfields, 'sfields': sfields })

def about(request):
    return render_to_response('about.html')

def faq(request):
    return render_to_response('faq.html')

