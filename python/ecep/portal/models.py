# Copyright (c) 2012, 2013 Azavea, Inc.
# See LICENSE in the project root for copying permission

from django.contrib.gis.db import models
from portal.templatetags.portal_extras import nicephone
from django.template.defaultfilters import title

# Model fields need to be translated lazily
from django.utils.translation import ugettext as _, ugettext_lazy as _l


class Neighborhood(models.Model):
    """Model for Neighborhoods
    Model for a Neighborhood, which is simply a geographic area with a name
    boundary -- MultiPolygon for the neighborhood
    primary_name -- Display name for the neighborhood
    secondary_name -- Detailed/Unformatted name for the neighborhood
    """
    boundary = models.MultiPolygonField()
    primary_name = models.CharField(max_length=100)
    secondary_name = models.CharField(max_length=100)
    # GeoManager is required so Django knows it can do geospatial queries to the db
    objects = models.GeoManager()

    def save(self, *args, **kwargs):
        """ Override for Model.save()
        Updates neighborhood relation for all Locations that intersect the new Neighborhood boundaries
        """
        super(Neighborhood, self).save(*args, **kwargs)

        # update location AFTER updating neighborhood polygon
        locations = Location.objects.filter(geom__intersects=self.boundary)
        for location in locations:
            # update if no neighborhood or the neighborhood is different
            if location.neighborhood is None or location.neighborhood.id != self.id:
                location.save()

    def get_center(self):
        """Returns a dictionary representation of the neighborhood's centroid.

        Used to add functionality to zoom on neighborhood when explore button clicked.
        """
        center = self.boundary.centroid.coords
        return {'lng': center[0], 'lat': center[1]}

    def __unicode__(self):
        return unicode(self.primary_name)


