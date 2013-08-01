/********************************************************
 * Copyright (c) 2013 Azavea, Inc.
 * See LICENSE in the project root for copying permission
 * Requires: google-maps-api-v3; jquery; leaflet;
 ********************************************************/

'use strict';
 
define(['jquery', 'Leaflet', 'text!templates/location.html', 'location', 'common', 
        CEL.serverVars.gmapRequire, 'leaflet-providers'], 
    function($, L, html, location, common) {

        /* On page load, query api to get locations position, add marker to map
         * for location. Use google maps layer for leaflet.
         */
        $(document).ready(function() {
            var location_id = /(\d+)/.exec(window.location.pathname)[1];
            $.getJSON(common.getUrl('location-api') + location_id, function(data) {
                var loc = new location.Location(data.locations[0]),
                    // need to build the template first so leaflet can find the map
                    template = Handlebars.compile(html);

                $('.container > .row').append(template(loc.data));

                var latLng = loc.getLatLng(), 
                    map = new L.Map('location-map', {center: latLng, zoom: 13});
                
                L.tileLayer.provider('Acetate.all').addTo(map);             // basemap 
                loc.setMarker({ popup: false });
                loc.getMarker().addTo(map);
                map.panTo(latLng);
            });
        });
    }
);

