/* Main app file for CEL project
 * Mostly stolen from requirejs examples: http://requirejs.org/docs/api.html
 */

'use strict';

define(['jquery-ui-autocomplete', 'Leaflet', '../lib/response', 'bootstrap', 'Leaflet-google'], function($, L, Response) {
    // See http://requirejs.org/docs/api.html for details
    console.debug('common.js loaded!');
    /*
    if ($) {
        console.debug('jquery loaded!');
    }
    if ($.fn.popover) {
        console.debug('bootstrap loaded!');
    }
    if (L) {
        console.debug('Leaflet loaded!');
    }
    if (Response) {
        console.debug('Response loaded!');
    }
    if (L.Google) {
        console.debug('Leaflet-google loaded!');
    }
    */

    $(document).ready(function() {

        // autocomplete helper function that makes the request to
        //  the google geocoder API
        function getGeocoderAddresses(request, response) {
            $.ajax({
                url: "http://maps.googleapis.com/maps/api/geocode/json",
                data: {
                    sensor: false,
            components: "country:US",
            address: request.term
                },
                success: function(json) {
                    if (!json || !json.results) return;
                    var data = json.results;
                    response($.map(data, function(value) {
                        return {
                            "lat": value.geometry.location.lat,
                        "lon": value.geometry.location.lon,
                        "label": value.formatted_address,
                        "value": value.formatted_address
                        };
                    }));
                }, 
                error: function(e, status, error) {
                    //console.log('Google Geocoder Error', e);
                    response(['No Results']);
                }
            });
        }

        // autocomplete for all textboxes on the page
        $('.autocomplete-searchbox').autocomplete({
            source: function(request, response) {
                $.ajax({
                    url: "/api/autocomplete/" + encodeURIComponent(request.term),
                success: function(json) {
                    if (!json || !json.response) return;
                    var data = json.response;
                    if (data.length > 0) {
                        // use returned schools and neighborhoods
                        response($.map(data, function(value) {
                            return {
                                "id": value.id,
                            "type": value.type,
                            "label": value.name,
                            "value": value.name
                            }
                        }));
                    } else {
                        //console.log('Location/Neighborhood API empty');
                        getGeocoderAddresses(request, response);
                    }
                },
                error: function(e, status, error) {
                    //console.log('Location/Neighborhood API Error');
                    getGeocoderAddresses(request, response);
                }
                });
            },
            select: function(event, ui) {
                if (ui.item) {
                    // dummy functionality opens single location view on select
                    if (ui.item.type == "location") {
                        window.location.href = "/location/"+ui.item.id;
                    }
                }
            },
            minLength: 2
        });
    });

});
