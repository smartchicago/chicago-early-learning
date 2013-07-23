/********************************************************
 * Copyright (c) 2013 Azavea, Inc.
 * See LICENSE in the project root for copying permission
 * JavaScript for the starred locations page 
 ********************************************************/

'use strict';
 
define(['jquery', 'Leaflet', 'text!templates/location.html', 'common', 'jquery-cookie'], 
    function($, L, html, common) {

        $(document).ready(function() {
    
            // Draw the Handlebars template for a location 
            function drawStarredLocations(data) {
                var template = Handlebars.compile(html);
                for (var i in data.locations) {
                    var loc = data.locations[i];
                    $('.container').append(template(loc));
                }

                // Remove map and share button for each location
                $('.single-location-map').hide();
                $('.single-share').hide();
                $('#fav-count').html(data.locations.length);
            }

            var cookieopts = CEL.serverVars.starredcookie;

            // get location ids:
            // url --> string :: /starred/12,13,54/  --> "12,13,54" 
            //      -- or --
            // cookie string 
            var cookie = $.cookie(cookieopts.name),
                regexResult = /([0-9,]+)/.exec(window.location.pathname),
                starredIds = regexResult[1] || cookie || "";

            $.getJSON(common.getUrl('location-api') + starredIds, drawStarredLocations);

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

