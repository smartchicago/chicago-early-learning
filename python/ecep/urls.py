# Copyright (c) 2012 Azavea, Inc.
# See LICENSE in the project root for copying permission

from django.conf.urls.defaults import patterns, include, url
from django.conf.urls.i18n import i18n_patterns
from portal.sms import Sms, Conversation, SmsCallback
from django.views.generic.simple import direct_to_template

from django.contrib.gis import admin
admin.autodiscover()

js_info_dict = {
    'domain': 'djangojs',
    'packages': ('ecep.portal',),
}

urlpatterns = patterns(
    '',
    # Index page is in the 'portal' app
    url(r'^$', 'portal.views.index'),

    # Admin interface
    url(r'^admin/', include(admin.site.urls)),
)

