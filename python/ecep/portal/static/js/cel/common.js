/* Main app file for CEL project
 * Mostly stolen from requirejs examples: http://requirejs.org/docs/api.html
 * See http://requirejs.org/docs/api.html for details
 */

define(['jquery', 'Leaflet', '../lib/response', 'Handlebars', 'slidepanel', 'bootstrap', 
        'jquery-ui', 'jquery-cookie', CEL.serverVars.gmapRequire], 
function($, L, Response, Handlebars) {
    'use strict';

    var desktopBreakpoint = 1024;
    
    $(document).ready(function() {

        // collapse filter div on mobile
        //  this is the manual way to do it. A bit hacky.
        //  TODO: export breakpoints if we continue to use response.js
        var width = $(document).width();
        if (width >= desktopBreakpoint) {
            $('#collapseFilters').addClass('in');
        }

        // AUTOCOMPLETE
        var $autocomplete = $('.autocomplete-searchbox');

        // autocomplete helper function that makes the request to
        //  the google maps geocoder API
        function getGeocoderAddresses(request, response) {
            var geocoder = new google.maps.Geocoder(),
                acSettings = CEL.serverVars.autocomplete,
                // Static bounds. Ideally these lat/lng pairs should be set to be slightly larger
                //      than the bounding box of all Locations in the database.
                northEast = new google.maps.LatLng(acSettings.nelat, acSettings.nelng),
                southWest = new google.maps.LatLng(acSettings.swlat, acSettings.swlng),
                bounds = new google.maps.LatLngBounds(southWest, northEast);

            geocoder.geocode( 
                    {
                        address: request.term,
                        bounds: bounds,
                        region: 'US'
                    }, 
                    function(results, status) {
                        var cleanedResults = [],
                            result,
                            lat,
                            lon,
                            resultLocation,
                            likelyResult,
                            $element = $('.autocomplete-searchbox');

                        for (var i in results) {
                            result = results[i];
                            lat = result.geometry.location.lat();
                            lon = result.geometry.location.lng();
                            resultLocation = new google.maps.LatLng(lat, lon);
                            if (bounds.contains(resultLocation)) {
                                cleanedResults.push({
                                    lat: lat,
                                    lon: lon,
                                    label: result.formatted_address,
                                    value: result.formatted_address
                                });
                            }
                        }
                        if (cleanedResults.length === 0) {
                            cleanedResults.push({
                                label: "No Results",
                                value: "No Results"
                            });
                        } else {
                            // push first result to input element
                            //      just like in autocomplete success handler below
                            likelyResult = cleanedResults[0];
                            $element.data({
                                lat: likelyResult.lat,
                                lon: likelyResult.lon
                            });
                        }
                        response(cleanedResults);
                    }
             );
        }

        /*
         * Sets window.location.href to appropriate value based on selected autocomplete result
         * See: http://api.jqueryui.com/autocomplete/#event-select
         *      for details on the ui object
         */
        var submitAutocomplete = function(ui) {
            if (ui.item) {
                if (ui.item.type === 'location') {
                    window.location.href = getUrl(
                        'single-location', { location: ui.item.id });
                } else if (ui.item.type === 'neighborhood') {
                    window.location.href = getUrl(
                        'browse-neighborhood', { neighborhood: ui.item.id });
                } else if (ui.item.lat && ui.item.lon) {
                    window.location.href = getUrl(
                        'browse-latlng', { lat: ui.item.lat, lng: ui.item.lon, zoom: 14 });
                }
            }
            // default
            window.location.href = getUrl('browse');
        };

        /*
         *  Spoof the jquery ui select function ui object using the input element data attributes
         */
        var spoofSubmitAutocomplete = function() {
            var ui = {
                item: $autocomplete.data()
            };
            submitAutocomplete(ui);
        };

        /* 
         * Submit the first autocomplete result on button click if none is populated
         */
        $('.autocomplete-submit').on('click', function(e) {
            spoofSubmitAutocomplete();
        });

        /* 
         * Submit the first autocomplete result on enter if no result is populated
         * This also overrides the functionality in the select callback below
         */
        $autocomplete.on('keyup', function(e) {
            if (e.which === 13) {
                spoofSubmitAutocomplete();
            }
        });

        /*
         * Autocomplete widget setup and all relevant callbacks
         */
        var autocomplete = $autocomplete.autocomplete({
            source: function(request, response) {
                var self = this;
                $.ajax({
                    url: '/api/autocomplete/' + encodeURIComponent(request.term),
                    success: function(json) {
                        if (!json || !json.response) {
                            return;
                        }
                        var data = json.response;
                        if (data.length > 0) {
                            // push first result as data attrs of the input element
                            //      so we can access it externally
                            var likelyResult = data[0];
                            $('.autocomplete-searchbox').data({
                                id: likelyResult.id,
                                type: likelyResult.type
                            });
                            // use returned schools and neighborhoods
                            response($.map(data, function(value) {
                                return {
                                    id: value.id,
                                    type: value.type,
                                    label: value.name,
                                    value: value.name
                                };
                            }));
                        } else {
                            getGeocoderAddresses(request, response);
                        }
                    },
                    error: function(e, status, error) {
                        getGeocoderAddresses(request, response);
                    }
                });
            },
            select: function(event, ui) {
                submitAutocomplete(ui);
            },
            focus: function(event, ui) {
                // mirror data to the input element so the proper item is submitted
                $('.autocomplete-searchbox').data({
                    id: ui.item.id,
                    type: ui.item.type,
                    lat: ui.item.lat,
                    lon: ui.item.lon
                });
            },
            minLength: 2        // do not make a request until we have typed two chars
        });
        // END AUTOCOMPLETE
    });

    // Hide the address bar on mobile browsers
    // TODO: More robust solution: http://mobile.tutsplus.com/tutorials/mobile-web-apps/remove-address-bar/
    /*
    window.addEventListener("load",function() {
        setTimeout(function(){
            window.scrollTo(0, 1);
        }, 0);
    });
    */


    // Setup Response stuff
    Response.create({ mode: 'markup', prefix: 'r', breakpoints: [0,480,767,desktopBreakpoint] });
    Response.create({ mode: 'src',  prefix: 'src', breakpoints: [0,480,767,desktopBreakpoint] });


    /**
     * Central api for getting urls for the app
     * @param { logical name of the endpoint } name
     * @param { Options for creating the url, depends on name } opts
     * @return { URL string for request }
     */
    var getUrl = function (name, opts) {
        switch (name) {
            case 'location-api':
                return '/api/location/';
            case 'neighborhood-api':
                return '/api/neighborhood/';
            case 'neighborhoods-topo':
                return '/static/js/neighborhoods-topo.json';
            case 'neighborhoods-geojson':
                return '/static/js/neighborhoods.json';
            case 'browse-latlng':
                var url = '/browse/?lat=' + opts.lat + '&lng=' + opts.lng;
                if (opts.zoom) {
                    url += '&zoom=' + opts.zoom;
                }
                return url;
            case 'browse-neighborhood':
                return '/browse/?neighborhood=' + opts.neighborhood;
            case 'browse-location':
                return '/browse/?location=' + opts.location;
            case 'single-location':
                return '/location/' + opts.location + '/';
            case 'icon-school':
                return '/static/img/leaflet-icons/school.png';
            case 'icon-school-accredited':
                return '/static/img/leaflet-icons/school-accredited.png';
            case 'icon-school-starred':
                return '/static/img/leaflet-icons/school-starred.png';
            case 'icon-school-accredited-starred':
                return '/static/img/leaflet-icons/school-accredited-starred.png';
            case 'icon-center':
                return '/static/img/leaflet-icons/center.png';
            case 'icon-center-accredited':
                return '/static/img/leaflet-icons/center-accredited.png';
            case 'icon-center-starred':
                return '/static/img/leaflet-icons/center-starred.png';
            case 'icon-center-accredited-starred':
                return '/static/img/leaflet-icons/center-accredited-starred.png';
            case 'icon-geolocation':
                return '/static/img/leaflet-icons/geocode.png';
            default:
                throw 'Unknown URL endpoint';
        }
    };

    // geolocation                                                                                  
    if ('geolocation' in navigator) {
        $(document).ready(function() {
            $('.geolocation-button').bind('click', function(e) {                                                   
                navigator.geolocation.getCurrentPosition(function(position) {                           
                    window.location.href = getUrl('browse-latlng',{ lat: position.coords.latitude, lng: position.coords.longitude });
                });                                                                                     
            });
        });
    } else {
        $('.geolocation-button').hide();
    }

    // Set up social sharing behavior
    // The options argument must be an object that contains both a url and a title,
    // which are used to construct the appropriate sharing links.
    $('#share-modal').on('init-modal', function(e, options) {
        // a lot of these urls won't work when passing 'localhost' urls, but once we 
        // move to a publically accessible url, they will work just fine
        var templates = {
                mail: 'mailto:?body={{ url }}&subject={{ title }}',
                facebook: 'http://facebook.com/sharer.php?s=100&p[url]={{ url }}&p[title]={{ title }}',
                twitter: 'https://twitter.com/share?text={{ title }}%20{{ url }}',

                // looks like google recently broke their permalink that allows adding text:
                // 'https://m.google.com/app/plus/x/?v=compose&content={{ title }}%20{{ url }}'
                // until they fix it, the following will work, but will just share the url
                gplus: 'https://plus.google.com/share?url={{ url }}'
            },
            $modal = $(this),
            $text = $('#social-text');

        // fill the input box in with the url
        $text.attr('value', options.url);

        // a url is generated for each template defined in 'templates'.
        // to add a new service, create a link with the id 'social-[service]',
        // and add a template to the 'templates' object.
        $.each(templates, function (service, template) {
            $('#social-' + service).attr('href', Handlebars.compile(template)(options));
        });

        // select the text once the dialog is shown
        $modal.on('shown', function() {
            $text.select();
        });

        // display the modal
        $modal.modal('show');
    });

    return {
        getUrl: getUrl,

        // Stolen from _.js v1.5.1
        // https://github.com/jashkenas/underscore/blob/dc5a3fa0133b7000c36ba76a413139c63f646789/underscore.js
        // See project root for license
        //
        // Returns a function, that, as long as it continues to be invoked, will not
        // be triggered. The function will be called after it stops being called for
        // N milliseconds. If `immediate` is passed, trigger the function on the
        // leading edge, instead of the trailing.
        debounce: function(func, wait, immediate) {
            var result,
                timeout = null;
            return function() {
                var context = this,
                    args = arguments,
                    later = function() {
                        timeout = null;
                        if (!immediate) result = func.apply(context, args);
                    },
                    callNow = immediate && !timeout;
                    clearTimeout(timeout);
                    timeout = setTimeout(later, wait);
                    if (callNow) {
                        result = func.apply(context, args);
                    }

                return result;
            };
        }
    };
});
