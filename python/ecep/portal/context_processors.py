# Copyright (c) 2012 Azavea, Inc.
# See LICENSE in the project root for copying permission

from django.conf import settings as ds


def analytics(request):
    return { 'ga_key': ds.GA_KEY }


def settings(request):
    return { 'settings': ds }
