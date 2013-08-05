# Sitemap Settings
# Note - You need to set the site in the admin
# in order to have the correct URLs in the sitemap

from django.contrib import sitemaps
from django.core.urlresolvers import reverse

from portal.models import Location


class LocationSiteMap(sitemaps.Sitemap):
    """
    Sitemap for individual location views
    """
    changefreq = 'weekly'
    priority = 0.5

    def items(self):
        return Location.objects.all()

    def location(self, item):
        return reverse('location-view', args=(item.id,))


class StaticViewSitemap(sitemaps.Sitemap):
    """
    Sitemaps for index, about, faq, and browse pages
    """
    changefreq = 'weekly'
    priority = 0.5

    def items(self):
        return ['index', 'about', 'faq', 'browse']

    def location(self, item):
        return reverse(item)

