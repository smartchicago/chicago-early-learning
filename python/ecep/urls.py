# Copyright (c) 2012, 2013 Azavea, Inc.
# See LICENSE in the project root for copying permission
from django.conf import settings
from django.conf.urls import patterns, include, url
from django.conf.urls.i18n import i18n_patterns
from django.conf.urls.static import static

from portal.sms import Sms, Conversation, SmsCallback
from django.views.generic import TemplateView, RedirectView
from sitemap import LocationSiteMap, StaticViewSitemap
from django.contrib.gis import admin
admin.autodiscover()

js_info_dict = {
    'domain': 'djangojs',
    'packages': ('portal',),
}

from portal import views as portal_views

sitemaps = {'location': LocationSiteMap, 'static': StaticViewSitemap}

urlpatterns = patterns(
    '',
    # Index page is in the 'portal' app
    url(r'^$', portal_views.Index.as_view(), name='index'),
    url(r'^about$', portal_views.About.as_view(), name='about'),
    url(r'^updates$', portal_views.Updates.as_view(), name='updates'),
    url(r'^families$', portal_views.Families.as_view(), name='families'),
    url(r'^city-resources$', portal_views.CityResources.as_view(), name='city-resources'),
    url(r'^how-to-apply$', portal_views.HowToApply.as_view(), name='how-to-apply'),
    url(r'^connect$', portal_views.Connect.as_view(), name='connect'),
    url(r'^robots\.txt$', TemplateView.as_view(template_name='robots.txt', content_type="text/plain")),
    url(r'^favicon\.ico$', RedirectView.as_view(url='/static/img/favicon.ico')),
    
    # browse page
    url(r'^search/$', 'portal.views.browse', name='browse'),

    # portal autocomplete api
    url(r'^api/autocomplete/$', 'portal.views.portal_autocomplete'),

    # Telephony
    url(r'^sms/handler/?$', Sms.as_view()),
    url(r'^sms/error/?$', 'django_twilio.views.sms', {
        'message': Conversation.FATAL,
        'method': 'POST',
        # Due to a bug in django-twilio, method must be set to GET or POST
        # it works no matter what the request is
        }),
    url(r'^sms/callback/?$', SmsCallback.as_view(), name='sms-callback'),

    # sms info page
    url(r'^sms/?$', portal_views.SMSInfo.as_view(), name='sms-info'),

    # Contact
    url(r'^contact/(?P<location_ids>[0-9,]*)/$', 'portal.views.contact', name='contact'),
    url(
        r'^contact-thanks/$',
        TemplateView.as_view(template_name='contact_thanks.html'),
    ),

    # Enroll
    url(r'enroll/?$', portal_views.HowToApply.as_view(), name='enroll-faq'),
    #url(r'enroll/plan/(?P<pk>\d+)/$', portal_views.enroll_plan, name='enroll-plan'),

    # Location Views
    # Need to pass id to view for sitemap, but don't need to do anything with it since this is handled with javascript
    url(r'^location/(\d+)/$', 'portal.views.location', name='location-view'),
    url(r'^location/(?P<location_id>\d+)/(?P<slug>[\w-]+)/$', 'portal.views.location', name='location-view'),
    url(r'^location/(?P<location_id>\d+)/(?P<slug>[\w-]+)/$', 'portal.views.location', name='location-view'),

    # Starred Location Views
    url(
        r'^starred/?[0-9,]*/$',
        portal_views.Starred.as_view(),
        name='starred',
    ),
    url(
        r'^favorites/?[0-9,]*/$',
        portal_views.Starred.as_view(),
        name='favorites',
    ),

    # i18n
    url(r'^jsi18n/$', 'django.views.i18n.javascript_catalog', kwargs=js_info_dict, name='javascript-catalog'),
    url(r'^rosetta/', include('rosetta.urls')),
    url(r'^i18n/(?P<language>.+)/$', 'portal.views.setlang', name='setlang'),
    url(r'^faq$', 'portal.views.faq', name='faq'),

    # Admin interface
    url(r'^admin/', include(admin.site.urls)),

    # Sitemaps
    url(r'^sitemap\.xml$', 'django.contrib.sitemaps.views.sitemap', {'sitemaps': sitemaps}),
)

urlpatterns += i18n_patterns(
    '',

    # Location API
    url(r'^api/location/(?P<location_ids>[0-9,]*)/$', 'portal.views.location_api'),
    url(r'^api/location/$', 'portal.views.location_api'),
    url(r'^api/location/json/$', 'portal.views.location_json_api'),
    url(r'^api/starred-location/(?P<location_ids>[0-9,]*)/$', 'portal.views.starred_location_api'),

    # Neighborhood API
    url(r'^api/neighborhood/$', 'portal.views.neighborhood_api'),
)

if settings.DEBUG:
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_URL)