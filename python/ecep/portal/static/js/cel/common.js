/* Main app file for CEL project
 * Mostly stolen from requirejs examples: http://requirejs.org/docs/api.html
 * See http://requirejs.org/docs/api.html for details
 */


define(['jquery', 'Leaflet', '../lib/response', 'Handlebars', 'slidepanel', 'bootstrap', 'Leaflet-google', 'jquery-ui', CEL.serverVars.gmapRequire], 
function($, L, Response, Handlebars) {
    'use strict';
    
    $(document).ready(function() {

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
                        response($.map(results, function(result) {
                            var lat = result.geometry.location[0],
                                lon = result.geometry.location[1];
                            return {
                                lat: lat,
                                lon: lon,
                                label: result.formatted_address,
                                value: result.formatted_address
                            };
                        }));
                    }
             );
        }

        // autocomplete for all textboxes on the page
        //  first tries Location and Neighborhood, then attempts to geocode the request
        $('.autocomplete-searchbox').autocomplete({
            source: function(request, response) {
                $.ajax({
                    url: '/api/autocomplete/' + encodeURIComponent(request.term),
                    success: function(json) {
                        if (!json || !json.response) {
                            return;
                        }
                        var data = json.response;
                        if (data.length > 0) {
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
                if (ui.item) {
                    // TODO: implement real functionality here
                    if (ui.item.type === 'location') {
                        window.location.href = '/location/'+ui.item.id;
                    } else if (ui.item.type === 'neighborhood') {
                        alert('Selected: ' + ui.item.id + ', ' + ui.item.label);
                    } else if (ui.item.lat && ui.item.lon) {
                        alert('Selected: ' + ui.item.lat + ', ' + ui.item.lon);
                    }
                }
            },
            minLength: 2        // do not make a request until we have typed two chars
        });
    });

    // Tooltips for all!  Anything w/ a tooltip tag gets a tooltip
    $('[rel="tooltip"]').tooltip();

    // Setup Response stuff
    Response.create({ mode: 'markup', prefix: 'r', breakpoints: [0,480,767,1024] });
    Response.create({ mode: 'src',  prefix: 'src', breakpoints: [0,480,767,1024] });

    // geolocation                                                                                  
    if ('geolocation' in navigator) {
        $(document).ready(function() {
            $('.geolocation-button').bind('click', function(e) {                                                   
                navigator.geolocation.getCurrentPosition(function(position) {                           
                    var positionString = position.coords.latitude + ", " + position.coords.longitude;   
                    // TODO:    load browse.html with the map centered on geolocated position           
                    //          at a respectable zoom level                                             
                    // placeholder for above TODO                                                       
                    $('#appendedInputButton').val(positionString);                                      
                });                                                                                     
            });
        });
    } else {
        $('.geolocation-button').hide();
    };

    return {
        getUrl: function (name) {
            switch (name) {
                case 'location-api':
                    return '/api/location/';
                case 'neighborhood-api':
                    return '/api/neighborhood/';
                case 'neighborhoods-topo':
                    return '/static/js/neighborhoods-topo.json';
                case 'neighborhoods-geojson':
                    return '/static/js/neighborhoods.json';
                default:
            throw 'Unknown URL endpoint';
        };
    }};
});
