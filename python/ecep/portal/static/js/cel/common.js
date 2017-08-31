/* Main app file for CEL project
 * Mostly stolen from requirejs examples: http://requirejs.org/docs/api.html
 * See http://requirejs.org/docs/api.html for details
 */

define(['jquery', 'Leaflet', 'Handlebars',
        'jquery-ui', 'jquery-cookie', CEL.serverVars.gmapRequire, 'Clipboard'],
function($, L, Handlebars) {
    'use strict';

    var breakpoints = {
        small: 576,
        medium: 768,
        large: 992,
		xlarge: 1200
    };

    var isTouchscreen = ('ontouchstart' in document.documentElement);

    // Hide the address bar on mobile browsers
    // Solution from: http://mobile.tutsplus.com/tutorials/mobile-web-apps/remove-address-bar/
    function hideAddressBar() {
        if(!window.location.hash) {
            if(document.height < window.outerHeight) {
                document.body.style.height = (window.outerHeight + 50) + 'px';
            }
            setTimeout(function() {
                window.scrollTo(0, 1);
            }, 50);
        }
    }
    if (isTouchscreen) {
        $(window).on('load', function() {
            if(!window.pageYOffset) {
                hideAddressBar();
            }
        }).on('orientationchange', hideAddressBar);
    }

    var gaTrackEvent = function($elt) {
        var category = CEL.serverVars.language + '/' + $elt.data('ga-category'),
            action = $elt.data('ga-action'),
            opt_label = $elt.data('ga-label'),
            opt_value = $elt.data('ga-value'),
            opt_noninteraction = $elt.data('ga-noninteraction'),
            opt_beacon = $elt.data('ga-beacon'),
            data = {
                hitType: 'event', 
                eventCategory: category,
                eventAction: action,
            };
        
        // optional parameters
        if (opt_label) { data[eventLabel] = opt_label; }
        if (opt_value) { data[eventValue] = opt_value; }
        if (opt_beacon) {data[transport] = true;}

        ga('send', data);
    };

    var isRetinaDisplay = function() {
        if (window.matchMedia) {
            var mq = window.matchMedia("only screen and (min--moz-device-pixel-ratio: 1.3), only screen and (-o-min-device-pixel-ratio: 2.6/2), only screen and (-webkit-min-device-pixel-ratio: 1.3), only screen  and (min-device-pixel-ratio: 1.3), only screen and (min-resolution: 1.3dppx)");
            return (mq && mq.matches || (window.devicePixelRatio > 1)); 
        }
    }

    /**
    * Central api for getting urls for the app
    * @param { logical name of the endpoint } name
    * @param { Options for creating the url, depends on name } opts
    * @return { URL string for request }
    */
    var getUrl = function (name, opts) {
        var url = '';
        switch (name) {
            case 'origin':
                // IE < 9 doesn't define location.origin
                return window.location.origin ||
                    (window.location.protocol + "//" + window.location.host);
            case 'location-api':
                // requires opts.locations to be comma separated string or
                //      array of integers
                url = '/' + ($.cookie('django_language') || CEL.serverVars.default_language) +
                    '/api/location/';
                if (opts && opts.locations) {
                    url += opts.locations.toString() + '/';
                }
                return url;
            case 'starred-location-api':
                // requires opts.locations to be comma separated string or
                //      array of integers
                url = '/' + ($.cookie('django_language') || CEL.serverVars.default_language) +
                    '/api/starred-location/';
                if (opts && opts.locations) {
                    url += opts.locations.toString() + '/';
                }
                return url;
            case 'neighborhood-api':
                return '/' + ($.cookie('django_language') || CEL.serverVars.default_language) +
                    '/api/neighborhood/';
            case 'neighborhoods-topo':
                return '/static/js/neighborhoods-topo.json';
            case 'neighborhoods-geojson':
                return '/static/js/neighborhoods.json';
            case 'browse':
                debugger;
                if (opts) {
                    var param_string = $.params(opts);
                    return '/search/?' + param_string;
                } else {
                    return '/search';
                }
            case 'single-location':
                url = '/location/' + opts.location + '/';
                if (opts.slug) {
                    url += opts.slug + '/';
                }
                return url;
            case 'location-json':
                return '/en/api/location/json/'
            case 'map-json':
                url = '/' + ($.cookie('django_language') || CEL.serverVars.default_language) + '/api/map/json/';
                return url
            case 'favorites':
                url = '/favorites/';
                if (opts && opts.locations) {
                    url += opts.locations.toString() + '/';
                }
                return url;
            case 'starred':
                return '/starred';
            case 'icon-school':
                return '/static/img/leaflet-icons/school.png';
            case 'icon-school-accredited':
                return '/static/img/leaflet-icons/school-accredited.png';
            case 'icon-school-starred':
                return '/static/img/leaflet-icons/school-starred.png';
            case 'icon-school-accredited-starred':
                return '/static/img/leaflet-icons/school-accredited-starred.png';
            case 'icon-center':
                return '/static/img/leaflet-icons/center.png';
            case 'icon-center-accredited':
                return '/static/img/leaflet-icons/center-accredited.png';
            case 'icon-center-starred':
                return '/static/img/leaflet-icons/center-starred.png';
            case 'icon-center-accredited-starred':
                return '/static/img/leaflet-icons/center-accredited-starred.png';
            case 'icon-geolocation':
                return '/static/img/map-icons/2x/geolocated.png';
            case 'icon-enrollment':
                return '/static/img/leaflet-icons/appsite.png';
            case 'icon-quality':
                if (opts && opts.quality) {
                    return '/static/img/icons/' + opts.quality + '.png';
                } else {
                    throw 'getUrl::Invalid Parameter: icon-quality requires opts.quality';
                }
            case 'ecm-apply':
                return '/announcements';
            case 'copa-apply':
                url = 'https://cys.mycopa.com/familyPortal/welcome.epl?'
                if (opts && opts.ids ) {
                    var payload = '';
                    for (var i=0; i < opts.ids.length; i++) {
                        payload += 'site' + (i+1) + '=' + opts.ids[i];
                        if (i+1 < opts.ids.length) { payload += '&'; }
                    }
                }
                return url + payload;
            default:
                break;
        }
        throw 'Unknown URL endpoint';
    };

    $(document).ready(function() {

        // Remove css tooltips when on a touchscreen device
        if (isTouchscreen) {
            $('[data-hint]').removeAttr('data-hint');
        }

        // set up ga tracking
        $('body').on('click', '*.ga-track', function(e) {
            gaTrackEvent($(this));
        });

        // AUTOCOMPLETE

        // Fetch Location names 
        var location_list;
        $.get(getUrl('location-json'), function (data) {
            location_list = data;
        }, 'json');


        // Configure Autocomplete widget to use Categories
        // Distinguish between Addresses and Locations
        // Code lifted from <jqueryui.com/autocomplete/#categories>

        $.widget("custom.catcomplete", $.ui.autocomplete, {
            _create: function() {
                this._super();
                this.widget().menu( "option", "items", "> :not(.ui-autocomplete-category)");
            },
            _renderMenu: function( ul, items ) {
                var that = this,
                    currentCategory = "";
                $.each( items, function( index, item ) {
                    var li;
                    if ( item.category != currentCategory ) {
                        ul.append( "<li class='ui-autocomplete-category'>" + item.category + "</li>");
                        currentCategory = item.category;
                    }
                    li = that._renderItemData( ul, item );
                    if ( item.category ) {
                        li.attr("aria-label", item.category + " : " + item.label);
                    }
                });
            }
        });

        // Autocomplete dropdown widget:

        var $autocomplete = $('.autocomplete-searchbox');

        // JQuery $().autocomplete() function handles all interaction with
        // the input and composing the dropdown
        var autocomplete = $autocomplete.catcomplete({
            minLength: 3,
            source: function(request, response) {
                getAutocompletePlaces(request, response);
            },
            select: function(event, ui) {
                var label = ui.item.label
                var place_id = ui.item.place_id;
                var category = ui.item.category;
                var types = ui.item.types;
                selectPlace(label, place_id, category, types);
            },
            focus: function(event, ui) {
                var selection = ui.item
                $autocomplete.data({
                    label: selection.label,
                    place_id: selection.place_id
                });
            },
            delay: 150
        });

        // Calls the Places API to populate the dropdown
        // Returns array of possible matches

        function getAutocompletePlaces(request, response) {

            $('.error-message').css('visibility', 'hidden');
            var input_term = 'Chicago IL ' + request.term;
            var service = new google.maps.places.AutocompleteService();
            service.getPlacePredictions({
                input: input_term,
                types: ['geocode'],
                componentRestrictions: {
                    country: 'us'
                }
            }, function(predictions, status) {
                var cleanedResults = [];
                if (predictions === null) {
                    cleanedResults = [];
                } else {
                    cleanedResults = predictions.map(function(obj) {
                        var rObj = {};
                        rObj['label'] = obj.description.replace(", Chicago, IL, United States", "");
                        rObj['place_id'] = obj.place_id;
                        rObj['category'] = 'Addresses';
                        rObj['types'] = obj.types;
                        return rObj;
                    });
                }
                // Concat results from Google with local filter:
                var localResults = getAutocompleteLocations(request.term);
                var allResults = localResults.concat(cleanedResults);

                if (allResults[0]) {
                    var likelyResult = allResults[0];
                    $autocomplete.data({
                        label: likelyResult.label,
                        place_id: likelyResult.place_id,  
                        category: likelyResult.category,
                        types: likelyResult.types
                    });
                } else {
                    $autocomplete.data({
                        label: 'None',
                        place_id: 'None',
                        category: 'None',
                        types: 'None'
                    });
                }
                response(allResults);
            });
        }

        function selectPlace(label, place_id, category, types) {
            switch (category) {
                case 'None':
                    $('.error-message').css('visibility', 'visible');
                    break;
                case 'Addresses':
                    var geocoder = new google.maps.Geocoder();
                    geocoder.geocode({'placeId': place_id}, function(results, status) {
                        var result = results[0];
                        var lat = result.geometry.location.lat();
                        var lng = result.geometry.location.lng();

                        var zoom = 15;
                        var isPostalCode = types.indexOf('postal_code');
                        var isNeighborhood = types.indexOf('neighborhood');

                        if (isPostalCode != -1 || isNeighborhood != -1) {
                            zoom = 14;
                        }
                        redirectToMap(label, lat, lng, zoom);
                    });
                    break;
                case 'Locations':
                    redirectToLocation(place_id);
                    break;
                default:
                    redirectToDefaultMap();
                    break;
            }
        }

        // No input, default map at neighborhood-view level
        function redirectToDefaultMap() {
            window.location.href = getUrl('browse');
            return;
        }

        // Specific Address
        function redirectToMap(label, lat, lng, zoom) {
            var opts = {
                type: 'geo-latlng',
                address: label,
                lat: lat,
                lng: lng,
                zoom: zoom
            }
            window.location.href = getUrl('browse', opts
            );
            return;
        }

        // Location Pages
        function redirectToLocation(place_id) {
            window.location.href = getUrl('single-location', { location: place_id });
            return;
        }

        // Customized autocomplete.filter function, nearly identical to existing
        // function, with additional logic to 'bubble up' results that start with
        // the given search term to the top of the list, the rest of the results
        // returned in alphabetical order. 
        //
        // See https://github.com/jquery/jquery-ui/blob/master/ui/widgets/autocomplete.js
        // for original filtering function.

        function getAutocompleteLocations(term) {
            var startswith_results;
            var remaining_results;
            var array = location_list;
            var matcher_beginning = new RegExp( ("^" + $.ui.autocomplete.escapeRegex(term)), "i");
            var matcher_all = new RegExp( $.ui.autocomplete.escapeRegex(term), "i" );
            
            startswith_results = $.grep( array, function(value) {
                return matcher_beginning.test( value.label || value.value || value );
            });
            remaining_results = $.grep( array, function(value) {
                return (matcher_all.test( value.label || value.value || value ) && !(matcher_beginning.test( value.label || value.value || value )));
            });

            var results = startswith_results.concat(remaining_results);

            // Only return the first 10 results:
            if (results.length > 10) {
                results = results.slice(0, 10);
            }
            return results;
        }

        // Button Press
        $('.autocomplete-submit').on('click', function(e) {
            e.preventDefault();
            var label = $autocomplete.data().label;
            var place_id = $autocomplete.data().place_id;
            var category = $autocomplete.data().category;
            var types = $autocomplete.data().types;
            selectPlace(label, place_id, category, types);
            return false;
        });

        // Enter Press
        $autocomplete.keypress(function (e) {
            if (e.keyCode == 13) {
                var label = $autocomplete.data().label;
                var place_id = $autocomplete.data().place_id;
                var category = $autocomplete.data().category;
                var types = $autocomplete.data().types;
                selectPlace(place_id, category, types);
            }
        });

        // 
        // END AUTOCOMPLETE
        //
    });

    // Handlebars helpers

    /**
     * Helper for resolving static urls in handlebars templates
     * @param { URL to convert to static, same as argument for django static template function } url
     * @return { full static url }
     */
    Handlebars.registerHelper('static', function(url) {
        return CEL.serverVars.staticRoot + url;
    });

    /**
     * Helper for doing string equality
     * @param { first var to compare } a
     * @param { second var to compare } b
     * @return { boolean }
     */
    Handlebars.registerHelper('if_eq', function(a, b, opts) {
        if(a == b) {
            return opts.fn(this);
        } else {
            return opts.inverse(this);
        }
    });


    /**
     * Helper for doing string inequality
     * @param { first var to compare } a
     * @param { second var to compare } b
     * @return { boolean }
     */
    Handlebars.registerHelper('if_not_eq', function(a, b, opts) {
        if(a != b) {
            return opts.fn(this);
        } else {
            return opts.inverse(this);
        }
    });

    var slugify = function(text) {
      return text.toString().toLowerCase()
        .replace(/\s+/g, '-')           // Replace spaces with -
        .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
        .replace(/\-\-+/g, '-')         // Replace multiple - with single -
        .replace(/^-+/, '')             // Trim - from start of text
        .replace(/-+$/, '');            // Trim - from end of text
    };

    // geolocation
    //
    // Navbar Geolocation
    if ('geolocation' in navigator) {
        $(document).ready(function() {
            $('.geolocation-button').bind('click', function(e) {
                e.preventDefault();
                navigator.geolocation.getCurrentPosition(function(position) {
                    window.location.href = getUrl(
                        'browse',
                        {
                            type: 'geo-latlng',
                            lat: position.coords.latitude,
                            lng: position.coords.longitude
                        }
                    );
                }, function(e) {
                    e.preventDefault();
                    alert(gettext('Please enable geolocation services.'));
                });
            });
        });
    } else {
        $('.geolocation-button').hide();
    }

    // Homepage Geolocation
    $(document).ready(function() {
        $('#locate-main').bind('click', function(e) {
            e.preventDefault();
            navigator.geolocation.getCurrentPosition(function(position) {
                window.location.href = getUrl(
                    'browse',
                    {
                        type: 'geo-latlng',
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    }
                );
            }, function(e) {
                alert(gettext('Please enable geolocation services.'));
            });
            return false;
        });
    });

    // Link to Compare & Contact page via button
    $(document).ready(function() {
        $('#compare-favorites-btn').bind('click', function(e) {
            e.preventDefault();
            window.location.href = getUrl('starred');
            return false;
        });
    });

    return {

        isRetinaDisplay: isRetinaDisplay,

        getUrl: getUrl,

        slugify: slugify,

        breakpoints: breakpoints,

        isTouchscreen: isTouchscreen,

        gaTrackEvent: gaTrackEvent,

        // Stolen from _.js v1.5.1
        // https://github.com/jashkenas/underscore/blob/dc5a3fa0133b7000c36ba76a413139c63f646789/underscore.js
        // See project root for license
        //
        // Returns a function, that, as long as it continues to be invoked, will not
        // be triggered. The function will be called after it stops being called for
        // N milliseconds. If `immediate` is passed, trigger the function on the
        // leading edge, instead of the trailing.
        debounce: function(func, wait, immediate) {
            var result,
                timeout = null;
            return function() {
                var context = this,
                    args = arguments,
                    later = function() {
                        timeout = null;
                        if (!immediate) result = func.apply(context, args);
                    },
                    callNow = immediate && !timeout;
                    clearTimeout(timeout);
                    timeout = setTimeout(later, wait);
                    if (callNow) {
                        result = func.apply(context, args);
                    }

                return result;
            };
        }
    };
});
