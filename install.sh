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

# install requirements via apt-get
echo -e "\nInstalling required packages with 'apt'"
apt-get install -q -y screen openssh-server gunicorn python-django build-essential libgeos-dev libproj-dev libexpat1-dev pkg-config libiconv-hook-dev python-dev &> $LOG

# build in R*Tree support to SQLite
install_from_source() {
    # URL
    if [ -z "$1" ]; then
        return 1
    fi

    # Archive
    if [ -z "$2" ]; then
        return 2
    fi

    # Extracted dir
    if [ -z "$3" ]; then
        return 3
    fi

    # CFLAGS
    if [ -z "$4" ]; then
        CFLAGS=
    else
        CFLAGS=$4
    fi

    # Configure options
    if [ -z "$5" ]; then
        CFG_OPTS=
    else
        CFG_OPTS=$5
    fi

    echo -e "\nDownloading $1$2"
    wget -q -T 30 $1$2

    echo "Extracting $2"
    tar zxf $2
    cd $3

    if [ -z "$6" ]; then
        echo "Building $3"
        echo -e "\n##\n## Results from the command 'CFLAGS=$CFLAGS ./configure $CFG_OPTS':\n##" >> $LOG
        CFLAGS=$CFLAGS ./configure $CFG_OPTS &>> $LOG
        echo -e "\n##\n## Results from the command 'make install'\n##" >> $LOG
        make install &>> $LOG
    else
        mv setup.cfg setup.cfg.orig
        sed -e "s/#include_/include_/" -e "s/#library/library/" -e "s/define=SQL/#define=SQL/" setup.cfg.orig > setup.cfg
        echo -e "\n##\n## Results from the command 'python setup.py install'\n##" >> $LOG
        python setup.py install
    fi
    cd ..

    echo "Cleaning up $3"
    rm $2
    rm -rf $3
}

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

echo -e "\nSQLite with R*Tree support"
install_from_source http://sqlite.org/ sqlite-amalgamation-3.6.23.1.tar.gz sqlite-3.6.23.1 "-DSQLITE_ENABLE_RTREE=1"

echo -e "\nFreeXL library for reading MS Excel data files"
install_from_source http://www.gaia-gis.it/gaia-sins/freexl-sources/ freexl-1.0.0d.tar.gz freexl-1.0.0d

echo -e "\nlibspatialite"
install_from_source http://www.gaia-gis.it/gaia-sins/libspatialite-sources/ libspatialite-amalgamation-3.0.1.tar.gz libspatialite-amalgamation-3.0.1 "" "--disable-geosadvanced --without-freexl"

echo -e "\nSpatiaLite Tools"
install_from_source http://www.gaia-gis.it/gaia-sins/spatialite-tools-sources/ spatialite-tools-3.0.0-stable.tar.gz spatialite-tools-3.0.0-stable

echo -e "\npysqlite"
install_from_source http://pysqlite.googlecode.com/files/ pysqlite-2.6.0.tar.gz pysqlite-2.6.0 "" "" true

echo -e "\nRemoving development packages with 'apt'"
apt-get remove -q -y build-essential libgeos-dev libproj-dev libexpat1-dev pkg-config libiconv-hook-dev python-dev &> $LOG
apt-get autoremove &> $LOG

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
    echo "        try_files $uri @proxy_to_app;" >> $CFG
    echo "    }" >> $CFG
    echo "    location @proxy_to_app {" >> $CFG
    echo "        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;" >> $CFG
    echo "        proxy_set_header Host $http_host;" >> $CFG
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
