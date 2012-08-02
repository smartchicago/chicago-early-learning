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
    is_child_parent_center = models.NullBooleanField('Child Parent Center')
    is_comm_partner = models.NullBooleanField('Community Partnerships')
    is_ehs = models.NullBooleanField('Early Head Start')
    is_hs = models.NullBooleanField('Head Start')
    is_prek_all = models.NullBooleanField('Prekindergarten For All')
    is_school_age = models.NullBooleanField('School Age')
    is_st_prek = models.NullBooleanField('State Pre-Kindergarten')
    is_tuition_based = models.NullBooleanField('Tuition Based Preschool')
    is_montessori = models.NullBooleanField('Montessori')
    is_special_ed = models.NullBooleanField('Special Ed')
    exec_director = models.CharField('Executive Director', max_length=100, blank=True)
    ctr_director = models.CharField('Center Director', max_length=100, blank=True)
    site_affil = models.CharField('Site Affiliation', max_length=50, blank=True)
    url = models.CharField('Website', max_length=256, blank=True)
    email = models.CharField('Email', max_length=256, blank=True)
    q_stmt = models.TextField('Quality Statement', blank=True)
    e_info = models.TextField('Eligibility Information', blank=True)
    as_proc = models.TextField('Application and Selection Process', blank=True)
    accred = models.CharField('Accreditation', max_length=10, blank=True)
    prg_sched = models.TextField('Program Schedule', blank=True)
    prg_dur = models.CharField('Program Duration', max_length=50, blank=True)
    prg_size = models.CharField('Program Size', max_length=100, blank=True)
    n_classrooms = models.TextField('Number of Classrooms', blank=True)
    waitlist = models.TextField('Waitlist Situation', blank=True)
    geom = models.PointField('Geometry', srid=4326, null=True)
    objects = models.GeoManager()

    def __unicode__(self):
        return self.site_name

    @staticmethod
    def get_boolean_fields():
        fields = []
        for field in Location._meta.fields:
            if field.get_internal_type() == 'NullBooleanField':
                fields.append((field.get_attname(),field.verbose_name,))
        return fields
