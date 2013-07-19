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
    url(r'^about.html$', 'portal.views.about', name='about'),
    url(r'^search.html$', 'portal.views.search', name='search'),
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
    url(r'^location/(?P<location_id>\d+)/$', 'portal.views.location'),
    url(r'^location/(?P<location_id>\d+)/position/$', 'portal.views.location_position'),

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
