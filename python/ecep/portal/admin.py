from portal.models import Location
from django.contrib.gis import admin

admin.site.register(Location, admin.OSMGeoAdmin)

