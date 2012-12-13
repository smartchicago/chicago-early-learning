# Copyright (c) 2012 Azavea, Inc.
# See LICENSE in the project root for copying permission

from django.http import HttpResponse

def home(request):
    return HttpResponse("Hello, world.2")
