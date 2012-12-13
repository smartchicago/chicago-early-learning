# Copyright (c) 2012 Azavea, Inc.
# See LICENSE in the project root for copying permission

import os, sys

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ecep.settings')

sys.path.append(sys.path[0] + '/ecep')

from django.core.wsgi import get_wsgi_application
application = get_wsgi_application()
