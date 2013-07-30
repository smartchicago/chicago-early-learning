/* Main app file for CEL project
 * Mostly stolen from requirejs examples: http://requirejs.org/docs/api.html
 * See http://requirejs.org/docs/api.html for details
 */

define(['jquery', 'Leaflet', '../lib/response', 'Handlebars', 'slidepanel', 'bootstrap', 
        'jquery-ui', 'jquery-cookie', CEL.serverVars.gmapRequire], 
function($, L, Response, Handlebars) {
    'use strict';
    
    $(document).ready(function() {


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
                    window.location.href = getUrl('browse-location', { location: ui.item.id });
                } else if (ui.item.type === 'neighborhood') {
                    window.location.href = getUrl('browse-neighborhood', { neighborhood: ui.item.id });
                } else if (ui.item.lat && ui.item.lon) {
                    window.location.href = getUrl('browse-latlng', { lat: ui.item.lat, lng: ui.item.lon, zoom: 14 });
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

    });
    // END AUTOCOMPLETE


    // Tooltips for all!  Anything w/ a tooltip tag gets a tooltip
    $('[rel="tooltip"]').tooltip();


    // Setup Response stuff
    Response.create({ mode: 'markup', prefix: 'r', breakpoints: [0,480,767,1024] });
    Response.create({ mode: 'src',  prefix: 'src', breakpoints: [0,480,767,1024] });


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
            case 'autocomplete-icon':
                return '/static/img/leaflet-icons/geolocated.png';
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
        getUrl: getUrl
    };
});
