/********************************************************
 * Copyright (c) 2013 Azavea, Inc.
 * See LICENSE in the project root for copying permission
 * Requires: google-maps-api-v3; jquery; leaflet;
 ********************************************************/

'use strict';
 
define(['jquery', 'Leaflet', 'text!templates/location.html', 'common', 'jquery-cookie'], 
    function($, L, html) {

        $(document).ready(function() {
    
            // Draw the Handlebars template for a location 
            function draw_starred_location(data) {
                var template = Handlebars.compile(html);
                $('.container').append(template(data));

                // Remove map and share button for each location
                $('.single-location-map').hide();
                $('.single-share').hide();
            }

            var cookieopts = CEL.serverVars.starredcookie;

            // TODO: remove when done debugging
            //  this simply forces the cookie to be defined so we have something to demo
            //  at url: /starred.html
            if (window.location.pathname === "/starred.html") {
                $.cookie(cookieopts.name, "12,13,23,42,51", cookieopts.options);
            }

            // get location ids:
            // url --> array :: /starred/12,13,54/  --> [12, 13, 54]
            //      -- or --
            // cookie string --> array :: "12,31,42" --> [12, 31, 42]
            var cookie = $.cookie(cookieopts.name),
                starred_ids_string = window.location.pathname.split('/')[2] || cookie || "",
                starred_ids = (starred_ids_string) ? starred_ids_string.split(',') : [], 
                num_starred_ids = starred_ids.length;

            // Get html for each location id
            for (var i = 0; i < num_starred_ids; i++) {
                $.getJSON(window.location.origin + '/api/location/' + starred_ids[i], draw_starred_location);
            }

            $('#fav-count').html(num_starred_ids);

            // Click event for "Clear Selections" button
            $('#faves-clear').bind('click', function(e) {
                $('.container').empty();
                $('#fav-count').html(0);
                $.removeCookie(cookieopts.name, cookieopts.options);
            });

            // Click event for "Share" button
            $('#faves-share').bind('click', function(e) {
                // TODO: add share functionality here
            });
        });
    }
);

