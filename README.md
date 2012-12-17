# Early Childhood Education Portal

## About

### Purpose and overview

In order to increase transparency and empower parents, the City of Chicago is partnering with the Smart Chicago Collaborative and the University of Chicago’s Urban Education Lab (UEL) to develop a comprehensive early childhood education web portal. The portal serves as a one-stop-shop for finding early learning programs, assessing program quality, and tracking data about Chicago’s early childhood systems.


The portal is currently deployed to http://chicagoearlylearning.org



### News

http://chicago.cbslocal.com/2012/11/29/city-offers-early-learning-info-online/ (video)

http://www.examiner.com/article/mayor-emanuel-unveils-online-early-learning-portal-to-help-parents-and-families

### Features

* Zoom, pan, and other map manipulation features
* Click on a location and display attribute information
* Compare information about two different locations, side-by-side
* Geographic search (address and radius) and category filters
* Uses the GoogleMaps base map and geocoding API
* Provides Transit directions by leveraging GoogleMaps Transit capabilities
* Embedded Google Analytics to support usage tracking
* All components are open source
* Printable map
* URL for each resource in order to support bookmarking and sharing
* Responsive user interface design that adapts to tablet and web browser (smart phone support is pending)
* Supports SMS search interface
    * User can text a zip code and receive a list of all facilities in it
    * User can get details about a specific facility
* Tested and support on IE8+, Firefox 12+, and Chrome 19+


## Installation

This web application is designed to be installed on a fresh copy of Ubuntu Server 12.04.

After installation of Ubuntu Server 12.04, run the following commands from the terminal:

* sudo apt-get install -y git
* git clone git://github.com/smartchicago/early-childhood-portal.git
* sudo ./install.sh

The installer will go through the process of:

* Setting up the installation directory
* Setup nginx (webserver)
* Setup gunicorn (appserver)
* Start nginx
* Start gunicorn
* Setup postgis
* Create a django local_settings.py file

After running ./install.sh, the database will need to be initialized for use by django with:

    cd python/ecep
    python manage.py syncdb

### To update the FAQs
* Use the Django admin forms to modify/add questions as necessary
* Run './manage.py dumpdata faq.Question > portal/fixtures/question.json'
* Commit the modified json file

## Support

Please log any bugs or errors with the issue tracker on [github](https://github.com/smartchicago/chicago-early-learning/issues).
