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
        var $autocomplete = $('.autocomplete-searchbox');

        // autocomplete helper function that makes the request to
        //  the google maps geocoder API
        function getGeocoderAddresses(request, response) {
            var geocoder = new google.maps.Geocoder(),
                acSettings = CEL.serverVars.autocomplete,
                // Static bounds. Ideally these lat/lng pairs should be set to be slightly larger
                //      than the bounding box of all Locations in the database.
                northEast = new google.maps.LatLng(acSettings.nelat, acSettings.nelng),
                southWest = new google.maps.LatLng(acSettings.swlat, acSettings.swlng),
                bounds = new google.maps.LatLngBounds(southWest, northEast);

            geocoder.geocode( 
                {
                    address: request.term,
                    bounds: bounds,
                    region: 'US'
                }, 
                function(results, status) {
                    var cleanedResults = [],
                        result,
                        lat,
                        lon,
                        resultLocation,
                        likelyResult,
                        $element = $('.autocomplete-searchbox');

                    for (var i in results) {
                        result = results[i];
                        lat = result.geometry.location.lat();
                        lon = result.geometry.location.lng();
                        resultLocation = new google.maps.LatLng(lat, lon);
                        if (bounds.contains(resultLocation)) {
                            cleanedResults.push({
                                lat: lat,
                                lon: lon,
                                label: result.formatted_address,
                                value: result.formatted_address
                            });
                        }
                    }
                    if (cleanedResults.length === 0) {
                        cleanedResults.push({
                            label: "No Results",
                            value: "No Results"
                        });
                    } else {
                        // push first result to input element
                        //      just like in autocomplete success handler below
                        likelyResult = cleanedResults[0];
                        $element.data({
                            lat: likelyResult.lat,
                            lon: likelyResult.lon,
                            label: likelyResult.label
                        });
                    }
                    response(cleanedResults);
                }
             );
        }

        /*
         * Sets window.location.href to appropriate value based on selected autocomplete result
         * See: http://api.jqueryui.com/autocomplete/#event-select
         *      for details on the ui object
         */
        var submitAutocomplete = function(ui) {
            if (ui.item) {
                var slug = ui.item.label ? slugify(ui.item.label) : '';

                if (ui.item.type === 'location') {
                    window.location.href = getUrl(
                        'single-location', { location: ui.item.id, slug: slug });
                    return;
                } else if (ui.item.type === 'neighborhood') {
                    window.location.href = getUrl(
                        'browse', { type: 'neighborhood', neighborhood: ui.item.id });
                    return;
                } else if (ui.item.lat && ui.item.lon) {
                    window.location.href = getUrl(
                        'browse', { type: 'geo-latlng', lat: ui.item.lat, lng: ui.item.lon, zoom: 14, label: ui.item.label });
                    return;
                }
            }
            window.location.href = getUrl('browse');
        };

        /*
         *  Spoof the jquery ui select function ui object using the input element data attributes
         */
        var spoofSubmitAutocomplete = function() {
            if ($autocomplete.data().id) {
                var ui = {
                    item: $autocomplete.data()
                };
                submitAutocomplete(ui);
            } else {
                window.location = "/search/?lq=" + $autocomplete.val();
            }
        };

        /* 
         * Submit the first autocomplete result on button click if none is populated
         */
        $('.autocomplete-submit').on('click', function(e) {
            e.preventDefault();
            spoofSubmitAutocomplete();
        });

        /* 
         * Submit the first autocomplete result on enter if no result is populated
         * This also overrides the functionality in the select callback below
         */
        $autocomplete.on('keyup', function(e) {
            if (e.which === 13) {
                e.preventDefault();
                spoofSubmitAutocomplete();
            }
        });

        /*
         * Autocomplete widget setup and all relevant callbacks
         */
        var autocomplete = $autocomplete.autocomplete({
            source: function(request, response) {
                var self = this;
                $.ajax({
                    url: '/api/autocomplete/',
                    data: {query: request.term},
                    success: function(json) {
                        if (!json || !json.response) {
                            return;
                        }
                        var data = json.response;
                        if (data.length > 0) {
                            // push first result as data attrs of the input element
                            //      so we can access it externally
                            var likelyResult = data[0];
                            $('.autocomplete-searchbox').data({
                                id: likelyResult.id,
                                type: likelyResult.type
                            });
                            // use returned schools and neighborhoods
                            response($.map(data, function(value) {
                                return {
                                    id: value.id,
                                    type: value.type,
                                    label: value.name,
                                    value: value.name
                                };
                            }));
                        } else {
                            getGeocoderAddresses(request, response);
                        }
                    },
                    error: function(e, status, error) {
                        getGeocoderAddresses(request, response);
                    }
                });
            },
            select: function(event, ui) {
                submitAutocomplete(ui);
            },
            focus: function(event, ui) {
                // mirror data to the input element so the proper item is submitted
                $('.autocomplete-searchbox').data({
                    id: ui.item.id,
                    type: ui.item.type,
                    lat: ui.item.lat,
                    lon: ui.item.lon
                });
            },
            minLength: 2        // do not make a request until we have typed two chars
        });
        // END AUTOCOMPLETE
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
