import os, sys

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ecep.settings')

sys.path.append(sys.path[0] + '/ecep')

from django.core.wsgi import get_wsgi_application
application = get_wsgi_application()
