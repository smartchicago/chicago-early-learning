# Copyright (c) 2012 Azavea, Inc.
# See LICENSE in the project root for copying permission

from portal.models import Location
from django.contrib.gis import admin
from django import forms
from portal.widgets import MapWidget
from django.contrib.gis.geos import Point
import re
from django.conf import settings

class LocationForm(forms.ModelForm):
    """Form subclass for location model form to use custom widget for google map
    and a custom clean method to properly handle points passed in as strings
    """
    
    geom = forms.CharField(label="Geocoded Point", widget=MapWidget())
    
    def get_point(self, geom_string):
        """Takes a geom_string from cleaned_data and converts it to a point
        object. If unable to convert, raises a validation error.
        
        Arguments:
        - `geom_string`: string returned by the 'geom' input from the LocationForm
        Takes the form of 'POINT (<LNG> <LAT>)'
        """

        try:
            split_geom_string = re.findall(r'([-.\w]+)', geom_string)
            lng = float(split_geom_string[1])
            lat = float(split_geom_string[2])
            return Point(lng, lat)
        except (IndexError, ValueError):
            raise forms.ValidationError("Invalid point specified for location")
    
    def clean(self):
        """
        Need to create a Point object from string returned by form because
        of the way the map fills in the geocoded location form
        """

        self.cleaned_data = super(LocationForm, self).clean()

        try:
            self.cleaned_data['geom'] = self.get_point(self.cleaned_data['geom'])
            return self.cleaned_data
        except forms.ValidationError:
            # Need to pass a dummy point if invalid, or we get a 500 error
            # This point does not get saved, nothing happens to it
            self.cleaned_data['geom'] = Point(0, 0)
            raise forms.ValidationError("Invalid point specified for location")

    class Meta:
        model = Location

        
class LocationAdmin(admin.OSMGeoAdmin):

    class Media:
        css = { 'all': ('css/admin-map.css',)}
        js = ('http://maps.googleapis.com/maps/api/js?key=%s&sensor=false&language=%s' % (settings.GOOGLE_MAPS_KEY, settings.LANGUAGE_CODE), 'js/admin-map.js', 'js/jquery.js')

    list_display = ('site_name', 'address', 'zip', 'phone', 'id',)
    list_filter = ('is_hs', 'is_ehs', 'accept_ccap', 'is_cps_based', 'is_community_based',
                   'is_age_lt_3', 'is_age_gt_3', 'is_full_day', 'is_full_week', 'is_full_year',
                   'is_part_day', 'is_part_week', 'is_school_year', 'is_home_visiting')
    search_fields = ['site_name', 'address', 'zip', 'language_1', 'language_2', 'language_3']
    form = LocationForm
    fieldsets = [
        (None,      {'fields': ['site_name']}),
        ('Address', {'fields': [('address', 'city'), ('state', 'zip'), 'geom']}),
        ('Contact', {'fields': ['phone', 'url']}),
        ('Hours/Duration', {'fields': [('is_full_day', 'is_part_day'),
                                       ('is_full_week', 'is_part_week'),
                                       ('is_school_year', 'is_full_year')]}),
        ('Flags',   {'fields': [('is_age_lt_3', 'is_age_gt_3'),
                                ('is_community_based', 'is_cps_based'),
                                ('is_hs', 'is_ehs'), 'accept_ccap']}),
        ('Other',   {'fields': [('ages', 'prg_hours', 'accred'),
                                ('language_1', 'language_2', 'language_3'),
                                'q_stmt']}),
    ]


admin.site.register(Location, LocationAdmin)

