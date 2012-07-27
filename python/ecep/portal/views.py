from django.template import Context, loader
from django.shortcuts import render_to_response, get_object_or_404
from models import Location

def index(request):
    return render_to_response('index.html', {})

def location(request, location_id):
    loc = get_object_or_404(Location, id=location_id)
    return render_to_response('location.html', {'model': loc})
