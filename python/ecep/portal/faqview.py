
#from django.template import Context
from django.shortcuts import render_to_response
#from django.views.decorators.cache import cache_control
from django.views.generic import View

from faq.models import Topic, Question
import logging

logger = logging.getLogger(__name__)


class TopicWrapper(object):
    topic = None
    questions = None

    def __init__(self, t, request):
        self.topic = t
        qs = Question.objects.filter(topic=t, status=Question.ACTIVE)
        if request.user.is_anonymous():
            qs = qs.exclude(protected=True)
        self.questions = list(qs)


class FaqView(View):
    def get(self, request):
        tpl = 'faq.html'
        topics = Topic.objects.all()
        tw = [TopicWrapper(t, request) for t in topics]
        c = { 'topics': tw }
        return render_to_response(tpl, c)


