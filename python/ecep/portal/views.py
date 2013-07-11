# Copyright (c) 2012 Azavea, Inc.
# See LICENSE in the project root for copying permission

from django.template import RequestContext
from django.shortcuts import render_to_response, get_object_or_404
from django.views.decorators.cache import cache_control
from django.db.models import Q
from django.conf import settings
from django.http import HttpResponseRedirect, Http404
from models import Location
import logging, hashlib
from faq.models import Topic, Question
from django.utils.translation import ugettext as _
from django.utils.translation import check_for_language
from django.utils import translation

logger = logging.getLogger(__name__)


def index(request):
    ctx = RequestContext(request, { })
    response = render_to_response('index.html', context_instance=ctx)
    return response

