/********************************************************
 * Copyright (c) 2013 Azavea, Inc.
 * See LICENSE in the project root for copying permission
 * Requires: google-maps-api-v3; jquery; leaflet;
 ********************************************************/

'use strict';
 
define(['jquery', 'Leaflet', 'text!templates/location.html', 'location', 'common', 'favorites', 
        CEL.serverVars.gmapRequire, 'leaflet-providers'], 
    function($, L, html, location, common, favorites) {

        /* On page load, query api to get locations position, add marker to map
         * for location. Use google maps layer for leaflet.
         */
        $(document).ready(function() {
            var location_id = /(\d+)/.exec(window.location.pathname)[1];
            var url = common.getUrl('location-api', { locations: location_id });
            //var url = '/api/location/' + location_id + '/';
            console.log(url);
            $.getJSON(url, function(data) {
                var loc = new location.Location(data.locations[0]),
                    // need to build the template first so leaflet can find the map
                    template = Handlebars.compile(html);

                $('.container > .row').append(template(loc.data));
                $('.single-location-map').show();
                $('.favs-toggle').show();

                var latLng = loc.getLatLng(), 
                    map = new L.Map('location-map', {center: latLng, zoom: 13});
                
                L.tileLayer.provider('Acetate.all').addTo(map);             // basemap 
                loc.setMarker({ popup: false });
                loc.getMarker().addTo(map);
                map.panTo(latLng);

                var $star = $('.favs-toggle');
                if (favorites.isStarred(location_id)) {
                    favorites.toggle($star);
                }
                $star.on('click', function(e) {
                    favorites.toggle($star);
                    loc.setMarker();
                });

                $('.single-share').show().on('click', function(e) {
                    $('#share-modal').trigger('init-modal', {                                           
                        // the url is passed in to the sharing urls, so it must be absolute             
                        url: document.location.origin + common.getUrl('single-location', { location: location_id }), 
                        title: 'Check out this early learning program'                                  
                    });
                });
            });
        });
    }
);

