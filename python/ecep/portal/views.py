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


# TODO: We probably don't need this function for the new version, I'm moving
# it in from the old version for now to avoid lots of refactoring.
def get_opts(selected_val='2'):
    """
    Gets option list for the distance dropdown (see base.html)
    selected_val: string representing the value of the dropdown that should be selected
    Default is '2'
    """
    # Options for distance dropdown
    # option value => (option text, enabled)
    distance_opts = { '-1': [_('Distance'), False],
                      '0.5': [_('< 0.5 mi'), False],
                      '1': [_('< 1 mi'), False],
                      '2': [_('< 2 mi'), False],
                      '5': [_('< 5 mi'), False],
                      '10': [_('< 10 mi'), False] }

    key = selected_val if selected_val in distance_opts else '2'
    distance_opts[key][1] = True
    result = [[k] + v for k, v in distance_opts.items()]
    return sorted(result, key=lambda a: float(a[0]))


def index(request):
    ctx = RequestContext(request, { })
    response = render_to_response('index.html', context_instance=ctx)
    return response


def about(request):
    ctx = RequestContext(request, {
        'options': get_opts(),
        'mapbarEnabled': True
    })
    return render_to_response('about.html', context_instance=ctx)


class TopicWrapper(object):
    topic = None
    questions = None

    def __init__(self, t, request):
        self.topic = t
        qs = Question.objects.filter(topic=t, status=Question.ACTIVE)
        if request.user.is_anonymous():
            qs = qs.exclude(protected=True)
        self.questions = list(qs)


def faq(request):
    tpl = 'faq-models.html'

    # get the language of the request
    lang = request.LANGUAGE_CODE

    # get the topics in this language
    topics = Topic.objects.filter(slug__startswith=lang + '-')
    if topics.count() == 0:
        topics = Topic.objects.filter(slug__startswith=settings.LANGUAGE_CODE[0:2] + '-')

    ctx = RequestContext(request, {
        'topics': [TopicWrapper(t, request) for t in topics],
        'options': get_opts(),
        'mapbarEnabled': True
    })
    return render_to_response(tpl, context_instance=ctx)


def setlang(request, language):
    nxt = '/'
    if 'next' in request.REQUEST:
        nxt = request.REQUEST['next']

    response = HttpResponseRedirect(nxt)
    if language and check_for_language(language):
        response.set_cookie(settings.LANGUAGE_COOKIE_NAME, language)

    return response
