/* Main app file for CEL project
 * Mostly stolen from requirejs examples: http://requirejs.org/docs/api.html
 * See http://requirejs.org/docs/api.html for details
 */

define(['jquery', 'Leaflet', '../lib/response', 'Handlebars', 'bootstrap',
        'jquery-ui', 'jquery-cookie', CEL.serverVars.gmapRequire],
function($, L, Response, Handlebars) {
    'use strict';

    var breakpoints = {
        mobile: 420,
        tablet: 767,
        desktop: 1024,
		desktopalt: 1140
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
            data = ['_trackEvent', category, action];
        // optional parameters
        data.push(opt_label || undefined);
        data.push(opt_value || undefined);
        data.push(!!(opt_noninteraction));
        _gaq.push(data);
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

        // New Autocomplete Testing:

        var $autocomplete = $('.autocomplete-searchbox');

        // JQuery $().autocomplete() function handles all interaction with
        // the input and composing the dropdown
        var autocomplete = $autocomplete.autocomplete({
            minLength: 1,
            source: function(request, response) {
                getAutocompletePlaces(request, response);
            },
            select: function(event, ui) {
                var place_id = ui.item.place_id;
                selectPlace(place_id);
            },
            focus: function(event, ui) {
                var selection = ui.item
                $autocomplete.data({
                    label: selection.label,
                    place_id: selection.place_id
                });
                console.log($autocomplete.data());
            }
        });

        // Calls the Places API to populate the dropdown
        // Returns array of possible matches

        function getAutocompletePlaces(request, response) {

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
                        rObj['label'] = obj.description;
                        rObj['place_id'] = obj.place_id;
                        return rObj;
                    });
                    var likelyResult = cleanedResults[0];
                    $autocomplete.data({
                        label: likelyResult.label,
                        place_id: likelyResult.place_id
                    });
                    console.log($autocomplete.data());
                }
                response(cleanedResults);
            });
        }

        function selectPlace(place_id) {
            var geocoder = new google.maps.Geocoder();
            geocoder.geocode({'placeId': place_id}, function(results, status) {
                var result = results[0];
                var lat = result.geometry.location.lat()
                var lng = result.geometry.location.lng();
                redirectToMap(lat, lng)
            });
        }

        function redirectToMap(lat, lng) {
            window.location.href = getUrl(
                'browse',
                {
                    type: 'geo-latlng',
                    lat: lat,
                    lng: lng,
                    zoom: 14
                }
            );
            return;
        }

        // Enter Press
        $('.autocomplete-submit').on('click', function(e) {
            e.preventDefault();
            var place_id = $autocomplete.data().place_id;
            selectPlace(place_id);
        });

        // Button Press

        // 
        // END AUTOCOMPLETE
        //
    });

    // Setup Response stuff
    var breakpointsArray = [
        0,
        breakpoints.mobile,
        breakpoints.tablet,
        breakpoints.desktop,
				breakpoints.desktopalt
    ];
    Response.create({ mode: 'markup', prefix: 'r', breakpoints: breakpointsArray });
    Response.create({ mode: 'src',  prefix: 'src', breakpoints: breakpointsArray });

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
            case 'neighborhood-api':
                return '/' + ($.cookie('django_language') || CEL.serverVars.default_language) +
                    '/api/neighborhood/';
            case 'neighborhoods-topo':
                return '/static/js/neighborhoods-topo.json';
            case 'neighborhoods-geojson':
                return '/static/js/neighborhoods.json';
            case 'browse':
                if (!opts) {
                    return '/search/';
                }
                switch (opts.type) {
                    case 'latlng':
                        url = '/search/?lat=' + opts.lat + '&lng=' + opts.lng;
                        if (opts.zoom) {
                            url += '&zoom=' + opts.zoom;
                        }
                        return url;
                    case 'geo-latlng':
                        url = '/search/?geolat=' + opts.lat + '&geolng=' + opts.lng;
                        if (opts.label) {
                            url += '&label=' + opts.label;
                        }
                        return url;
                    case 'neighborhood':
                        return '/search/?neighborhood=' + opts.neighborhood;
                    case 'location':
                        return '/search/?location=' + opts.location;
                    default:
                        break;
                }
                break;
            case 'single-location':
                url = '/location/' + opts.location + '/';
                if (opts.slug) {
                    url += opts.slug + '/';
                }
                return url;
            case 'favorites':
                url = '/favorites/';
                if (opts && opts.locations) {
                    url += opts.locations.toString() + '/';
                }
                return url;
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
                return '/static/img/leaflet-icons/geocode.png';
            case 'icon-enrollment':
                return '/static/img/leaflet-icons/appsite.png';
            case 'icon-quality':
                if (opts && opts.quality) {
                    return '/static/img/icons/' + opts.quality + '.png';
                } else {
                    throw 'getUrl::Invalid Parameter: icon-quality requires opts.quality';
                }
            default:
                break;
        }
        throw 'Unknown URL endpoint';
    };

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
                e.preventDefault();
                alert(gettext('Please enable geolocation services.'));
            });
        });
    });

    // Set up social sharing behavior
    // The options argument must be an object that contains both a url and a title,
    // which are used to construct the appropriate sharing links.
    $('#share-modal').on('init-modal', function(e, options) {
        // a lot of these urls won't work when passing 'localhost' urls, but once we
        // move to a publically accessible url, they will work just fine
        var templates = {
                mail: 'mailto:?body={{ url }}&subject={{ title }}',
                facebook: 'http://facebook.com/sharer.php?s=100&p[url]={{ url }}&p[title]={{ title }}',
                twitter: 'https://twitter.com/share?text={{ title }}%20{{ url }}',

                // looks like google recently broke their permalink that allows adding text:
                // 'https://m.google.com/app/plus/x/?v=compose&content={{ title }}%20{{ url }}'
                // until they fix it, the following will work, but will just share the url
                gplus: 'https://plus.google.com/share?url={{ url }}'
            },
            $modal = $(this),
            $text = $('#social-text');

        // fill the input box in with the url
        $text.attr('href', options.url).text(options.url);

        // a url is generated for each template defined in 'templates'.
        // to add a new service, create a link with the id 'social-[service]',
        // and add a template to the 'templates' object.
        $.each(templates, function (service, template) {
            $('#social-' + service).attr('href', Handlebars.compile(template)(options));
        });

        // display the modal
        $modal.modal('show');
    });

    return {
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
