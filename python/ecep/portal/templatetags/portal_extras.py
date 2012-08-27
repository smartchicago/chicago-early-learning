from django import template
from django.template.defaultfilters import stringfilter

register = template.Library()

@register.filter
@stringfilter
def nicephone(value):
    numonly = value.replace('-','').replace('(','').replace(')','')
    if len(numonly) == 7:
        return '%s-%s' % (numonly[0:3], numonly[3:],)
    elif len(numonly) == 10:
        return '(%s) %s-%s' % (numonly[0:3], numonly[3:6], numonly[6:],)
    else:
        return value

# Opens links in new window
def url_target_blank(text):
    return text.replace('<a ', '<a target="_blank" ')
url_target_blank = register.filter(url_target_blank)
url_target_blank.is_safe = True
