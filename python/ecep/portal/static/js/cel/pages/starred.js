/********************************************************
 * Copyright (c) 2013 Azavea, Inc.
 * See LICENSE in the project root for copying permission
 * JavaScript for the starred locations page 
 ********************************************************/

'use strict';
 
define(['jquery', 'Leaflet', 'text!templates/location.html', 'common', 'jquery-cookie'], 
    function($, L, html) {

        $(document).ready(function() {
    
            // Draw the Handlebars template for a location 
            function drawStarredLocation(data) {
                var template = Handlebars.compile(html);
                $('.container').append(template(data));

                // Remove map and share button for each location
                $('.single-location-map').hide();
                $('.single-share').hide();
            }

            var cookieopts = CEL.serverVars.starredcookie;

            // get location ids:
            // url --> array :: /starred/12,13,54/  --> [12, 13, 54]
            //      -- or --
            // cookie string --> array :: "12,31,42" --> [12, 31, 42]
            var cookie = $.cookie(cookieopts.name),
                starredIdsString = window.location.pathname.split('/')[2] || cookie || "",
                starredIds = starredIdsString ? starredIdsString.split(',') : [], 
                numStarredIds = starredIds.length;

            // Get html for each location id
            for (var i = 0; i < numStarredIds; i++) {
                $.getJSON(window.location.origin + '/api/location/' + starredIds[i], drawStarredLocation);
            }

            $('#fav-count').html(numStarredIds);

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

