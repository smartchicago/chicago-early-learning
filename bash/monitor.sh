#!/bin/bash
#
# This bash script is a cron job that watches for the files:
#
#  /tmp/please_deploy
#  /tmp/please_staging
#
# And deploys the early-childhood-learning repository to 
# port 80 and 8000, respectively
#

if [ `whoami` != 'root' ]; then
    echo "Must run this cron job as root."
    exit 1
fi

RESTART=N
EC2_HOST=`wget -q -O - http://169.254.169.254/latest/meta-data/public-hostname`
# Set these if the respective area is being updated
DEPLOY_URL=''
STAGE_URL=''

function fetch_update {
    TRIGGER=$1
    CODEPATH=$2
    BRANCH=$3
    
    if [ -e '/tmp/please_$TRIGGER' ]; then
        echo "Code update to $TRIGGER"
        cd $2

        su ec2-user -c "git pull --rebase origin $BRANCH"
        if [ $? != 0 ]; then
            echo "Error fetching and rebasing code from 'origin'"
            rm /tmp/please_$TRIGGER

            exit 2
        fi

        cd python/ecep
        su ec2-user -c "./manage.py collectstatic --noinput"

        if [ -e 'locale' ]; then
            # compile messages if the locale folder is present
            for lc in locale/*; do
                echo "Compiling messages for $lc locale"
                su ec2-user -c "./manage.py compilemessages --locale $lc"
            done
        fi

        RESTART=Y

        rm /tmp/please_$TRIGGER

        if [ "$TRIGGER" == "stage" ]; then
            STAGE_URL="http://$EC2_HOST:8000/"
        else
            DEPLOY_URL="http://$EC2_HOST/"
        fi
    fi
}

fetch_update 'staging' '/srv/early-childhood-portal.staging' 'staging'

fetch_update 'deploy' '/srv/early-childhood-portal' 'master'

if [ "$RESTART" == 'Y' ]; then
    pkill gunicorn
    if [ $? != 0 ]; then
        echo "Could not kill all gunicorn processes."
        exit 4
    fi

    . /etc/rc.local
    if [ $? != 0 ]; then
        echo "Could not restart all gunicorn processes."
        exit 5
    fi

    echo "Successfully restarted gunicorn."

    if [ "$STAGE_URL" != '' ]; then
        echo "Updated site on Staging."
        echo "URL: $STAGE_URL"
    fi
    if [ "$DEPLOY_URL" != '' ]; then
        echo "Updated site on Production."
        echo "URL: $DEPLOY_URL"
    fi
fi
