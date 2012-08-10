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
    # Deploy to staging
    cd /srv/early-childhood-learning.staging

    git fetch origin
    if [ $? != 0 ]; then
        echo "Error fetching code from 'origin'"
        rm /tmp/please_staging

        exit 2
    fi

    git rebase origin/staging
    if [ $? != 0 ]; then
        echo "Error rebasing code from 'staging' branch."
        rm /tmp/please_staging

        exit 3
    fi

    RESTART=Y

    rm /tmp/please_staging
fi

if [ -e '/tmp/please_deploy' ]; then
    # Deploy to production
    cd /srv/early-childhood-learning

    git fetch origin
    if [ $? != 0 ]; then
        echo "Error fetching code from 'origin'"
        rm /tmp/please_deploy

        exit 4
    fi

    git rebase origin/master
    if [ $? != 0 ]; then
        echo "Error rebasing code from 'master' branch."
        rm /tmp/please_deploy

        exit 5
    fi

    RESTART=Y

    rm /tmp/please_deploy
fi

if [ $RESTART == 'Y' ]; then
    pkill gunicorn
    if [ $? != 0 ]; then
        echo "Could not kill all gunicorn processes."
        exit 6
    fi

    . /etc/rc.local
    if [ $? != 0 ]; then
        echo "Could not restart all gunicorn processes."
        exit 7
    fi
fi
