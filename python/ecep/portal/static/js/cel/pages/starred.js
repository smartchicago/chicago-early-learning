/********************************************************
 * Copyright (c) 2013 Azavea, Inc.
 * See LICENSE in the project root for copying permission
 * JavaScript for the starred locations page
 ********************************************************/

define(['jquery', 'Leaflet', 'text!templates/location.html', 'common', 'favorites', 'Handlebars'],
    function($, L, html, common, favorites, Handlebars) {
        'use strict';

        $(document).ready(function() {

            // Draw the Handlebars template for a location
            function drawStarredLocations(data) {
                var template = Handlebars.compile(html),
                    container = $('.container-faves'),
                    $starred = $('<div></div>'),
                    $alert = $('#alert-six'),
                    ecm_ids = [],
                    ecm_url = '',
                    numLocations = data.locations.length;

                if (numLocations > 6) {
                    $alert.show();
                } else {
                    $alert.hide();
                }

                for (var i = 0; i < numLocations; i++) {
                    var loc = data.locations[i];
                    var $location = $(template(loc)).addClass("starred-entry");
                    $starred.append($location);
                    if (loc.ecm.key != 0 && ecm_ids.length < 6) {
                        ecm_ids.push(loc.ecm.key);
                    } 
                }

                ecm_url = common.getUrl('ecm-apply', { ids: ecm_ids });
                $('#faves-contact').attr('href', ecm_url);
                // attach in single dom operation
                container.html($starred);

                // Remove map and share button for each location
                $('.fav-count').html(numLocations);


                // add close buttons and click listener if we are displaying cookie locations
                //      else hide because this was a shared link and the "remove" functionality
                //      does not make sense
                if (!regexResult) {
                    $('.favs-close-button').removeClass('none').on('click', function(e) {
                        var $favorite = $(this).parent(),
                            key = $favorite.data('key');

                        favorites.removeIdFromCookie(key);
                        location.reload();
                    });
                }
            }

            // get location ids:
            // url --> string :: /starred/12,13,54/  --> "12,13,54"
            //      -- or --
            // cookie string
            var cookie = favorites.getCookie(),
                regexResult = /([0-9,]+)/.exec(window.location.pathname),
                starredIds = "";

            if (regexResult || cookie) {
                starredIds = regexResult ? regexResult[1] : cookie;
                $.getJSON(common.getUrl('starred-location-api', { locations: starredIds }), function (results) {
                    drawStarredLocations(results);
                });
            } else {
                $('.container-faves').html(gettext('No Favorite Locations'));
            }

            if(regexResult) {
                var initial_ids = regexResult[1].split(',');
                $.each(initial_ids, function(i, value) {
                    favorites.addIdToCookie(value);
                });
            }


            favorites.addClearListener();
            favorites.addShareListener();

            // Handle back button logic.  If there is a history.length greater than 2,
            // take them to /search/ otherwise do history.go(-1)
            $('#back-button').on('click', function(e) {
                if(regexResult) {
                    var url = window.location.protocol + '//' + window.location.host + '/search/'
                    window.location.href = url;
                }
                else {
                    window.history.go(-1);
                }
            });


        });
    }
);

