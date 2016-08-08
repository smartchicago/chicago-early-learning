
define(['jquery', 'Leaflet', 'text!templates/location.html', 'common', 'favorites', 'Handlebars'],
    function($, L, html, common, favorites, Handlebars) {
        'use strict';

        $(document).ready(function() {

            // Draw the Handlebars template for a location
            function drawStarredLocations(data, ecm_locations, non_ecm_locations) {
                var template = Handlebars.compile(html),
                    $apply_button = $('#faves-contact'),
                    $container_one = $('.container-one-faves'),
                    $container_two = $('.container-two-faves'),
                    $starred_one = $('<div></div>'),
                    $starred_two = $('<div></div>'),
                    $alert = $('#alert-six'),
                    ecm_ids = [],
                    ecm_url = '',
                    numECMLocations = ecm_locations.length,
                    numNonECMLocations = non_ecm_locations.length;

                if (numECMLocations > 6) {
                    $alert.show();
                    $apply_button.addClass('disabled');
                } else {
                    $alert.hide();
                }

                if (numNonECMLocations > 0) { $('#non-ecm-header').show(); }

                for (var i = 0; i < numECMLocations; i++) {
                    var loc = ecm_locations[i];
                    var $location = $(template(loc)).addClass("starred-entry");
                    $starred_one.append($location);
                    ecm_ids.push(loc.ecm.key);
                }

                for (var i = 0; i < numNonECMLocations; i++) {
                    var loc = non_ecm_locations[i];
                    var $location = $(template(loc)).addClass("starred-entry");
                    $starred_two.append($location);
                }

                ecm_url = common.getUrl('ecm-apply', { ids: ecm_ids });
                $('#faves-contact').attr('href', ecm_url);
                // attach in single dom operation
                $container_one.html($starred_one);
                $container_two.html($starred_two);


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
                    var locations = results.locations,
                        ecm = [],
                        non_ecm = [];

                    for (var i=0; i<locations.length; i++) {
                        if (locations[i].ecm.key == 0) {
                            non_ecm.push(locations[i]);
                        } else {
                            ecm.push(locations[i]);
                        }
                    }

                    drawStarredLocations(results, ecm, non_ecm);
                });
            } else {
                $('.container-one-faves').html(gettext('No Favorite Locations'));
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

            $('#faves-contact').on('click', function(e) {
                if ($('#faves-contact').hasClass('disabled')) {
                    e.preventDefault();
                }
            });

        });
    }
);

