from django.conf import settings
from django.conf.urls import patterns, include, url
from django.conf.urls.i18n import i18n_patterns
from django.conf.urls.static import static

from django.views.generic import TemplateView, RedirectView
from sitemap import LocationSiteMap, StaticViewSitemap
from django.contrib.gis import admin
admin.autodiscover()

js_info_dict = {
    'domain': 'djangojs',
    'packages': ('portal',),
}

from portal.views import *

sitemaps = {'location': LocationSiteMap, 'static': StaticViewSitemap}

urlpatterns = patterns(
    '',
    # Index page is in the 'portal' app
    #url(r'^$', Index.as_view(), name='index'),
    #url(r'^about$', About.as_view(), name='about'),
    #url(r'^updates$', Updates.as_view(), name='updates'),
    #url(r'^city-resources$', CityResources.as_view(), name='city-resources'),
    #url(r'^how-to-apply$', HowToApply.as_view(), name='how-to-apply'),
    #url(r'^connect$', Connect.as_view(), name='connect'),
    #url(r'^announcements$', Announcements.as_view(), name='announcements'),
    #url(r'^outreach$', OutreachRedesign.as_view(), name='outreach'),
    url(r'^robots\.txt$', TemplateView.as_view(template_name='robots.txt', content_type="text/plain")),
    url(r'^favicon\.ico$', RedirectView.as_view(url='/static/img/favicons/favicon.ico')),

    # Redesign testing ground
    #url(r'^family-resource-centers',  FamilyResourceCenters.as_view(), name='family-resource-centers'),
    #url(r'^faq$', FAQ.as_view(), name='faq'),
    #url(r'^families$', Programs.as_view(), name='families'),
    #url(r'^programs$', Programs.as_view(), name='programs'),
    #url(r'^resources$', Resources.as_view(), name='resources'),

    # Search
    url(r'search/', Search.as_view(), name="search"),

    # Blog
    #url(r'^blog/$', Blog.as_view(), name="blog"),
    #url(r'^blog/hughes-library$', Blog.as_view(), name="blog-hughes"),

    # portal autocomplete api
    url(r'^api/autocomplete/$', 'portal.views.portal_autocomplete'),

    # Enroll
    #url(r'enroll/?$', HowToApply.as_view(), name='enroll-faq'),

    # Location Views
    # Need to pass id to view for sitemap, but don't need to do anything with it since this is handled with javascript
    url(r'^location/(\d+)/$', 'portal.views.location', name='location-view'),
    url(r'^location/(?P<location_id>\d+)/$', 'portal.views.location', name='location-view'),
    url(r'^location/(?P<location_id>\d+)/(?P<slug>[\w-]+)/$', 'portal.views.location', name='location-view'),
    url(r'^map/(\d+)/$', 'portal.views.location_map', name='location-map-view'),

    # Starred Location Views
    url(
        r'^starred/?[0-9,]*/$',
        Starred.as_view(),
        name='starred',
    ),
    url(
        r'^favorites/?[0-9,]*/$',
        Starred.as_view(),
        name='favorites',
    ),

    # i18n
    url(r'^jsi18n/$', 'django.views.i18n.javascript_catalog', kwargs=js_info_dict, name='javascript-catalog'),
    url(r'^rosetta/', include('rosetta.urls')),
    url(r'^i18n/(?P<language>.+)/$', 'portal.views.setlang', name='setlang'),

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
    url(r'^api/map/json/$', 'portal.views.api_map_json'),

    # Neighborhood API
    url(r'^api/neighborhood/$', 'portal.views.neighborhood_api'),
)

if settings.DEBUG:
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_URL)
