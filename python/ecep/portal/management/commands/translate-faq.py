# Copyright (c) 2012 Azavea, Inc.
# See LICENSE in the project root for copying permission

from django.core.management.base import BaseCommand, CommandError
from faq.models import Topic
from optparse import make_option
from django.utils import translation
from django.conf import settings

class Command(BaseCommand):
    """
    Geocode a set of models.
    """

    help = """This management command will duplicate all the default Topic and
Question models in the faq app into a new language."""

    def handle(self, *args, **options):
        """
        Copy existing FAQ topics into another language, discriminated by slug
        """
        qset = Topic.objects.all()

        # only run the duplication of topic and questions once
        if qset.count() > 2:
            return 0

        self.default_lang = settings.LANGUAGE_CODE[0:2]

        # duplicate the topic into all the other languages
        for topic in qset:
            for lang in settings.LANGUAGES:
                self.dupetopic(lang[0], topic)


    def dupetopic(self, lang, topic):
        """
        Duplicate a topic into another language.
        """
        if lang == self.default_lang:
            if not topic.slug.startswith('%s-' % lang):
                topic.slug = '%s-%s' % (lang, topic.slug,)
                topic.save()
        else:
            if topic.slug.startswith('%s-' % lang):
                return

            lang_topic, created = Topic.objects.get_or_create(
                name='%s - %s' % (topic.name, lang),
                slug='%s-%s' % (lang, topic.slug)
            )

            if created:
                questions = topic.questions.all()

                for q in questions:
                    self.dupequestion(lang, lang_topic, q)

    def dupequestion(self, lang, lang_topic, question):
        """
        Duplicate a question from one topic to another. This method
        modifies the provided question parameter by setting its ID
        to None, and saving it as a relation to the lang_topic. This
        effectively duplicates the question record in the database
        and change the duplicate's topic.
        """
        question.id = None
        question.topic = lang_topic
        question.text = '%s - %s' % (question.text, lang)
        question.save();
