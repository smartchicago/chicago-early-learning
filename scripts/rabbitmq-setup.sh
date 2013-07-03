#!/bin/bash
#
# Copyright (c) 2012 Azavea, Inc.
# See LICENSE in the project root for copying permission
#
#
# This script will setup rabbitmq and celeryd
#

# must be run as root
if [ `whoami` != "root" ]; then
  echo "This installation must be run as root."
  exit 1
fi

LOG=$PWD/log-rmq-install.log
PROJ_ROOT=`dirname $PWD`
DJANGO_ROOT="$PROJ_ROOT/python/ecep"

echo -n "" > $LOG


echo -e "\nWould you like to setup rabbitmq to use a new user? (y/n)"
read YN
if [ "$YN" == "y" ]; then
    echo -e "\nPlease enter a username:"
    read USER

    PASSWD=""
    PASSWD1="1"
    while [ "$PASSWD" != "$PASSWD1" ]; do
        echo -e "\nEnter a password:"
        read PASSWD

        echo -e "\nEnter it again:"
        read PASSWD1

        if [ "$PASSWD" != "$PASSWD1" ]; then
            echo "Sorry, passwords don't match, try again"
        fi
    done

    # Update rabbitmq w/ new user, give them full access to everything
    # Stolen from http://blog.azreda.org/2012/09/asynchronous-tasks-complete-celery-with.html
    # Technically should deal w/ vhosts, but anyone who needs to will probably figure that
    # out for themselves.
    rabbitmqctl add_user $USER $PASSWD &>> $LOG
    rabbitmqctl set_permissions -p / $USER ".*" ".*" ".*" &>> $LOG
    rabbitmqctl delete_user guest &>> $LOG

    # Update django settings to use new user
    pushd $DJANGO_ROOT
    echo "" >> local_settings.py
    echo "BROKER_URL = 'amqp://$USER:$PASSWD@localhost:5672/'" >> local_settings.py
    popd
fi

echo -e "\nWould you like to use a dedicated celery worker for this app? (y/n)"
read YN
if [ "$YN" == "y" ]; then
    # May need this if we need the next part?
    # /usr/lib/rabbitmq/bin/rabbitmq-plugins enable rabbitmq_management

    # This is how you make queues, but I think celery makes it automatically?
    # ./rabbitmqadmin.py declare queue name=$QUEUE_NAME auto_delete=False durable=True

    # Get a queue name
    echo ""
    echo "The following queues are already present on this system:"
    rabbitmqctl list_queues
    echo -e "\nEnter a unique name for the queue:"
    read QUEUE_NAME

    if [ "$QUEUE_NAME" == "" ]; then
        echo "Error: you must enter a valid queue name"
        exit 2
    fi

    # Modify django settings to use the queue
    pushd $DJANGO_ROOT
    cat >> local_settings.py <<EOF
from kombu import Exchange, Queue
CELERY_QUEUES = (Queue($QUEUE_NAME, Exchange('default')),)
CELERY_DEFAULT_QUEUE = $QUEUE_NAME
CELERY_DEFAULT_EXCHANGE_TYPE = 'direct'
EOF
    popd

    # Make custom config file for our celery worker (it gets the same name as the queue)
    pushd "$PROJ_ROOT/config"
    CFG="$(pwd)/django-celery.local.config"
    cp django-celery.config $CFG
    sed -i s/@QUEUE_NAME@/$QUEUE_NAME/g $CFG
    sed -i s/@PROJ_ROOT@/$DJANGO_ROOT/g $CFG
    popd

    # Now make a System V init script that calls the celeryd init script using our settings
    INITD="/etc/init.d"
    pushd $INITD
    INIT_SCRIPT="$INITD/celeryd-$QUEUE_NAME"
    cat > $INIT_SCRIPT <<EOF
CELERY_DEFAULTS="$CFG"
export CELERY_DEFAULTS
. "$PROJ_ROOT/scripts/celeryd"
EOF
    popd
    
    # Now make it fire on startup
    pushd ../rc5.d
    ln $INIT_SCRIPT S50celeryd-$QUEUE_NAME
    popd
fi

