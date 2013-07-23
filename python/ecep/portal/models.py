# Copyright (c) 2012 Azavea, Inc.
# See LICENSE in the project root for copying permission

from django.contrib.gis.db import models
from portal.templatetags.portal_extras import nicephone
from django.template.defaultfilters import title

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

    def center(self):
        """Returns a dictionary representation of the neighborhood's centroid.

        Used to add functionality to zoom on neighborhood when explore button clicked.
        """
        center = self.boundary.centroid.coords
        return {'lng': center[0], 'lat': center[1]}

                
    def __unicode__(self):
        return self.primary_name
        
class Location(models.Model):
    """Model for school locations in Chicago
    """
    site_name = models.CharField('Site Name', max_length=100)
    address = models.CharField('Address', max_length=75)
    city = models.CharField('City', max_length=75)
    state = models.CharField('State', max_length=2)
    zip = models.CharField('Zip Code', max_length=10)
    neighborhood = models.ForeignKey('Neighborhood', null=True)
    phone = models.CharField('Phone Number', max_length=20, blank=True)
    q_rating = models.CharField('Quality Rating', max_length=10, blank=True)
    url = models.CharField('Website', max_length=256, blank=True)
    q_stmt = models.TextField('Quality Statement', blank=True)
    accred = models.CharField('Accreditation', max_length=100, blank=True)
    prg_hours = models.CharField('Program Hours', max_length=50, blank=True)
    is_full_day = models.NullBooleanField('Full Day')
    is_part_day = models.NullBooleanField('Part Day')
    is_full_week = models.NullBooleanField('Full Week')
    is_part_week = models.NullBooleanField('Part Week')
    is_school_year = models.NullBooleanField('School Year')
    is_full_year = models.NullBooleanField('Full Year')
    ages = models.CharField('Ages Served', max_length=50, blank=True)
    is_age_lt_3 = models.NullBooleanField('Ages 0-3')
    is_age_gt_3 = models.NullBooleanField('Ages 3-5')
    language_1 = models.CharField('Language 1 (other than English)', max_length=50, blank=True)
    language_2 = models.CharField('Language 2 (other than English)', max_length=50, blank=True)
    language_3 = models.CharField('Language 3 (other than English)', max_length=50, blank=True)
    is_community_based = models.NullBooleanField('Community Based')
    is_cps_based = models.NullBooleanField('CPS Based')
    is_home_visiting = models.NullBooleanField('Home Visiting')
    accept_ccap = models.NullBooleanField('Accepts CCAP')
    is_hs = models.NullBooleanField('Head Start')
    is_ehs = models.NullBooleanField('Early Head Start')
    geom = models.PointField('Geometry', srid=4326, null=True)
    objects = models.GeoManager()

    # List of simple/boolean fields that should be displayed by Location renderers/views
    display_include = set(['ages', 'prg_hours', 'accred', 'is_home_visiting', 'accept_ccap'])

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

        for field in Location._meta.fields:
            fname = field.get_attname()
            if not fname in Location.display_include:
                continue

            if self.is_true_bool_field(field):
                bfields.append(field.verbose_name)
            elif self.is_simple_field(field):
                kv = {'fieldname': field.verbose_name, 'value': getattr(self, fname)}
                sfields.append(kv)

        # Affiliations
        affiliation_fields = [(self.is_community_based, 'is_community_based'),
                              (self.is_cps_based, 'is_cps_based'),
                              (self.is_hs, 'is_hs'),
                              (self.is_ehs, 'is_ehs')]
        affiliation_values = [self.verbose_name(aff[1]).encode() for aff in affiliation_fields if aff[0]]
        sfields.append({'fieldname': 'Affiliations', 'value': ', '.join(affiliation_values) if affiliation_values else 'None'})

        # Combine Languages
        lang_list = [lang for lang in self.language_1, self.language_2, self.language_3 if lang]
        languages = ", ".join(lang_list)
        if languages != '':
            sfields.append({'fieldname': 'Languages (other than English)', 'value': languages})

        # Program Duration
        sfields.append({'fieldname': 'Program Duration', 'value': 'Full Year' if self.is_full_year else 'School Year'})

        # Week Duration
        sfields.append({'fieldname': 'Weekday Availability', 'value': 'Full Week' if self.is_full_week else 'Partial Week'})

        # Phone
        phone = {'fieldname': self.verbose_name('phone'), 'number': nicephone(self.phone)}

        # Position
        position = {'lng': self.geom[0], 'lat': self.geom[1]}
        bfields.sort()
        sfields.sort(key=lambda a: a['fieldname'])
        return {'item': item, 'phone': phone, 'sfields': sfields, 'bfields': bfields, 'position': position}

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

