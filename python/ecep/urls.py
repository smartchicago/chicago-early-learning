from django.conf.urls.defaults import patterns, include, url

# Uncomment the next two lines to enable the admin:
from django.contrib.gis import admin
admin.autodiscover()

urlpatterns = patterns('',
    # Examples:
    #url(r'^$', 'views.home', name='home'),
    url(r'^$', 'portal.views.index'),
    url(r'^about.html$', 'portal.views.about'),
    url(r'^faq.html$', 'portal.views.faq'),

    # Uncomment the next line to enable the admin:
    url(r'^admin/', include(admin.site.urls)),
)
