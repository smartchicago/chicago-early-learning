# Copyright (c) 2012, 2013 Azavea, Inc.
# See LICENSE in the project root for copying permission

from django.contrib.gis.db import models
from portal.templatetags.portal_extras import nicephone
from django.template.defaultfilters import title
from django.contrib.auth.models import User
from django.core.urlresolvers import reverse

# Model fields need to be translated lazily
from django.utils.translation import ugettext as _, ugettext_lazy


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
    EMPTY = ''
    NONE = 'None'
    LICENSED = 'Licensed'
    BRONZE = 'Bronze'
    SILVER = 'Silver'
    GOLD = 'Gold'

    Q_RATING_CHOICES = (
        (EMPTY, ugettext_lazy('Select a rating')),
        (NONE, ugettext_lazy('None')),
        (LICENSED, ugettext_lazy('Licensed')),
        (BRONZE, ugettext_lazy('Bronze')),
        (SILVER, ugettext_lazy('Silver')),
        (GOLD, ugettext_lazy('Gold')),
    )

    LOCATION_TYPE_CHOICES = (
        (0, 'Normal Location'),
        (1, 'Application Site'),
    )

    HIGH = 'Slots Available'
    MEDIUM = 'Limited Availability'

    AVAILABILITY_CHOICES = (
        (HIGH, ugettext_lazy('Slots Available')),
        (MEDIUM, ugettext_lazy('Limited Availability')),
    )    

    copa_key = models.IntegerField('COPA Key', default=0, blank=True)
    ecm_key = models.IntegerField('ECM Key', default=0, blank=True)
    site_name = models.CharField('Site Name', max_length=100)
    site_type = models.IntegerField('Site Type', default=0, choices=LOCATION_TYPE_CHOICES)
    address = models.CharField('Address', max_length=75)
    city = models.CharField('City', max_length=75)
    state = models.CharField('State', max_length=2)
    zip = models.CharField('Zip Code', max_length=10)
    neighborhood = models.ForeignKey('Neighborhood', null=True)
    phone = models.CharField(ugettext_lazy('Phone Number'), max_length=20, blank=True)
    q_rating = models.CharField(ugettext_lazy('Quality Rating'), choices=Q_RATING_CHOICES, max_length=10, blank=True)
    url = models.CharField(ugettext_lazy('Website'), max_length=256, blank=True)
    q_stmt = models.TextField(ugettext_lazy('Description'), blank=True)
    enrollment = models.TextField(ugettext_lazy('Enrollment Process'), blank=True)
    accred = models.CharField(ugettext_lazy('Accreditation'), max_length=100, blank=True)
    prg_hours = models.CharField(ugettext_lazy('Program Hours'), max_length=200, blank=True)
    is_age_lt_3 = models.NullBooleanField(ugettext_lazy('Ages 0 - 3'))
    is_age_gt_3 = models.NullBooleanField(ugettext_lazy('Ages 3 - 5'))
    is_full_day = models.NullBooleanField(ugettext_lazy('Full Day'))
    is_part_day = models.NullBooleanField(ugettext_lazy('Part Day'))
    is_school_year = models.NullBooleanField(ugettext_lazy('School Year'))
    is_full_year = models.NullBooleanField(ugettext_lazy('Full Year'))
    ages = models.CharField(ugettext_lazy('Ages Served'), max_length=50, blank=True)
    is_full_week = models.NullBooleanField(ugettext_lazy('Full Week'))
    is_part_week = models.NullBooleanField(ugettext_lazy('Part Week'))
    language_1 = models.CharField('Language 1 (other than English)', max_length=200, blank=True)
    language_2 = models.CharField('Language 2 (other than English)', max_length=200, blank=True)
    language_3 = models.CharField('Language 3 (other than English)', max_length=200, blank=True)
    is_community_based = models.NullBooleanField(ugettext_lazy('Community Based'))
    is_cps_based = models.NullBooleanField(ugettext_lazy('CPS Based'))
    is_home_visiting = models.NullBooleanField(ugettext_lazy('Offers Home Visiting'))
    accept_ccap = models.NullBooleanField(ugettext_lazy('Accepts CCAP'))
    is_hs = models.NullBooleanField(ugettext_lazy('Head Start'))
    is_ehs = models.NullBooleanField(ugettext_lazy('Early Head Start'))
    open_house = models.TextField(ugettext_lazy('Open House'), blank=True)
    curriculum = models.TextField(ugettext_lazy('Curriculum'), blank=True)
    email = models.EmailField(blank=True)

    # Keeps track of whether or not new locations have been approved by the admin
    accepted = models.BooleanField(ugettext_lazy('Approved'), default=False)

    # ECM alottment status, classroom availability
    availability = models.CharField(ugettext_lazy('Availability'), choices=AVAILABILITY_CHOICES, max_length=25, blank=True)


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
    display_include = {
        'ages', 'accred', 'accept_ccap', 'is_home_visiting', 'is_hs', 'is_ehs',
        'is_community_based', 'is_cps_based', 'open_house', 'curriculum',
    }

    # List of fields that should be hidden when left blank
    hide_if_none = {
        'open_house', 'curriculum',
    }

    display_order = dict((k, v) for v, k in enumerate([
            'open_house',
            'accred', 'ages', 'description', 'enrollment', 'duration_hours',
            'weekday_availability', 'languages', 'program_info',
            'curriculum', 'quality_rating'
        ]))

    q_rating_translations = [
        ugettext_lazy('None'),
        ugettext_lazy('Licensed'),
        ugettext_lazy('Bronze'),
        ugettext_lazy('Silver'),
        ugettext_lazy('Gold')
    ]

    def __unicode__(self):
        return unicode(self.site_name)

    def verbose_name(self, field):
        """
        Given the name of field, returns the verbose_name property for it
        """
        return unicode(self._meta.get_field_by_name(field)[0].verbose_name)

    @property
    def is_enrollment(self):
        if self.site_type == 1:
            return True
        else:
            return False

    def combine_languages(self):
        lang_list = [lang for lang in self.language_1, self.language_2, self.language_3 if lang]
        languages = ", ".join(lang_list)
        return languages

    def combine_other_features(self):
        other_features = ''
        return other_features

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

    def get_boolean_fieldnames(self):
        """
        Extracts list of boolean field names from model
        """
        fields = self._meta.fields
        return [field.name for field in fields if field.get_internal_type() == 'NullBooleanField']

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

    def get_copa_url(self):
        """
        """
        if self.copa_key == 0:
            return ''
        else:
            return 'https://cys.mycopa.com/familyPortal/welcome.epl'

    def get_context_dict(self, short=False):
        """Gets a context dictionary for rendering this object in templates

        Performs a bunch of cleanup and filtering logic to format fields appropriately and
        remove useless info

        :param short: If true, a shorter version of the dict will be returned
        """
        # Fix some ugly data
        if self.site_name.isupper():
            self.site_name = title(self.site_name)
        if self.address.isupper():
            self.address = title(self.address)
        if self.city.isupper():
            self.city = title(self.city)

        if self.ecm_key == 0:
            not_ecm = True
        else:
            not_ecm = False

        if self.availability == self.HIGH:
            availability = 'high'
        elif self.availability == self.MEDIUM:
            availability = 'medium'
        else:
            availability = ''

        item = {
            'address': self.address,
            'city': self.city,
            'site_name': self.site_name,
            'zip': self.zip,
            'url': self.url,
            'state': self.state,
            'key': self.pk,
            'email': self.email,
            'type': self.site_type,
            'full_day': self.is_full_day,
            'part_day': self.is_part_day,
            'age_lt_3': self.is_age_lt_3,
            'age_gt_3': self.is_age_gt_3,
            'site_type': self.site_type,
            'is_enrollment': self.is_enrollment,
            'duration_hours': self.prg_hours,
            'availability': availability,
        }

        # simple fields to present -- these are the attributes that have text content
        sfields = []

        # boolean fields to present -- these are the attributes that are set to True
        bfields = []

        # Fields to include in Affiliation aggregate field
        affiliation_fields = [self._meta.get_field_by_name(name)[0] for name in
                              ['is_home_visiting', 'is_community_based', 'is_cps_based', 'is_hs', 'is_ehs']]
        program_fields = [
            self._meta.get_field_by_name(name)[0] for name in
            ['is_full_year', 'is_school_year']
        ]

        week_fields = [
            self._meta.get_field_by_name(name)[0] for name in
            ['is_full_week', 'is_part_week', 'is_full_day', 'is_part_day']
        ]

        aff_field_names = {f.get_attname() for f in affiliation_fields}

        for field in self._meta.fields:
            fname = field.get_attname()

            if not fname in self.display_include or fname in aff_field_names:
                continue

            if self.is_true_bool_field(field):
                bfields.append(field.verbose_name)
            elif self.is_simple_field(field):
                value = field.value_from_object(self)
                hide_field = fname in self.hide_if_none and not value
                if not hide_field:
                    kv = {
                        'key': fname,
                        'fieldname': _(field.verbose_name),
                        'value': value if value else _('None')
                    }
                    sfields.append(kv)

        affiliation_values = [self.verbose_name(aff.get_attname()) for aff in affiliation_fields
                              if aff.value_from_object(self)]
        sfields.append({'key': 'program_info',
                        'fieldname': _('Program Information'),
                        'value': ', '.join(affiliation_values) if affiliation_values else _('None')})

        # Combine Languages
        lang_list = [lang for lang in self.language_1, self.language_2, self.language_3 if lang]
        languages = ", ".join(lang_list)
        if languages != '':
            sfields.append({'key': 'languages',
                            'fieldname': _('Languages'),
                            'value': languages})

        # Program Duration/Hours
        program_values = [self.verbose_name(prg.get_attname()) for prg in program_fields
                          if prg.value_from_object(self)]
        program_hours = self.prg_hours if self.prg_hours else _("No Hours Listed")
        program_values.append(program_hours)
        sfields.append({'key': 'duration_hours',
                        'fieldname': _('Duration and Hours'),
                        'value': ', '.join(program_values) if program_values else _('None')})

        # Weekday Avaialability
        week_values = [self.verbose_name(wk.get_attname()) for wk in week_fields
                       if wk.value_from_object(self)]
        sfields.append({'key': 'weekday_availability',
                        'fieldname': _('Weekday Availability'),
                        'value': ', '.join(week_values) if week_values else _('None')})

        # Quality Rating
        # default empty db entry to coming soon so we don't have to modify code when CEL chooses
        #   to implement this. No q_rating is explicitly set as 'None' in the database and will
        #   be properly displayed in the UI as long as the db field is set to 'None'
        # key for displayed image, not to be translated
        item['quality'] = self.q_rating.lower() or 'none'
        # translatable displayed text
        q_rating = self.q_rating or 'Coming Soon'
        sfields.append({'key': 'quality_rating',
                        'fieldname': _('Quality Rating'),
                        'value': _(q_rating)})

        # Phone
        phone = {'fieldname': _('Phone Number'), 'number': nicephone(self.phone)}

        # Position
        position = {'lng': self.geom[0], 'lat': self.geom[1]}

        # Quality Statement
        if self.q_stmt and not short:
            sfields.append({'key': 'description', 'fieldname': _('Description'), 'value': self.q_stmt})

        bfields.sort()
        sfields.sort(key=lambda a: self.display_order[a['key']])

        # Translation
        # Adding a dictionary with strings that need to be translated in the handlebars template
        # This way we can do this with django and not have to worry about making a separate
        # handlebars helper
        trans_dict = {'more': _('More'), 'website': _('Website'), 'directions': _('Directions'),
                      'share': _('Share'), 'qrisrating': _('QRIS Rating'), 'contact': _('Compare and Apply'),
                      'more_info': _('More Info'), 'serves03': _('Serves ages 0 - 3'), 'serves35': _('Serves ages 3 - 5'),
                      'serves05': _('Serves ages 0 - 3, 3 - 5'), 'full_day': _('Full Day'), 'part_day': _('Part Day')}

        # More information for tooltip icon
        accreditation = ['Accredited'] if self.accred != 'None' else []
        accreditation.append('School' if self.is_cps_based else 'Center')

        # Tooltips - necessary for translations in handlebars template
        tooltip = {'directions': _('Directions from Google'), 'moreinfo': _('Click to show more information'),
                   'star': _('Click to save to your list'), 'unstar': _('Click to remove from your list'), 'accreditation': ' '.join(accreditation),
                   'quality': _(q_rating)}

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


