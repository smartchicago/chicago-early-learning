from django.conf.urls.defaults import patterns, include, url

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
    url(r'^compare/(?P<a>\d+)/(?P<b>\d+)/$', 'portal.views.compare'),

    # Admin interface
    url(r'^admin/', include(admin.site.urls)),
)
