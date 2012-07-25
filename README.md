# Early Childhood Education Portal

## Installation

This web application is designed to be installed on a fresh copy of Ubuntu Server 12.04.

After installation of Ubuntu Server 12.04, run the following commands from the terminal:

* sudo apt-get install -y git
* git clone git://github.com/smartchicago/early-childhood-portal.git
* sudo ./install.sh

The installer will go through the process of:

- Setting up the installation directory
- Loading distribution software packages required for building and running
- Download, build, and install packages required for running
- Remove packages used during build only
- Setup nginx (webserver)
- Setup gunicorn (appserver)
- Start nginx
- Start gunicorn

## Support

Please log any bugs or errors with the issue tracker on [github][https://github.com/smartchicago/early-childhood-portal/issues].