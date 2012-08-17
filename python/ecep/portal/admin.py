from portal.models import Location
from django.contrib.gis import admin

class LocationAdmin(admin.OSMGeoAdmin):
    list_display = ('site_name', 'id',)
    search_fields = ['site_name']

    fieldsets = [
        (None,      {'fields': ['site_name']}),
        ('Address', {'fields': ['address', 'city', 'state', 'zip']}),
        ('Contact', {'fields': ['phone1', 'phone2', 'phone3', 'fax', 'url', 'email']}),
        ('Flags',   {'fields': ['is_child_care', 'is_hs', 'is_ehs', 'is_pre4all', 
            'is_tuition_based', 'is_special_ed', 'is_montessori', 
            'is_child_parent_center', 'is_age_lt_3', 'is_age_gt_3']}),
        ('Other',   {'fields': ['exec_director', 'ctr_director', 'site_affil', 'q_stmt',
            'e_info', 'as_proc', 'accred', 'prg_sched', 'prg_dur', 'ages', 'waitlist']}),
        ('Map',     {'fields': ['geom']})
    ]

admin.site.register(Location, LocationAdmin)

