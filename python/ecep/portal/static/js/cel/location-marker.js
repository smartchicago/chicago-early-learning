/********************************************************
 * Copyright (c) 2013 Azavea, Inc.
 * See LICENSE in the project root for copying permission
 * Requires: google-maps-api-v3; jquery; leaflet;
 ********************************************************/

'use strict';
 
define(['jquery', 'Leaflet', 'server-vars', 'text!templates/location.html', 'common'], function($, L, serverVars, html) {
    // These nested require statements are kind of silly, but I need serverVars.gmapKey...
    var gmapRequire = "async!http://maps.googleapis.com/maps/api/js?v=3.2&key=" +
        serverVars.gmapKey + "&sensor=false";
    require([gmapRequire], function() {
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
            $.getJSON(window.location.pathname + 'position', function(data) {
                var lat = data[0].lat,
                    lng = data[0].lng,
                    map = new L.Map('location-map', {center: new L.LatLng(lat, lng), zoom: 13}),
                    gmap = new L.Google('ROADMAP');
                
                map.addLayer(gmap);
                L.marker([lat, lng], {icon: schoolIcon}).addTo(map);
                map.panTo(new L.LatLng(lat, lng));
            });
        });
    });
});

