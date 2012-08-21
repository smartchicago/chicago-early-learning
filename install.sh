#!/bin/bash
#
# This script will install prerequisites to run the early-childhood-portal
# web application with nginx and gunicorn.
#

# must be run as root
if [ `whoami` != "root" ]; then
  echo "This installation must be run as root."
  exit 1
fi

LOG=$PWD/install.log
echo -n "" > $LOG

echo -en "\nWhere should ECEP be installed?\n[$PWD] > "
read INSTALL_DIR

if [ "x$INSTALL_DIR" == "x" ]; then
    INSTALL_DIR=$PWD
fi

echo -en "\nInstall to $INSTALL_DIR? [y/N] "
read DIR_CONFIRM

if [ "$DIR_CONFIRM" != "y" ]; then
   echo -e "\nAborting install."
   exit 1 
fi

mkdir -p $INSTALL_DIR

# install requirements via apt-get
echo -e "\nInstalling required packages with 'apt'"
apt-get install -q -y screen openssh-server nginx gunicorn postgresql-9.1-postgis gdal-bin libgdal1-1.7.0 libgeos-c1 python-psycopg2 &>> $LOG

service postgresql start &>> $LOG

easy_install pip &>> $LOG
pip install -r requirements.txt &>> $LOG

# configure postgis
echo -e "\n##\n## Messages from setting up postgis:\n##" &>> $LOG
su postgres -c "psql -f install.sql" &>> $LOG

# configure nginx
if [ -e /etc/nginx/sites-enabled/default ]; then
    rm /etc/nginx/sites-enabled/default
fi

CFG=/etc/nginx/sites-available/ecep
GCFG=/etc/gunicorn.d/ecep
    
configure_nginx() {
    if [ -z "$1" ]; then
        return 1
    fi

    if [ -e "$CFG" ]; then
        rm $CFG
    fi

    echo "upstream app_server {" > $CFG
    echo "    server unix:/tmp/gunicorn.sock fail_timeout=0;" >> $CFG
    echo "}" >> $CFG
    echo "server {" >> $CFG
    echo "    listen 80 default;" >> $CFG
    echo "    server_name _;" >> $CFG
    echo "    root $1/python/ecep/;" >> $CFG
    echo "    location / {" >> $CFG
    echo "        try_files \$uri @proxy_to_app;" >> $CFG
    echo "    }" >> $CFG
    echo "    location @proxy_to_app {" >> $CFG
    echo "        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;" >> $CFG
    echo "        proxy_set_header Host \$http_host;" >> $CFG
    echo "        proxy_redirect off;" >> $CFG
    echo "        proxy_pass http://app_server;" >> $CFG
    echo "    }" >> $CFG
    echo "    location /static-media/ {" >> $CFG
    echo "        alias $1/python/ecep/static-media/;" >> $CFG
    echo "    }" >> $CFG
    echo "}" >> $CFG

    return 0
}

configure_nginx $INSTALL_DIR

configure_gunicorn() {
    if [ -z "$1" ]; then
        return 1
    fi

    if [ -e "$GCFG" ]; then
        rm $GCFG
    fi

    echo "CONFIG = {" > $GCFG
    echo "    'mode': 'django'," >> $GCFG
    echo "    'environment': {" >> $GCFG
    echo "        'PYTHONPATH': '$1/python/ecep'," >> $GCFG
    echo "        'DJANGO_SETTINGS_MODULE': 'settings'," >> $GCFG
    echo "    }," >> $GCFG
    echo "    'working_dir': '$1/python/ecep'," >> $GCFG
    echo "    'user': 'www-data'," >> $GCFG
    echo "    'group': 'www-data'," >> $GCFG
    echo "    'args': (" >> $GCFG
    echo "        '--bind=unix:/tmp/gunicorn.sock'," >> $GCFG
    echo "        '--workers=4'," >> $GCFG
    echo "    )," >> $GCFG
    echo "}" >> $GCFG

    return 0
}

configure_gunicorn $INSTALL_DIR

pushd /etc/nginx/sites-enabled &> /dev/null
if [ -e ecep ]; then
    rm ecep
fi
ln -s $CFG
popd &> /dev/null

service gunicorn start
service nginx start

read_or_none() {
    read A
    if [ "x$A" == "x" ]; then
        A="None"
    else
        A="'$A'"
    fi
    echo "$A"
}

configure_django() {
    if [ -z "$1" ]; then
        return 1
    fi

    echo -e "\nEnable Twilio? (y/n)"
    read ET
    if [ "$ET" == "y" ]; then
        TWILIO_ENABLED="True"
        echo -e "\nEnter your Twilio credentials (you can leave these blank to use the test account)"

        echo -en "\nPlease enter your Twilio Account SID: "
        ACCOUNT_SID=$(read_or_none)

        echo -en "\nPlease enter your Twilio Account Auth Token: "
        ACCOUNT_AUTH=$(read_or_none)

        echo -en "\nPlease enter your Twilio SMS phone number in the form \"(ddd) ddd-dddd\": "
        PHONE=$(read_or_none)
    else
        TWILIO_ENABLED="False"
        ACCOUNT_SID="None"
        ACCOUNT_AUTH="None"
        PHONE="None"
    fi


    echo -en "\nPlease enter a username for the django admin: "
    read USERNAME

    echo -en "\nPlease enter an email address for the django admin: "
    read EMAIL

    LOCAL="$1/python/ecep/local_settings.py"

    echo "ADMINS = (" > $LOCAL
    echo "    ('$USERNAME', '$EMAIL')," >> $LOCAL
    echo ")" >> $LOCAL
    echo "" >> $LOCAL
    echo "TWILIO_ENABLED = $TWILIO_ENABLED" >> $LOCAL
    echo "TWILIO_ACCOUNT_SID = $ACCOUNT_SID" >> $LOCAL
    echo "TWILIO_AUTH_TOKEN = $ACCOUNT_AUTH" >> $LOCAL
    echo "TWILIO_PHONE = $PHONE" >> $LOCAL
    echo "" >> $LOCAL
    echo "MANAGERS = ADMINS" >> $LOCAL
    echo "" >> $LOCAL
    echo "MEDIA_ROOT = '$1/python/ecep/media/'" >> $LOCAL
    echo "" >> $LOCAL
    echo "STATIC_ROOT = '$1/python/ecep/static/'" >> $LOCAL
    echo "" >> $LOCAL
    echo "SECRET_KEY = 'vv=s7@tj%fbs#o=xfmb3xu-0m94g*ssxftm@u86j80xqc@kb^8'" >> $LOCAL
    echo "" >> $LOCAL
    echo "TEMPLATE_DIRS = (" >> $LOCAL
    echo "    '$1/python/ecep/templates/'" >> $LOCAL
    echo ")" >> $LOCAL
    echo "" >> $LOCAL
    echo "STAGING = False" >> $LOCAL

    # create the logging dir, and chmod it for www-data
    mkdir -p /var/log/ecep
    chmod a+rw /var/log/ecep

    return 0
}

configure_django $INSTALL_DIR
