from django.conf import settings

def analytics(request):
    return { 'ga_key': settings.GA_KEY }
