from django.conf import settings as ds


def analytics(request):
    return { 'ga_key': ds.GA_KEY }


def settings(request):
    return { 'settings': ds }
