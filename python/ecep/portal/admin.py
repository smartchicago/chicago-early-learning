# Copyright (c) 2012, 2013 Azavea, Inc.
# See LICENSE in the project root for copying permission

from portal.models import Location, LocationEdit
from django.contrib.gis import admin
from django import forms
from portal.widgets import MapWidget
from django.contrib.gis.geos import Point
import re
from django.conf import settings
from django.http import HttpResponseRedirect
from django.conf.urls.defaults import patterns, url
from django.shortcuts import get_object_or_404
from django.contrib import messages
from django.core.urlresolvers import reverse
from django.contrib.admin import SimpleListFilter
from django.utils.translation import ugettext_lazy as _

class PendingEditsFilter(SimpleListFilter):
    """
    Adds a pending edits filter for location view
    """
    title = 'Pending Edits'
    parameter_name = 'pending'

    def lookups(self, request, model_admin):
        return(
            ('True', _('Yes')),
        )

    def queryset(self, request, queryset):
        if self.value() == 'True':
            return queryset.filter(locationedit__pending=True).distinct()


class LocationForm(forms.ModelForm):
    """Form subclass for location model form to use custom widget for google map
    and a custom clean method to properly handle points passed in as strings
    """

    geom = forms.CharField(label="Geocoded Point", widget=MapWidget())
    
    def __init__(self, *args, **kwargs):
        """
        Override __init__ method to add custom classes to fields based on whether
        or not the field has been edited and what type of edit was made.
        """
        super(LocationForm,self).__init__(*args, **kwargs)
        edits = self.instance.locationedit_set.filter(pending=True)
        bools = self.instance.get_boolean_fieldnames()

        # Loop through edits and apply classes to fields for highlighting
        for edit in edits.filter(edit_type='update'):
            if edit.fieldname in bools:
                edit.new_value = True if edit.new_value == 'True' else False
            self.initial[edit.fieldname] = edit.new_value
            field = self.fields[edit.fieldname]
            field.widget.attrs['class'] = edit.edit_type
        if edits.filter(edit_type='delete'):
            # If edit type is delete, all fields are red
            for field in self.fields.values():
                field.widget.attrs['class'] = 'delete'
        if edits.filter(edit_type='create'):
            # If edit type is create, all fields are green
            for field in self.fields.values():
                field.widget.attrs['class'] = 'create'

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

    # General Settings
    # Template override that adds buttons to propose/accept changes
    change_form_template = 'admin/portal/location/change_form.html'
    delete_confirmation_template = 'admin/portal/location/delete_confirmation.html'
    save_on_top = True
    save_on_bottom = False
    list_display = ['site_name', 'address', 'zip', 'phone', 'id', 'accepted']
    base_list_filter = ['is_hs', 'is_ehs', 'accept_ccap', 'is_cps_based', 'is_community_based',
                   'is_age_lt_3', 'is_age_gt_3', 'is_full_day', 'is_full_week', 'is_full_year',
                   'is_part_day', 'is_part_week', 'is_school_year', 'is_home_visiting']
    search_fields = ['site_name', 'address', 'zip', 'language_1', 'language_2', 'language_3']
    readonly_fields = ['neighborhood']
    form = LocationForm
    fieldsets = [
        (None,      {'fields': ['site_name', 'neighborhood']}),
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

    def _delete_messages(self, request):
        """
        Helper method to delete messages currently queued.
        Used to delete pending messages so that there are no
        duplicates or prior to customize them.
        """
        existing_messages = messages.get_messages(request)
        for counter, message in enumerate(existing_messages._queued_messages):
            del existing_messages._queued_messages[counter]

    def _is_edit_admin(self, user):
        """
        Helper function to check whether a user belongs to group
        with with edit admin privileges.

        Returns true if user is superuser or part of group approve_edit.
        """
        return user.is_superuser or len(user.groups.filter(name='approve_edit')) > 0

    class Media:
        css = { 'all': ('css/admin-map.css',)}
        js = ('http://maps.googleapis.com/maps/api/js?key=%s&sensor=false&language=%s' % (settings.GOOGLE_MAPS_KEY, settings.LANGUAGE_CODE), 'js/admin-map.js', "//ajax.googleapis.com/ajax/libs/jquery/1.10.2/jquery.min.js")

    def changelist_view(self, request, extra_context=None):
        """
        Override changelist_view in order to limit display of pending edits and pending additions
        to Admin user
        """
        extra_context = extra_context or {}
        extra_context['is_edit_admin'] = self._is_edit_admin(request.user)
        # Need to set list_filter each time else PendingEdits gets added
        # multiple times
        self.list_filter = self.base_list_filter
        if self._is_edit_admin(request.user):
            self.list_filter = [PendingEditsFilter, 'accepted'] + self.list_filter
        return super(LocationAdmin,self).changelist_view(request, extra_context=None)

    def get_urls(self):
        """
        Override of get_urls to add custom admin views to handle the following situations
        - Reject pending updates
        """
        urls = super(LocationAdmin,self).get_urls()
        location_urls = patterns(
            '',
            url(r'^reject_updates/(\d+)/$', self.admin_site.admin_view(self.reject_updates), name='reject_updates'),
        )
        return location_urls + urls

    def render_change_form(self, request, context, add=False, change=False, form_url='', obj=None):
        """
        Override rendering of change form in order to display custom warnings based on user type
        and existing edits on the object.
        """
        context = context or {}
        context['is_edit_admin'] = self._is_edit_admin(request.user)
        response = super(LocationAdmin,self).render_change_form(request, context, add=False, change=False,
                                                                form_url='', obj=None)
        object_id = context.get('object_id', None)
        if not object_id:
            # We are in an add form then
            return response
        obj = Location.objects.get(pk=context['object_id'])
        edits = obj.locationedit_set.filter(pending=True)
        if not self._is_edit_admin(request.user) and len(edits) > 0:
            # If not a review edit page (ie not superuser) and edits pending,
            # warn user that edits will be overwritten
            messages.warning(request, 'Warning! There are pending edits on this school. Any further edits on those fields will overwrite those edits.')
        if self._is_edit_admin(request.user) and len(edits.filter(edit_type='delete')) > 0:
            # Warn admin that accepting changes will delete this object
            messages.warning(request, 'Warning! Accepting changes without further edits will delete this school from the database.')
        return response

    def response_change(self, request, obj):
        """
        Override response_change in order to customize response messages for submitting changes for review
        """
        # Prevent warning messages from displaying twice when edit already exists
        self._delete_messages(request)
        if '_proposechanges' in request.POST:
            self.message_user(request, 'Changes successfully added for %s, waiting for review by administrator.'
                              % obj.site_name)
            return HttpResponseRedirect(reverse('admin:portal_location_changelist'))
        else:
            return super(LocationAdmin,self).response_change(request, obj)

    def response_add(self, request, obj, post_url_continue='../%s/'):
        """
        Override message response if user is not a member of approve_edit group and only proposing to add a school
        """
        response = super(LocationAdmin,self).response_add(request, obj, post_url_continue=post_url_continue)
        if not self._is_edit_admin(request.user):
            self._delete_messages(request)
            self.message_user(request, 'Submitted adding of %s for review by administrator.' % obj.site_name)
        return response

    def save_model(self, request, obj, form, change):
        """
        Override of save_model so that upon saving updates all pending edits are marked
        as reviewed.

        If a normal user tries to save/edit a location, this method creates
        a set of LocationEdit objects that represent an edit for each fieldname.
        """
        if self._is_edit_admin(request.user):
            if len(obj.locationedit_set.filter(pending=True, edit_type='delete')) > 0 and len(form.changed_data) == 0:
                # If reviewing a proposed delete and reviewer did not change anything on the page
                obj.delete()
            else:
                obj.accepted = True
                super(LocationAdmin,self).save_model(request, obj, form, change)
            obj.locationedit_set.update(pending=False)
        else:
            edit_type = 'update'
            if obj.pk == None:
                obj.accepted = False
                edit_type = 'create'
                obj.save()
            for changed_data in form.changed_data:
                # Set pending edits on those fields to pending=false (they are overwritten)
                obj.locationedit_set.filter(fieldname=changed_data, pending=True).update(pending=False)
                LocationEdit(user=request.user,
                         location=obj,
                         fieldname=changed_data,
                         new_value=form.cleaned_data[changed_data],
                         edit_type=edit_type).save()
        
    def delete_model(self, request, obj):
        """
        Override delete_model so that only user in approve_edit group can delete a location.

        If a normal user tries to delete a location, creates a LocationEdit object
        that represents a delete edit.
        """
        if self._is_edit_admin(request.user):
            super(LocationAdmin,self).delete_model(request, obj)
        else:
            LocationEdit(user=request.user, location=obj, fieldname='',
                         new_value='', edit_type='delete').save()

    def delete_view(self, request, object_id, extra_context=None):
        """
        Override delete_view in order to display custom message to non-admins
        """
        extra_context = extra_context or {}
        extra_context['is_edit_admin'] = self._is_edit_admin(request.user)
        resp = super(LocationAdmin,self).delete_view(request, object_id, extra_context=None)
        if not self._is_edit_admin(request.user) and 'post' in request.POST:
            self._delete_messages(request)
            obj = get_object_or_404(Location, pk=object_id)
            self.message_user(request, 'Delete proposed for for %s, waiting for review by administrator.' % obj.site_name)
        return resp

    # Custom View #
    def reject_updates(self, request, object_id):
        """
        Custom admin view to reject pending changes on an object.

        Redirects to changelist view with message on how many pending changes were rejected.
        """
        obj = get_object_or_404(Location, pk=object_id)
        num_pending_edits = obj.locationedit_set.filter(pending=True).count()
        obj.locationedit_set.update(pending=False)
        self.message_user(request, '%s pending edits rejected for %s.' %(num_pending_edits, obj.site_name))
        return HttpResponseRedirect(reverse('admin:portal_location_changelist'))
        

    
admin.site.register(Location, LocationAdmin)
