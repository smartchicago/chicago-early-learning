# Copyright (c) 2012 Azavea, Inc.
# See LICENSE in the project root for copying permission

from django.conf.urls.defaults import patterns, include, url
from django.conf.urls.i18n import i18n_patterns
from portal.sms import Sms, Conversation, SmsCallback
from django.views.generic.simple import direct_to_template

from django.contrib.gis import admin
admin.autodiscover()

js_info_dict = {
    'domain': 'djangojs',
    'packages': ('portal',),
}

urlpatterns = patterns(
    '',
    # Index page is in the 'portal' app
    url(r'^$', 'portal.views.index'),
    url(r'^about$', 'portal.views.about', name='about'),
    url(r'^search.html$', 'portal.views.search', name='search'),
    url(r'^browse/$', 'portal.views.browse', name='browse'),
    url(r'^robots\.txt$', direct_to_template,
        {'template': 'robots.txt', 'mimetype': 'text/plain'}),
    url(r'^favicon\.ico$', 'django.views.generic.simple.redirect_to',
        {'url': '/static/images/favicon.ico'}),

    # portal autocomplete api
    url(r'^api/autocomplete/(?P<query>\S+)/$', 'portal.views.portal_autocomplete'),

    # Telephony
    url(r'^sms/handler/?$', Sms.as_view()),
    url(r'^sms/error/?$', 'django_twilio.views.sms', {
        'message': Conversation.FATAL,
        'method': 'POST',
        # Due to a bug in django-twilio, method must be set to GET or POST
        # it works no matter what the request is
        }),
    url(r'^sms/callback/?$', SmsCallback.as_view(), name='sms-callback'),

    # Location Views
    # Don't need to pass id to view since this is handled with javascript
    url(r'^location/\d+/$', 'portal.views.location'),
    url(r'^api/location/(?P<location_id>\d+)/$', 'portal.views.location_api'),
    url(r'^api/location/$', 'portal.views.location_api'),
    
    # Neighborhood Views
    url(r'^api/neighborhood/$', 'portal.views.neighborhood_api'),

    # Starred Location Views
    url(r'^starred/?[0-9,]*/$', 'portal.views.starred'),

    # i18n
    url(r'^jsi18n/$', 'django.views.i18n.javascript_catalog', js_info_dict),
    url(r'^rosetta/', include('rosetta.urls')),
    url(r'^setlang/(?P<language>.+)/$', 'portal.views.setlang', name='setlang'),


    # Admin interface
    url(r'^admin/', include(admin.site.urls)),
)

urlpatterns += i18n_patterns(
    '',
    url(r'^faq.html$', 'portal.views.faq', name='faq'),
)