class LocationEdit(models.Model):
    """
    Model class that stores edits for locations
    """
    EDIT_TYPE_CHOICES = (('create', 'Create'), ('update', 'Update'), ('delete', 'Delete'))

    user = models.ForeignKey(User)
    location = models.ForeignKey(Location)
    fieldname = models.TextField()
    new_value = models.TextField()
    date_edited = models.DateTimeField(auto_now_add=True)
    pending = models.BooleanField(default=True)
    edit_type = models.CharField(max_length=6, choices=EDIT_TYPE_CHOICES)
    accepted = models.BooleanField(default=False)


class Contact(models.Model):
    CHILD_AGE_CHOICES = [
        ('0-2', '0-2'),
        ('3-5', '3-5'),
        ('5-up', '5 & Up'),
    ]

    location = models.ForeignKey(Location)

    email = models.EmailField()
    first_name = models.CharField(ugettext_lazy('First Name'), max_length=50)
    last_name = models.CharField(ugettext_lazy('Last Name'), max_length=50)
    phone = models.CharField(ugettext_lazy('Phone Number'), max_length=20, blank=True)
    address_1 = models.CharField(ugettext_lazy('Address 1'), max_length=75)
    address_2 = models.CharField(ugettext_lazy('Address 2'), max_length=75, blank=True)
    city = models.CharField(ugettext_lazy('City'), max_length=75)
    state = models.CharField(ugettext_lazy('State'), max_length=2)
    zip = models.CharField(ugettext_lazy('Zip Code'), max_length=10)
    created = models.DateTimeField(auto_now_add=True)

    child_1 = models.CharField(ugettext_lazy('Child 1\'s Age'), max_length=6, choices=CHILD_AGE_CHOICES, blank=True)
    child_2 = models.CharField(ugettext_lazy('Child 2\'s Age'), max_length=6, choices=CHILD_AGE_CHOICES, blank=True)
    child_3 = models.CharField(ugettext_lazy('Child 3\'s Age'), max_length=6, choices=CHILD_AGE_CHOICES, blank=True)
    child_4 = models.CharField(ugettext_lazy('Child 4\'s Age'), max_length=6, choices=CHILD_AGE_CHOICES, blank=True)
    child_5 = models.CharField(ugettext_lazy('Child 5\'s Age'), max_length=6, choices=CHILD_AGE_CHOICES, blank=True)

    message = models.TextField(blank=True)

    class Meta:
        unique_together = (("location", "email"),)
