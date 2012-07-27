from django.conf.urls.defaults import patterns, include, url

from django.contrib.gis import admin
admin.autodiscover()

urlpatterns = patterns('',
    # Index page is in the 'portal' app
    url(r'^$', 'portal.views.index'),

    # Verbose details about a location
    url(r'^location/(?P<location_id>\d+)/$', 'portal.views.location'),

    # Admin interface
    url(r'^admin/', include(admin.site.urls)),
)
