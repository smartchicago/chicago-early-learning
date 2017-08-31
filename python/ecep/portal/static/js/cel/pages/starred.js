
define(['jquery', 'Leaflet', 'text!templates/location.html', 'text!templates/fave-row.html', 'common', 'favorites', 'Handlebars'],
    function($, L, html, html_row, common, favorites, Handlebars) {
        'use strict';

        $(document).ready(function() {

            var $apply_button = $('#faves-contact'),
                apply_sites = [];

            // Draw the Handlebars template for a location
            function drawTable(data, copa_locations, non_copa_locations) {
                var template = Handlebars.compile(html_row),
                    $copa_body = $('#copa-table'),
                    $non_copa_body = $('#non-copa-table'),
                    copa_faves = [],
                    non_copa_faves = [],
                    application_site_ids = [],
                    application_site_total = application_site_ids.length,
                    copa_total = copa_locations.length,
                    non_copa_total = non_copa_locations.length;

                for (var i=0; i < copa_total; i++) {
                    var loc = copa_locations[i];
                    loc.index = i + 1;
                    var $location = $(template(loc));
                    copa_faves.push($location);
                }

                for (var i=0; i < non_copa_total; i++) {
                    var loc = non_copa_locations[i];
                    loc.index = i + 1;
                    var $location = $(template(loc));
                    non_copa_faves.push($location);
                }

                if (copa_total > 0) {
                    $copa_body.html(copa_faves);
                }
                if (non_copa_total > 0) {
                    $non_copa_body.html(non_copa_faves);
                    $('#non-copa').show();
                }
                if (application_site_total == 0) { $apply_button.addClass('disabled'); }


                // Set removal listeners
                $('.hide-fave').on('click', function(e) {
                    var $favorite = $(this),
                        id = $favorite.data('id'),
                        key = $favorite.data('key'),
                        $fave_row = $('#fave-' + id);

                    favorites.removeIdFromCookie(id);
                    uncheckSite(id, key);

                    if ( key ) {
                        copa_total--;
                    } else {
                        non_copa_total--;
                    }
                    $fave_row.hide();

                    if ( copa_total == 0 ) { $('.empty-faves').show(); }
                    if ( non_copa_total == 0 ) { 
                        $('#non-copa').hide();
                    }
                });

                // Set apply checkbox listeners
                $('.apply-checkbox').on('change', function(e) {
                    var $favorite = $(this),
                        id = $favorite.data('id'),
                        key = $favorite.data('key');

                    if (this.checked) {
                        checkSite(id, key);
                    } else {
                        uncheckSite(id, key);
                    }
                });

            }

            function drawMap(data, copa_locations, non_copa_locations) {
                var mapboxURL = '',
                    $map = $('#location-map'),
                    latLng;

                if ($map.data("address-latitude") && $map.data("address-longitude")) {
                    latLng = new L.LatLng($map.data("address-latitude"), $map.data("address-longitude"));
                }

                if (common.isRetinaDisplay()) {
                    mapboxURL = 'https://api.mapbox.com/v4/mapbox.streets/{z}/{x}/{y}@2x.png?access_token='
                } else {
                    mapboxURL = 'https://api.mapbox.com/v4/mapbox.streets/{z}/{x}/{y}.png?access_token='
                }

                var accessToken = 'pk.eyJ1IjoidGhlYW5kcmV3YnJpZ2dzIiwiYSI6ImNpaHh2Z2hpcDAzZnd0bG0xeDNqYXdiOGkifQ.jV7_LuEh4KX2r5RudiQdIg';
                
                var mapboxTiles = L.tileLayer(mapboxURL + accessToken,
                    {attribution: 'Imagery from <a href="http://mapbox.com/about/maps/">MapBox</a>'});

                var map = new L.Map('location-map', { center: latLng, zoom: 15});

                var copa_markers = []
                $.each(copa_locations, function(i, location) {
                    var copa_icon = new L.divIcon({
                        className: "cel-icon copa-location-icon",
                        iconSize: new L.point(50, 50),
                        html: i + 1
                    });
                    
                    copa_markers.push(L.marker([location.geometry.latitude, location.geometry.longitude], {icon: copa_icon}));
                });

                var non_copa_markers = []
                $.each(non_copa_locations, function(i, location) {
                    var copa_icon = new L.divIcon({
                        className: "cel-icon non-copa-location-icon",
                        iconSize: new L.point(50, 50),
                        html: i + 1
                    });
                    
                    non_copa_markers.push(L.marker([location.geometry.latitude, location.geometry.longitude], {icon: copa_icon}));
                });

                var bounds = L.featureGroup($.merge(copa_markers, non_copa_markers)).getBounds();
                map.fitBounds(bounds, {padding: [50, 50]});

                var copaLayer = new L.layerGroup(copa_markers),
                    nonCopaLayer = new L.layerGroup(non_copa_markers);
                map.addLayer(mapboxTiles);
                map.addLayer(copaLayer);
                map.addLayer(nonCopaLayer);

                if (latLng) {
                    var geolocatedIcon = L.icon({iconUrl: common.getUrl('icon-geolocation'), iconSize: [50, 50], iconAnchor: [17, 45]}),
                        geolocatedMarker = L.marker([latLng.lat, latLng.lng], {icon: geolocatedIcon}).addTo(map).setZIndexOffset(1000);
                }
            }

            function checkSite(id, key) {
                apply_sites.push(key);
                if (apply_sites.length > 0) { $apply_button.removeClass('disabled'); }
                if (apply_sites.length == 2) {
                    $('input:checkbox:not(:checked)').attr('disabled', true);
                }
                var copa_url = common.getUrl('copa-apply', { ids: apply_sites});
                $('#faves-contact').attr('href', copa_url);
            }

            function uncheckSite(id, key) {
                apply_sites = apply_sites.filter(function (item) {
                    return item !== key;
                });
                var copa_url = common.getUrl('copa-apply', { ids: apply_sites});
                $('#faves-contact').attr('href', copa_url);
                if (apply_sites.length == 0) {$apply_button.addClass('disabled');}
                $('input:checkbox:disabled').attr('disabled', false);
            }

            // get location ids:
            // url --> string :: /starred/12,13,54/  --> "12,13,54"
            //      -- or --
            // cookie string
            var cookie = favorites.getCookie(),
                regexResult = /([0-9,]+)/.exec(window.location.pathname),
                starredIds = "";

            if (regexResult || cookie) {
                

                starredIds = regexResult ? regexResult[1] : cookie;
                $.getJSON(common.getUrl('starred-location-api', { locations: starredIds }), function (results) {
                    
                    var locations = results.locations,
                        copa = [],
                        non_copa = [];

                    for (var i=0; i<locations.length; i++) {
                        if (locations[i].copa.key == 0) {
                            non_copa.push(locations[i]);
                        } else {
                            copa.push(locations[i]);
                        }
                    }

                    if ( copa.length == 0 ) { $('.empty-faves').show(); }
                    drawTable(results, copa, non_copa);
                    drawMap(results, copa, non_copa);
                });
            } else {
                $('.empty-faves').show();
            }

            if(regexResult) {
                var initial_ids = regexResult[1].split(',');
                $.each(initial_ids, function(i, value) {
                    favorites.addIdToCookie(value);
                });
            }

            favorites.addClearListener();

            // Handle back button logic.  If there is a history.length greater than 2,
            // take them to /search/ otherwise do history.go(-1)
            $('#back-button').on('click', function(e) {
                if(regexResult) {
                    var url = window.location.protocol + '//' + window.location.host + '/search/'
                    window.location.href = url;
                }
                else {
                    window.history.go(-1);
                }
            });

            $('#faves-contact').on('click', function(e) {
                if ($('#faves-contact').hasClass('disabled')) {
                    e.preventDefault();
                }
            });

        });
    }
);

