# Copyright (c) 2012, 2013 Azavea, Inc.
# See LICENSE in the project root for copying permission

import os, sys
from django.core.wsgi import get_wsgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ecep.settings')

sys.path.append(sys.path[0] + '/ecep')

application = get_wsgi_application()
