from django.conf.urls.defaults import patterns, include, url
from portal.sms import Sms, Conversation, SmsCallback
from django.views.generic.simple import direct_to_template

from django.contrib.gis import admin
admin.autodiscover()

urlpatterns = patterns(
    '',
    # Index page is in the 'portal' app
    url(r'^$', 'portal.views.index'),
    url(r'^about.html$', 'portal.views.about'),
    url(r'^faq.html$', 'portal.views.faq'),
    url(r'^robots\.txt$', direct_to_template,
        {'template': 'robots.txt', 'mimetype': 'text/plain'}),
    url(r'^favicon\.ico$', 'django.views.generic.simple.redirect_to',
        {'url': '/static/images/favicon.ico'}),

    # Verbose details about a location
    url(r'^location/$', 'portal.views.location_list'),
    url(r'^location/(?P<location_id>\d+)/$', 'portal.views.location'),
    url(r'^compare/(?P<a>\d+)/(?P<b>\d+)/$', 'portal.views.compare'),

    # Telephony
    url(r'^sms/handler/?$', Sms.as_view()),
    url(r'^sms/error/?$', 'django_twilio.views.sms', {
        'message': Conversation.FATAL,
        'method': 'POST',
        # Due to a bug in django-twilio, method must be set to GET or POST
        # it works no matter what the request is
    }),
    url(r'^sms/callback/?$', SmsCallback.as_view(), name='sms-callback'),

    # Admin interface
    url(r'^admin/', include(admin.site.urls)),
)
