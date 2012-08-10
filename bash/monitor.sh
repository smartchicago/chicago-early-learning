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

if [ -e '/tmp/please_staging' ]; then
    echo "Deploy to staging"
    cd /srv/early-childhood-portal.staging

    su ec2-user -c "git pull --rebase origin staging"
    if [ $? != 0 ]; then
        echo "Error fetching and rebasing code from 'origin'"
        rm /tmp/please_staging

        exit 2
    fi

    cd python/ecep
    su ec2-user -c "./manage.py collectstatic --noinput"

    RESTART=Y

    rm /tmp/please_staging
fi

if [ -e '/tmp/please_deploy' ]; then
    echo "Deploy to production"
    cd /srv/early-childhood-portal

    su ec2-user -c "git pull --rebase origin master"
    if [ $? != 0 ]; then
        echo "Error fetching code from 'origin'"
        rm /tmp/please_deploy

        exit 3
    fi

    cd python/ecep
    su ec2-user -c "./manage.py collectstatic --noinput"

    RESTART=Y

    rm /tmp/please_deploy
fi

if [ $RESTART == 'Y' ]; then
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
fi

echo "Success"
