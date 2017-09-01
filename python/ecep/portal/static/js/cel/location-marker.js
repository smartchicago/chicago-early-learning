
define(['jquery', 'Leaflet', 'location',
       'common', 'favorites', CEL.serverVars.gmapRequire, 'leaflet-providers'], 
    function($, L, location, common, favorites) {
        'use strict';

        /* On page load, query api to get locations position, add marker to map
         * for location. Use google maps layer for leaflet.
         */
        $(document).ready(function() {

            var mapboxURL = '';

            if (common.isRetinaDisplay()) {
                mapboxURL = 'https://api.mapbox.com/v4/mapbox.streets/{z}/{x}/{y}@2x.png?access_token='
            } else {
                mapboxURL = 'https://api.mapbox.com/v4/mapbox.streets/{z}/{x}/{y}.png?access_token='
            }

            var accessToken = 'pk.eyJ1IjoidGhlYW5kcmV3YnJpZ2dzIiwiYSI6ImNpaHh2Z2hpcDAzZnd0bG0xeDNqYXdiOGkifQ.jV7_LuEh4KX2r5RudiQdIg';
            var mapboxTiles = L.tileLayer(mapboxURL + accessToken,
                    {attribution: 'Imagery from <a href="http://mapbox.com/about/maps/">MapBox</a>'});

            var location_id = /(\d+)/.exec(window.location.pathname)[1],
                url = common.getUrl('location-api', { locations: location_id }),
                width = $(document).width(),
                $map = $('#location-map'),
                latLng = new L.LatLng($map.data('lat'), $map.data('lng'));

            if ($map.data("address-latitude") && $map.data("address-longitude")) {
                latLng = new L.LatLng($map.data("address-latitude"), $map.data("address-longitude"));
            }
            var map = new L.Map('location-map', { center: latLng, zoom: 15, dragging: false, scrollWheelZoom: false, doubleClickZoom: false }),
                $star = $('.compare-btn');

            map.addLayer(mapboxTiles);

            if (width >= common.breakpoints.desktop) {
                $('.favs-toggle').show();
            }

            if (favorites.isStarred(location_id)) {
                favorites.toggleFavoriteButton($star, 'add');
            }

            $.getJSON(url, function(data) {
                var loc = new location.Location(data.locations[0]);
                var group = [];
                loc.setMarker({ popup: false });
                group.push(loc.getMarker());

                if ($map.data("address-latitude") && $map.data("address-longitude")) {
                    var geolocatedIcon = L.icon({iconUrl: common.getUrl('icon-geolocation'), iconSize: [50, 50]});
                    var geolocatedMarker = L.marker([$map.data("address-latitude"), $map.data("address-longitude")], {icon: geolocatedIcon});
                    group.push(geolocatedMarker);
                }
                var groupLayer = new L.layerGroup(group);
                var bounds = L.featureGroup(group).getBounds();
                map.fitBounds(bounds);

                map.addLayer(groupLayer);

                

                $star.on('click', function(e) {
                    favorites.toggleFavoriteButton($star);
                    loc.setMarker();

                    // If the user toggled it on, redirect them
                    if ($star.hasClass('btn-blue') && $star.data('redirect')) {
                        setTimeout(function () {
                            window.location = $star.data('redirect');
                        }, 300);
                    }
                });
            });
        });
    }
);

