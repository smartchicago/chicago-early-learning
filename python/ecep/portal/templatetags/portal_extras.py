# Copyright (c) 2012, 2013 Azavea, Inc.
# See LICENSE in the project root for copying permission

from django import template
from django.template.defaultfilters import stringfilter
from django.utils.html import conditional_escape
from django.utils.safestring import mark_safe
from django.utils.translation import ugettext as _

register = template.Library()


@register.filter(is_safe=True)
@stringfilter
def nicephone(value):
    numonly = value.replace('-', '').replace('(', '').replace(')', '')
    if len(numonly) == 7:
        return '%s-%s' % (numonly[0:3], numonly[3:],)
    elif len(numonly) == 10:
        return '(%s) %s-%s' % (numonly[0:3], numonly[3:6], numonly[6:],)
    else:
        return value


@register.filter(needs_autoescape=True)
def niceweb(url, niceflag, autoescape=None):
    """
    Generate a link to 'Website' if niceflag is set.
    """
    return niceurl(url, niceflag, _('Website'), 'http://', autoescape)


@register.filter(needs_autoescape=True)
def nicemail(url, niceflag, autoescape=None):
    """
    Generate a link to 'Email' if niceflag is set.
    """
    return niceurl(url, niceflag, _('Email'), 'mailto:', autoescape)


def niceurl(url, niceflag, shortname, prefix, autoescape=None):
    """
    Return a link to the url with a short name if the niceflag is set. This is
    a helper method, and is called by both the niceweb and nicemail filters.

    @param url: The original input URL.
    @param niceflag: A flag indicating if the URL should be replaced with 'shortname'.
    @param shortname: The replacement text for the URL.
    @param prefix: The protocol prefix for the URL, if it is not already in place.
    @param autoescape: An object passed by the django escaping logic.
    @return: A safe HTML anchor to the URL.
    """
    if url == '':
        return ''

    realurl = url
    if url.startswith(prefix):
        pass
    else:
        realurl = '%s%s' % (prefix, url,)

    label = url
    if niceflag:
        label = shortname

    esc = lambda x: x
    if autoescape:
        esc = conditional_escape

    tag = '<a href="%s">%s</a>' % (esc(realurl), esc(label),)
    return mark_safe(tag)


@register.filter(is_safe=True)
def url_target_blank(text):
    """
    Opens links in new window.
    """
    return text.replace('<a ', '<a target="_blank" ')


@register.filter(is_safe=True)
def verbose_name(model, field):
    """
    Given a model and field name, returns the verbose name for that field
    """
    return model._meta.get_field_by_name(field)[0].verbose_name


