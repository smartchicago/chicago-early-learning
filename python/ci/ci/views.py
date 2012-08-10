from django.http import HttpResponse
from django.views.decorators.csrf import csrf_exempt
import logging, json

logger = logging.getLogger(__name__)

@csrf_exempt
def post_receive(request):
    if 'POST' == request.method and 'payload' in request.POST:
        payload = json.loads(request.POST['payload'])

        is_deploy = (payload['ref'] == 'refs/heads/master')
        is_staging = (payload['ref'] == 'refs/heads/staging')

        if is_deploy:
            logger.info('Deploying to production.')
            mark = open('/tmp/please_deploy', 'w')
            mark.close()

        if is_staging:
            logger.info('Deploying to staging.')
            mark = open('/tmp/please_staging', 'w')
            mark.close()
        
    return HttpResponse('OK')
