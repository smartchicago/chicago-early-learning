from django.conf.urls.defaults import patterns, include, url
from portal.sms import Sms, Conversation

from django.contrib.gis import admin
admin.autodiscover()

urlpatterns = patterns('',
    # Index page is in the 'portal' app
    url(r'^$', 'portal.views.index'),
    url(r'^about.html$', 'portal.views.about'),
    url(r'^faq.html$', 'portal.views.faq'),

    # Verbose details about a location
    url(r'^location/$', 'portal.views.location_list'),
    url(r'^location/(?P<location_id>\d+)/$', 'portal.views.location'),

    # Telephony
    url(r'^sms/?$', Sms.as_view()),
    url(r'^sms_error/?$', 'django_twilio.views.sms', {
        'message': Conversation.FATAL,
        'method': 'POST',    
        # Due to a bug in django-twilio, method must be set to GET or POST
        # it works no matter what the request is
    }),

    # Admin interface
    url(r'^admin/', include(admin.site.urls)),
)
