from django.contrib.gis.db import models
from portal.templatetags.portal_extras import nicephone
from django.template.defaultfilters import title


class Location(models.Model):
    site_name = models.CharField('Site Name', max_length=100)
    address = models.CharField('Address', max_length=50)
    city = models.CharField('City', max_length=10)
    state = models.CharField('State', max_length=2)
    zip = models.CharField('Zip Code', max_length=10)
    phone1 = models.CharField('Phone Number', max_length=20, blank=True)
    phone2 = models.CharField('Phone Number 2', max_length=20, blank=True)
    phone3 = models.CharField('Phone Number 3', max_length=20, blank=True)
    fax = models.CharField('Fax Number', max_length=20, blank=True)
    is_age_lt_3 = models.NullBooleanField('Ages 0-3')
    is_age_gt_3 = models.NullBooleanField('Ages 3-5')
    is_hs = models.NullBooleanField('Head Start')
    is_ehs = models.NullBooleanField('Early Head Start')
    is_pre4all = models.NullBooleanField('Preschool for All/Prevention Initiative')
    is_tuition_based = models.NullBooleanField('Tuition-Based')
    is_special_ed = models.NullBooleanField('Special Ed')
    is_montessori = models.NullBooleanField('Montessori')
    is_child_parent_center = models.NullBooleanField('Child-Parent Center')
    is_child_care = models.NullBooleanField('Child Care Assistance Program')
    ages = models.CharField('Ages Served', max_length=50, blank=True)
    exec_director = models.CharField('Executive Director', max_length=100, blank=True)
    ctr_director = models.CharField('Director/Principal', max_length=100, blank=True)
    site_affil = models.CharField('Site Affiliation', max_length=50, blank=True)
    url = models.CharField('Website', max_length=256, blank=True)
    email = models.CharField('Email', max_length=256, blank=True)
    q_stmt = models.TextField('Quality Statement', blank=True)
    e_info = models.TextField('Eligibility Information', blank=True)
    as_proc = models.TextField('Application and Selection Process', blank=True)
    accred = models.CharField('Accreditation', max_length=50, blank=True)
    prg_sched = models.TextField('Program Schedule', blank=True)
    prg_dur = models.CharField('Program Duration', max_length=50, blank=True)
    prg_size = models.CharField('Program Size', max_length=100, blank=True)
    waitlist = models.TextField('Waitlist Situation', blank=True)
    geom = models.PointField('Geometry', srid=4326, null=True)
    objects = models.GeoManager()

    # List of simple/boolean fields that should be displayed by Location renderers/views
    display_include = set([
        'ages', 'prg_dur', 'prg_sched', 'prg_size', 'site_affil', 'ctr_director', 'accred',
        'is_child_care', 'is_hs', 'is_ehs', 'is_pre4all', 'is_tuition_based',
        'is_child_parent_center'])

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

    def get_long_string(self):
        """Returns a long string representation of pertinent fields in this model"""
        result = "%s\n%s\n%s, %s %s\n" % \
            (self.site_name, self.address, self.city, self.state, self.zip)
        for field in [ "phone1", "phone2", "phone3", "fax" ]:
            result += self.val_or_empty(field, nicephone)

        attribs = ''
        for field in [
                'is_child_care', 'is_hs', 'is_pre4all', 'is_tuition_based',
                'is_montessori', 'is_child_parent_center' ]:
            if self.__dict__[field]:
                attribs += self.verbose_name(field) + ", "

        if len(attribs) > 0:
            result += "Attributes: " + attribs.strip(", ") + "\n"

        for field in [
                'exec_director', 'ctr_director', 'site_affil', 'url', 'email',
                'q_stmt', 'e_info', 'as_proc', 'accred', 'prg_sched', 'prg_dur',
                'prg_size', 'ages', 'waitlist' ]:
            result += self.val_or_empty(field)

        return result.strip()


