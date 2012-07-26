# Early Childhood Education Portal

## Installation

This web application is designed to be installed on a fresh copy of Ubuntu Server 12.04.

After installation of Ubuntu Server 12.04, run the following commands from the terminal:

* sudo apt-get install -y git
* git clone git://github.com/smartchicago/early-childhood-portal.git
* sudo ./install.sh

The installer will go through the process of:

- Setting up the installation directory
- Setup nginx (webserver)
- Setup gunicorn (appserver)
- Start nginx
- Start gunicorn
- Setup postgis
- Create a django local_settings.py file

After running ./install.sh, the database will need to be initialized for use by django with:

    cd python/ecep
    python manage.py syncdb

## Support

Please log any bugs or errors with the issue tracker on [github][https://github.com/smartchicago/early-childhood-portal/issues].
