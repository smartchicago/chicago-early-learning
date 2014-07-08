# Copyright (c) 2012, 2013 Azavea, Inc.
# See LICENSE in the project root for copying permission


import os
import djcelery


djcelery.setup_loader()
BROKER_URL = 'amqp://guest:guest@localhost:5672/'

# Django settings for ecep project.

DEBUG = True
TEMPLATE_DEBUG = DEBUG

DATABASES = {
    'default': {
        'ENGINE': 'django.contrib.gis.db.backends.postgis',  # Add 'postgresql_psycopg2', 'postgresql', 'mysql', 'sqlite3' or 'oracle'.
        'NAME': 'ecep',                      # Or path to database file if using sqlite3.
        'USER': 'ecep',                      # Not used with sqlite3.
        'PASSWORD': 'ecep',                  # Not used with sqlite3.
        'HOST': 'localhost',                      # Set to empty string for localhost. Not used with sqlite3.
        'PORT': '5432',                      # Set to empty string for default. Not used with sqlite3.
    }
}

# Local time zone for this installation. Choices can be found here:
# http://en.wikipedia.org/wiki/List_of_tz_zones_by_name
# although not all choices may be available on all operating systems.
# On Unix systems, a value of None will cause Django to use the same
# timezone as the operating system.
# If running in a Windows environment this must be set to the same as your
# system time zone.
TIME_ZONE = 'America/Chicago'

# Language code for this installation. All choices can be found here:
# http://www.i18nguy.com/unicode/language-identifiers.html
LANGUAGE_CODE = 'en'

# The languages supported in the application.
# This lambda function only serves to mark the names as being i18n'd
ugettext = lambda s: s
LANGUAGES = (
    ('en', ugettext('English')),
    ('es', ugettext('Spanish')),
)

SITE_ID = 1

# If you set this to False, Django will make some optimizations so as not
# to load the internationalization machinery.
USE_I18N = True

# If you set this to False, Django will not format dates, numbers and
# calendars according to the current locale
USE_L10N = True

# URL that handles the media served from MEDIA_ROOT. Make sure to use a
# trailing slash.
# Examples: "http://media.lawrence.com/media/", "http://example.com/media/"
MEDIA_URL = ''

# URL prefix for static files.
# Example: "http://media.lawrence.com/static/"
STATIC_URL = '/static/'

# Additional locations of static files
STATICFILES_DIRS = (
    # Put strings here, like "/home/html/static" or "C:/www/django/static".
    # Always use forward slashes, even on Windows.
    # Don't forget to use absolute paths, not relative paths.
)

# List of finder classes that know how to find static files in
# various locations.
STATICFILES_FINDERS = (
    'django.contrib.staticfiles.finders.FileSystemFinder',
    'django.contrib.staticfiles.finders.AppDirectoriesFinder',
    #'django.contrib.staticfiles.finders.DefaultStorageFinder',
)

# List of callables that know how to import templates from various sources.
TEMPLATE_LOADERS = (
    'django.template.loaders.filesystem.Loader',
    'django.template.loaders.app_directories.Loader',
    #'django.template.loaders.eggs.Loader',
)

TEMPLATE_CONTEXT_PROCESSORS = (
    'django.contrib.auth.context_processors.auth',
    'django.core.context_processors.debug',
    'django.core.context_processors.i18n',
    'django.core.context_processors.media',
    'django.core.context_processors.static',
    'django.core.context_processors.request',
    'django.contrib.messages.context_processors.messages',
    'portal.context_processors.analytics',
    'portal.context_processors.settings',
)

MIDDLEWARE_CLASSES = (
    'django.middleware.common.CommonMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.locale.LocaleMiddleware',
)

ROOT_URLCONF = 'urls'

INSTALLED_APPS = (
    'modeltranslation',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.sites',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'django.contrib.admin',
    'django.contrib.gis',
    'django.contrib.sitemaps',
    'portal',
    'portal.sms',           # This is necessary for the celery worker to respond to messages
    'django_twilio',
    'gunicorn',
    'faq',
    'rosetta',
    'djcelery',
    'redactor',
)


# ----------------------------------------------------------------
# Everything after here depends on local_settings.py

# Import local_settings.py

from local_settings import *

if DJANGO_JENKINS:
    # If this is on CI, add django_jenkins to installed apps
    ia = list(INSTALLED_APPS)
    ia.append('django_jenkins')
    INSTALLED_APPS = tuple(ia)

# setup path settings
try:
    SITE_ROOT
except NameError:
    SITE_ROOT = os.path.dirname(os.path.abspath(__file__))

TEMPLATE_DIRS = (
    (SITE_ROOT + '/templates/'),
)
LOCALE_PATHS = (
    (SITE_ROOT + '/locale/'),
)

# setup logging
try:
    LOGGING
except NameError:
    LOGGING = {
        'version': 1,
        'disable_existing_loggers': False,
        'handlers': {
            'logfile': {
                'level': 'DEBUG',
                'class': 'logging.handlers.RotatingFileHandler',
                'filename': LOGFILE,
            }
        },
        'loggers': {
            'django.request': {
                'handlers': ['logfile'],
                'level': 'DEBUG',
                'propagate': True,
            },
            'portal.views': {
                'handlers': ['logfile'],
                'level': 'DEBUG',
                'propagate': True,
            }
        }
    }

