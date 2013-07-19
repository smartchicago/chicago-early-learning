/********************************************************
 * Copyright (c) 2013 Azavea, Inc.
 * See LICENSE in the project root for copying permission
 * Requires: google-maps-api-v3; jquery; leaflet;
 ********************************************************/

'use strict';
 
define(['jquery', 'Leaflet', 'text!templates/location.html', 'common', CEL.serverVars.gmapRequire], 
    function($, L, html) {
        var schoolIcon = L.icon({
            iconUrl: '/static/img/leaflet-icons/marker-school.png',
            shadowUrl: '/static/img/leaflet-icons/marker-shadow.png',

            iconSize:     [35, 45], // size of the icon
            shadowSize:   [41, 41], // size of the shadow
            iconAnchor:   [10, 60], // point of the icon which will correspond to marker's location
            shadowAnchor: [4, 62],  // the same for the shadow
            popupAnchor:  [-3, -76] // point from which the popup should open relative to the iconAnchor
        });

        /* On page load, query api to get locations position, add marker to map
         * for location. Use google maps layer for leaflet.
         */
        $(document).ready(function() {
            var location_id = /(\d+)/.exec(window.location.pathname)[1];
            $.getJSON(window.location.origin + '/api/location/' + location_id, function(data) {
                // Need to build html first so leaflet can find the map-location div
                var template = Handlebars.compile(html);
                $('.container').append(template(data));

                var lat = data.position.lat,
                    lng = data.position.lng,
                    map = new L.Map('location-map', {center: new L.LatLng(lat, lng), zoom: 13}),
                    gmap = new L.Google('ROADMAP');
                
                map.addLayer(gmap);
                L.marker([lat, lng], {icon: schoolIcon}).addTo(map);
                map.panTo(new L.LatLng(lat, lng));
            });
        });
    }
);

