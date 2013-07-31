/********************************************************
 * Copyright (c) 2013 Azavea, Inc.
 * See LICENSE in the project root for copying permission
 * JavaScript for the starred locations page 
 ********************************************************/

'use strict';
 
define(['jquery', 'Leaflet', 'text!templates/location.html', 'common', 'cel-cookie', 'favorites', 'jquery-cookie'], 
    function($, L, html, common, celcookie, favorites) {

        $(document).ready(function() {

            // Draw the Handlebars template for a location 
            function drawStarredLocations(data) {
                var template = Handlebars.compile(html),
                    container = $('.container'),
                    numLocations = data.locations.length;
                
                for (var i = 0; i < numLocations; i++) {
                    var loc = data.locations[i];
                    container.append(template(loc));
                }

                // Remove map and share button for each location
                $('.single-location-map').hide();
                $('.single-share').hide();
                $('.fav-count').html(data.locations.length);

                // add click listener for the close buttons
                $('.favs-close-button').removeClass('none').on('click', function(e) {
                    var $favorite = $(this).parent(),
                        key = $favorite.data('key');
                    favorites.removeIdFromCookie(key);
                    $favorite.remove();
                    favorites.syncUI();
                    e.stopPropagation();
                });
            }

            // get location ids:
            // url --> string :: /starred/12,13,54/  --> "12,13,54" 
            //      -- or --
            // cookie string 
            var cookie = $.cookie(celcookie.name),
                regexResult = /([0-9,]+)/.exec(window.location.pathname),
                starredIds = "";
            
            if (regexResult || cookie) {
                starredIds = regexResult ? regexResult[1] : cookie;
                $.getJSON(common.getUrl('location-api') + starredIds, drawStarredLocations);
            } else {
                $('.container').html('No Starred Locations');
            }

            favorites.addClearListener();
            favorites.addShareListener();
        });
    }
);

