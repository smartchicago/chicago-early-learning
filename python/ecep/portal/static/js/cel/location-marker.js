/********************************************************
 * Copyright (c) 2013 Azavea, Inc.
 * See LICENSE in the project root for copying permission
 * Requires: google-maps-api-v3; jquery; leaflet;
 ********************************************************/

define(['jquery', 'Leaflet', 'location',
       'common', 'favorites', CEL.serverVars.gmapRequire, 'leaflet-providers'], 
    function($, L, location, common, favorites) {
        'use strict';

        /* On page load, query api to get locations position, add marker to map
         * for location. Use google maps layer for leaflet.
         */
        $(document).ready(function() {

            var accessToken = 'pk.eyJ1IjoidGhlYW5kcmV3YnJpZ2dzIiwiYSI6ImNpaHh2Z2hpcDAzZnd0bG0xeDNqYXdiOGkifQ.jV7_LuEh4KX2r5RudiQdIg';
            var mapboxTiles = L.tileLayer('https://api.mapbox.com/v4/mapbox.streets/{z}/{x}/{y}.png?access_token=' + accessToken,
                    {attribution: 'Imagery from <a href="http://mapbox.com/about/maps/">MapBox</a>'});

            var location_id = /(\d+)/.exec(window.location.pathname)[1],
                url = common.getUrl('location-api', { locations: location_id }),
                width = $(document).width(),
                $map = $('#location-map'),
                latLng = new L.LatLng($map.data('lat'), $map.data('lng')),
                map = new L.Map('location-map', { center: latLng, zoom: 13, dragging: false }),
                $star = $('.favs-toggle');

            map.addLayer(mapboxTiles);

            if (width >= common.breakpoints.desktop) {
                $('.favs-toggle').show();
            }

            if (favorites.isStarred(location_id)) {
                favorites.toggle($star);
            }

            $('.single-share').show().on('click', function(e) {
                $('#share-modal').trigger('init-modal', {                                           
                    // the url is passed in to the sharing urls, so it must be absolute             
                    url: common.getUrl('origin') + 
                        common.getUrl('single-location', { location: location_id }), 
                    title: 'Check out this early learning program'                                  
                });
            });

            $.getJSON(url, function(data) {
                var loc = new location.Location(data.locations[0]);

                loc.setMarker({ popup: false });
                loc.getMarker().addTo(map);

                $star.on('click', function(e) {
                    favorites.toggle($star);
                    loc.setMarker();

                    // If the user toggled it on, redirect them
                    if ($star.hasClass('favs-button-selected') && $star.data('redirect')) {
                        setTimeout(function () {
                            window.location = $star.data('redirect');
                        }, 300);
                    }
                });
            });
        });
    }
);

