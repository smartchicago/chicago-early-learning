# Copyright (c) 2012 Azavea, Inc.
# See LICENSE in the project root for copying permission

from django.contrib.gis.db import models
from portal.templatetags.portal_extras import nicephone
from django.template.defaultfilters import title
from django.utils.translation import ugettext_lazy as _
from django.utils.translation import pgettext_lazy

class Location(models.Model):
    site_name = models.CharField(_('Site Name'), max_length=100)
    address = models.CharField(pgettext_lazy(u'field name', u'Address'), max_length=75)
    city = models.CharField(_('City'), max_length=75)
    state = models.CharField(_('State'), max_length=2)
    zip = models.CharField(_('Zip Code'), max_length=10)
    phone = models.CharField(_('Phone Number'), max_length=20, blank=True)
    q_rating = models.CharField(_('Quality Rating'), max_length=10, blank=True)
    url = models.CharField(_('Website'), max_length=256, blank=True)
    q_stmt = models.TextField(_('Quality Statement'), blank=True)
    accred = models.CharField(_('Accreditation'), max_length=100, blank=True)
    prg_hours = models.CharField(_('Program Hours'), max_length=50, blank=True)
    is_full_day = models.NullBooleanField(_('Full Day'))
    is_part_day = models.NullBooleanField(_('Part Day'))
    is_full_week = models.NullBooleanField(_('Full Week'))
    is_part_week = models.NullBooleanField(_('Part Week'))
    is_school_year = models.NullBooleanField(_('School Year'))
    is_full_year = models.NullBooleanField(_('Full Year'))
    ages = models.CharField(_('Ages Served'), max_length=50, blank=True)
    is_age_lt_3 = models.NullBooleanField(_('Ages 0-3'))
    is_age_gt_3 = models.NullBooleanField(_('Ages 3-5'))
    language_1 = models.CharField(_('Language 1 (other than English)'), max_length=50, blank=True)
    language_2 = models.CharField(_('Language 2 (other than English)'), max_length=50, blank=True)
    language_3 = models.CharField(_('Language 3 (other than English)'), max_length=50, blank=True)
    is_community_based = models.NullBooleanField(_('Community Based'))
    is_cps_based = models.NullBooleanField(_('CPS Based'))
    is_home_visiting = models.NullBooleanField(_('Home Visiting'))
    accept_ccap = models.NullBooleanField(_('Accepts CCAP'))
    is_hs = models.NullBooleanField(_('Head Start'))
    is_ehs = models.NullBooleanField(_('Early Head Start'))
    geom = models.PointField(_('Geometry'), srid=4326, null=True)
    objects = models.GeoManager()

    # List of simple/boolean fields that should be displayed by Location renderers/views
    display_include = set([
        'ages', 'is_full_day', 'is_part_day', 'is_full_week', 'is_part_week', 'is_school_year',
        'is_full_year', 'accred', 'is_community_based', 'is_cps_based', 'is_home_visiting',
        'is_hs', 'is_ehs'])

    def __unicode__(self):
        return self.site_name

    def verbose_name(self, field):
        """
        Given the name of field, returns the verbose_name property for it
        """
        return self._meta.get_field_by_name(field)[0].verbose_name

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
                fields.append((field.get_attname(), field.verbose_name,))

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

        # simple fields to present -- these are the attributes that have text content
        sfields = []

        # boolean fields to present -- these are the attributes that are set to True
        bfields = []

        for field in Location._meta.fields:
            fname = field.get_attname()
            if not fname in Location.display_include:
                continue

            if self.is_true_bool_field(field):
                bfields.append(field.verbose_name)
            elif self.is_simple_field(field):
                kv = (field.verbose_name, getattr(self, fname))
                sfields.append(kv)

        bfields.sort()
        sfields.sort(key=lambda a: a[0])
        return { 'item': self, 'sfields': sfields, 'bfields': bfields }

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

class Neighborhood(models.Model):
    """Model for neighborhoods in Chicago
    """
    boundary = models.MultiPolygonField()
    primary_name = models.CharField(max_length=100)
    secondary_name = models.CharField(max_length=100)

    def __unicode__(self):
        return self.primary_name
        
