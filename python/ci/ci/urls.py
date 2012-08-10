from django.conf.urls import patterns, url

from views import post_receive

urlpatterns = patterns('',
    # Examples:
    url(r'^$', post_receive),
)
