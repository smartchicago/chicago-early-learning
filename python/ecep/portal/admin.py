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
        js = ('http://maps.googleapis.com/maps/api/js?key=%s&sensor=false&language=%s' % (settings.GOOGLE_MAPS_KEY, settings.LANGUAGE_CODE), 'js/admin-map.js')

    list_display = ('site_name', 'id',)
    search_fields = ['site_name']
    form = LocationForm
    fieldsets = [
        (None,      {'fields': ['site_name']}),
        ('Address', {'fields': [('address', 'city',), ('state', 'zip'), 'geom']}),
        ('Contact', {'fields': ['phone1', 'phone2', 'phone3', 'fax', 'url', 'email']}),
        ('Flags',   {'fields': ['is_child_care', 'is_hs', 'is_ehs', 'is_pre4all', 
            'is_tuition_based', 'is_special_ed', 'is_montessori', 
            'is_child_parent_center', 'is_age_lt_3', 'is_age_gt_3']}),
        ('Other',   {'fields': ['exec_director', 'ctr_director', 'site_affil', 'q_stmt',
            'e_info', 'as_proc', 'accred', 'prg_sched', 'prg_dur', 'ages', 'waitlist']}),
    ]


admin.site.register(Location, LocationAdmin)

