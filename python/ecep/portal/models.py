from django.contrib.gis.db import models

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
    is_child_care = models.NullBooleanField('Child Care')
    is_hs = models.NullBooleanField('Head Start')
    is_ehs = models.NullBooleanField('Early Head Start')
    is_pre4all = models.NullBooleanField('Preschool for All/Prevention Initiative')
    is_tuition_based = models.NullBooleanField('Tuition-Based')
    is_special_ed = models.NullBooleanField('Special Ed')
    is_montessori = models.NullBooleanField('Montessori')
    is_child_parent_center = models.NullBooleanField('Child-Parent Center')
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
    ages = models.CharField('Ages Served', max_length=50, blank=True)
    is_age_lt_3 = models.NullBooleanField('Ages 0-3')
    is_age_gt_3 = models.NullBooleanField('Ages 3-5')
    waitlist = models.TextField('Waitlist Situation', blank=True)
    geom = models.PointField('Geometry', srid=4326, null=True)
    objects = models.GeoManager()

    def __unicode__(self):
        return self.site_name

    @staticmethod
    def get_boolean_fields():
        """
        Get all the fields of the model that are NullBooleanField types.

        This method does not use a static list of names, but rather inspects
        the meta class attached to the model to introspect on the field types.
        This also has the benefit of providing the verbose name of the field.
        """
        exclude = ['is_montessori', 'is_special_ed']

        fields = []
        for field in Location._meta.fields:
            if field.get_internal_type() == 'NullBooleanField' and \
                not field.get_attname() in exclude:
                    fields.append((field.get_attname(),field.verbose_name,))

        return fields