class Location(models.Model):
    """Model for school locations in Chicago
    """
    site_name = models.CharField('Site Name', max_length=100)
    address = models.CharField('Address', max_length=75)
    city = models.CharField('City', max_length=75)
    state = models.CharField('State', max_length=2)
    zip = models.CharField('Zip Code', max_length=10)
    neighborhood = models.ForeignKey('Neighborhood', null=True)
    phone = models.CharField(_l('Phone Number'), max_length=20, blank=True)
    q_rating = models.CharField(_l('Quality Rating'), max_length=10, blank=True)
    url = models.CharField(_l('Website'), max_length=256, blank=True)
    q_stmt = models.TextField(_l('Quality Statement'), blank=True)
    accred = models.CharField(_l('Accreditation'), max_length=100, blank=True)
    prg_hours = models.CharField(_l('Program Hours'), max_length=50, blank=True)
    is_full_day = models.NullBooleanField(_l('Full Day'))
    is_part_day = models.NullBooleanField(_l('Part Day'))
    is_full_week = models.NullBooleanField(_l('Full Week'))
    is_part_week = models.NullBooleanField(_l('Part Week'))
    is_school_year = models.NullBooleanField(_l('School Year'))
    is_full_year = models.NullBooleanField(_l('Full Year'))
    ages = models.CharField(_l('Ages Served'), max_length=50, blank=True)
    is_age_lt_3 = models.NullBooleanField(_l('Ages 0-3'))
    is_age_gt_3 = models.NullBooleanField(_l('Ages 3-5'))
    language_1 = models.CharField('Language 1 (other than English)', max_length=50, blank=True)
    language_2 = models.CharField('Language 2 (other than English)', max_length=50, blank=True)
    language_3 = models.CharField('Language 3 (other than English)', max_length=50, blank=True)
    is_community_based = models.NullBooleanField(_l('Community Based'))
    is_cps_based = models.NullBooleanField(_l('CPS Based'))
    is_home_visiting = models.NullBooleanField(_l('Home Visiting'))
    accept_ccap = models.NullBooleanField(_l('Accepts CCAP'))
    is_hs = models.NullBooleanField(_l('Head Start'))
    is_ehs = models.NullBooleanField(_l('Early Head Start'))

    # To get these placeholder fields to show up in the UI, replace
    # 'Placeholder 1' and 'Placeholder 2' in the lines below with
    # real labels, and add 'placeholder_1' and 'placeholder_2' to the
    # 'display_include' list. Also, in admin.py, browse to the
    # LocationAdmin class and add the appropriate entries to the
    # fieldsets list.
    placeholder_1 = models.TextField('Placeholder 1', blank=True)
    placeholder_2 = models.TextField('Placeholder 2', blank=True)

    geom = models.PointField('Geometry', srid=4326, null=True)
    objects = models.GeoManager()

    # List of simple/boolean fields that should be displayed by Location renderers/views
    display_include = {'ages', 'accred', 'accept_ccap', 'is_home_visiting', 'is_hs', 'is_ehs',
                       'is_community_based', 'is_cps_based'}

    def __unicode__(self):
        return unicode(self.site_name)

    def verbose_name(self, field):
        """
        Given the name of field, returns the verbose_name property for it
        """
        return unicode(self._meta.get_field_by_name(field)[0].verbose_name)

    @staticmethod
    def get_filter_fields():
        """
        Returns all boolean fields that should be used for filtering Location objects

        This method does not use a static list of names, but rather inspects
        the meta class attached to the model to introspect on the field types.
        This also has the benefit of providing the verbose name of the field.
        """

        # TODO: This relies on fields being ordered in the fields object in the
        # same order they're defined above.  This is probably a sketchy assumption.
        exclude = ['is_montessori', 'is_special_ed']

        fields = []
        for field in Location._meta.fields:
            if (field.get_internal_type() == 'NullBooleanField' and
                    not field.get_attname() in exclude):
                fields.append((field.get_attname(), _(field.verbose_name),))

        return fields

    def is_true_bool_field(self, field):
        """
        Returns true if field is a boolean field and self.field is True
        """
        fname = field.get_attname()
        return (field.get_internal_type() == 'NullBooleanField' and getattr(self, fname))

    def is_simple_field(self, field):
        """
        Returns true if field is of type CharField or TextField
        """
        ftype = field.get_internal_type()
        return ((ftype == 'CharField' or ftype == 'TextField'))

    def get_context_dict(self):
        # Fix some ugly data
        if self.site_name.isupper():
            self.site_name = title(self.site_name)
        if self.address.isupper():
            self.address = title(self.address)
        if self.city.isupper():
            self.city = title(self.city)

        item = {'address': self.address,
                'city': self.city,
                'site_name': self.site_name,
                'zip': self.zip,
                'url': self.url,
                'state': self.state,
                'key': self.pk}

        # simple fields to present -- these are the attributes that have text content
        sfields = []

        # boolean fields to present -- these are the attributes that are set to True
        bfields = []

        # Fields to include in Affiliation aggregate field
        affiliation_fields = [self._meta.get_field_by_name(name)[0] for name in
                              ['is_home_visiting', 'is_community_based', 'is_cps_based', 'is_hs', 'is_ehs']]
        program_fields = [self._meta.get_field_by_name(name)[0] for name in
                            ['is_full_year', 'is_school_year']]
        week_fields = [self._meta.get_field_by_name(name)[0] for name in
                            ['is_full_week', 'is_part_week', 'is_full_day', 'is_part_day']]

        aff_field_names = {f.get_attname() for f in affiliation_fields}

        for field in self._meta.fields:
            fname = field.get_attname()
            if not fname in self.display_include or fname in aff_field_names:
                continue

            if self.is_true_bool_field(field):
                bfields.append(field.verbose_name)
            elif self.is_simple_field(field):
                value = field.value_from_object(self)
                kv = {
                        'fieldname': _(field.verbose_name), 
                        'value': value if value else _("None")
                }
                sfields.append(kv)

        affiliation_values = [self.verbose_name(aff.get_attname()) for aff in affiliation_fields
                              if aff.value_from_object(self)]
        sfields.append({'fieldname': _('Program Information'),
                        'value': ', '.join(affiliation_values) if affiliation_values else 'None'})
        
        # Combine Languages
        lang_list = [lang for lang in self.language_1, self.language_2, self.language_3 if lang]
        languages = ", ".join(lang_list)
        if languages != '':
            sfields.append({'fieldname': _('Languages (other than English)'), 'value': languages})

        # Program Duration/Hours
        program_values = [self.verbose_name(prg.get_attname()) for prg in program_fields
                              if prg.value_from_object(self)]
        program_hours = self.prg_hours if self.prg_hours else _("No Hours Listed")
        program_values.append(program_hours)
        sfields.append({'fieldname': _('Duration/Hours'), 
                        'value': ', '.join(program_values) if program_values else 'None'})

        # Weekday Avaialability
        week_values = [self.verbose_name(wk.get_attname()) for wk in week_fields
                              if wk.value_from_object(self)]
        sfields.append({'fieldname': _('Weekday Availability'), 
                        'value': ', '.join(week_values) if week_values else 'None'})

        # Phone
        phone = {'fieldname': _('Phone Number'), 'number': nicephone(self.phone)}

        # Position
        position = {'lng': self.geom[0], 'lat': self.geom[1]}

        # Quality Statement
        if self.q_stmt:
            sfields.append({'fieldname': _('Description'), 'value': self.q_stmt})

        bfields.sort()
        sfields.sort(key=lambda a: a['fieldname'])

        # Translation
        # Adding a dictionary with strings that need to be translated in the handlebars template
        # This way we can do this with django and not have to worry about making a separate
        # handlebars helper
        trans_dict = {'more': _('More'), 'website': _('Website'), 'directions': _('Directions'),
                      'share': _('Share')}

        # More information for tooltip icon
        accreditation = ['Accredited'] if self.accred != 'None' else []
        accreditation.append('School' if self.is_cps_based else 'Center')
        
        # Tooltips - necessary for translations in handlebars template
        tooltip = {'directions': _('Directions from Google'), 'moreinfo': _('Click to show more information'),
                   'star': _('Click to star location'), 'accreditation': ' '.join(accreditation)}
        
        return {'item': item, 'phone': phone, 'sfields': sfields,
                'bfields': {'fieldname': _('Other Features'), 'values': bfields},
                'position': position, 'translations': trans_dict, 'tooltip': tooltip}

    def val_or_empty(self, field, f=(lambda x: x)):
        """
        Returns a pretty string representing the value of a field if it's present, otherwise an
        empty string.  The pretty string ends in a newline.
        field:  string with the name of a field on this model
        f:      optional rendering function.  It's given the value of the field, modifies it, and
                returns the result.  Default returns its input
        """
        val = self.__dict__[field]
        return ("%s: %s\n" % (self.verbose_name(field), f(val))) if val else ""

    def save(self, *args, **kwargs):
        """ Override for Model.save()
        Overrides Location.save(). Provides the additional functionality of updating the Neighborhood
        of the Location before the save.
        """
        if self.geom is not None:
            neighborhoods = Neighborhood.objects.filter(boundary__intersects=self.geom)
            if len(neighborhoods):
                self.neighborhood = neighborhoods[0]

        super(Location, self).save(*args, **kwargs)

