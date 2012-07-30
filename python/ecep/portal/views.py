# Create your views here.

from django.template import Context, loader
from django.http import HttpResponse

#This doesn't work for some reason, will figure out later
#def simple_response(template):
    #"""
    #Dead simple handler for rendering a template

    #template: The path to the template to render
    #"""

    #t = loader.get_template(template)
    #c = Context({ })
    #return HttpResponse(t.render(c))

def index(request):
    t = loader.get_template('index.html')
    c = Context({ })
    return HttpResponse(t.render(c))
    #return simple_resonse('index.html')

def about(request):
    t = loader.get_template('about.html')
    c = Context({ })
    return HttpResponse(t.render(c))
    #return simple_resonse('about.html')

def faq(request):
    t = loader.get_template('faq.html')
    c = Context({ })
    return HttpResponse(t.render(c))
    #return simple_resonse('faq.html')

