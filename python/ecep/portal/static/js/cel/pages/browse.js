

define(['jquery', 'Leaflet', 'Handlebars', 'text!templates/neighborhoodList.html', 'text!templates/locationList.html',
        'topojson', 'icons', 'favorites', 'location', 'common', CEL.serverVars.gmapRequire,
        'leaflet-providers', 'history', 'styling'],
    function($, L, Handlebars, neighborhoodList, locationList, topojson, icons, favorites, location, common) {

        'use strict';

        var map,   // Leaflet map
            $map = $('#map'),
            $filters = $('.filters-inner :checkbox'),
            $filterClearAll = $('#filter-clear-all'),
            $collapseFilters = $('#collapseFilters'),
            listItemSelector = '.locations-wrapper .accordion-group',
            zoomSettings = CEL.serverVars.zoomSettings,   // setting for zoom transition
            defaultZoom = 11,
            latSettings = CEL.serverVars.latSettings,    // lng + lat settings for initial view
            lngSettings = CEL.serverVars.lngSettings,
            geolocatedIcon,
            geolocatedMarker,                         // marker for autocomplete request
            template,    // Hold handlebars template
            /**
             * Valid types of map layers
             */
            layerType = {
                // No map layer is currently selected
                none: 'none',

                // Neighborhood polygons layer
                neighborhood: 'neighborhood',

                // Individual locations/schools layer
                location: 'location'
            },
            locationLayer = new L.LayerGroup(),   // Location/school layer group
            neighborhoodLayer = new L.LayerGroup(),   // Neighborhood layer group
            popupLayer = new L.LayerGroup(),    // Popup Layer
            currentLayer = layerType.none,      // Layer being currently displayed
            dm = new location.DataManager($filters),    // DataManager object
            isAutocompleteSet = true,
            autocompleteLocationId,
            autocompleteNeighborhoodId,
            updateUrl = null,                   // Updates the url to reflect page state
            ajaxTimeoutId,
            spinnerDelayMillis = 500,
            $locationWrapper;                   // Store div wrapper for results on left side

        // Initialize geojson for neighborhood layer
        neighborhoodLayer = L.geoJson(null, {
            style: {
                color: '#317DC1',
                fillColor: '#91C73D',
                weight: 1,
                opacity: 1,
                fillOpacity: 0.3
            },
            onEachFeature: function(feature, layer) {
                layer.on('click', function(e) {
                    neighborhoodPan(feature.properties.primary_name,
                        feature.properties.num_schools,
                        feature.properties.center.lat,
                        feature.properties.center.lng,
                        false);
                });
            }
        });

        /*
         * Set map pan/zoom centered on a neighborhood/location if requested in the url
         */
        var setAutocompleteLocation = function() {
            if (isAutocompleteSet) {
                if (autocompleteLocationId) {
                    var loc = dm.locations[autocompleteLocationId],
                        pos = loc.getLatLng();
                    loc.setIcon({ highlighted: true });
                    locationPan(pos.lat, pos.lng);
                } else if (autocompleteNeighborhoodId) {
                    var value = dm.neighborhoods.data[autocompleteNeighborhoodId];
                    map.setView([value.center.lat, value.center.lng], zoomSettings);
                }
                isAutocompleteSet = false;
            }
        };

        /**
         * Controls logic of whether to display locations or neighborhoods
         * based on current zoom level. Called when map is initialized
         * and after a change in zoom level. Listens to the dm.neighborhoodUpdated and
         * dm.locationUpdated events to modify the view.
         */

        // This code is monstrous and needlessly complicated. 
        // Streamline this code, along with the way the map is constructed.
        // - ajb, 19 Jan 2016
        var displayMap = common.debounce(function(e) {
            var zoomLevel = map.getZoom(),
                mapCenter = map.getCenter();

            if (isAutocompleteSet && autocompleteLocationId) {
                dm.locationUpdate(map, locationLayer);
            } else if (isAutocompleteSet && autocompleteNeighborhoodId) {
                dm.neighborhoodUpdate();
            } else if (currentLayer !== layerType.neighborhood) {
                if (zoomLevel < zoomSettings) {
                    // We zoomed out, switch to neighborhoods
                    dm.neighborhoodUpdate();
                } else {
                    // We're still good, update locations
                    dm.locationUpdate(map, locationLayer);
                }
            } else if (currentLayer !== layerType.location) {
                if (zoomLevel >= zoomSettings) {
                    // We zoomed in, switch to locations
                    dm.locationUpdate(map, locationLayer);
                }
                if (e && e.type === 'DataManager' && e.namespace === 'filtersUpdated') {
                    // Ok, we're still on neighborhooks, only need to update if filters changed
                    dm.neighborhoodUpdate();
                }
            }

            // Don't want this to fire on page load since it will screw w/ history, so
            // disable it the first time through.
            if (updateUrl) {
                updateUrl(mapCenter, zoomLevel, $collapseFilters.hasClass('in'));
            } else {
                // If we move the map, don't want to go back to geolocated spot in history
                // and also don't want the geolocated marker at the center of the map user
                // is going back to.
                // Need to pass mapCenter and zoomLevel as variables or these values don't change
                // each time the function is called
                updateUrl = function (mapCenter, zoomLevel, filtersVisible) {
                    History.pushState(
                        {
                            isGeolocated: false,
                            filtersVisible: filtersVisible
                        },
                        null,
                        common.getUrl(
                            'browse',
                            {type: 'latlng', lat: mapCenter.lat, lng: mapCenter.lng, zoom: zoomLevel}
                        )
                    );
                };
            }
        }, 250);

        /**
         * Changes list results display using Handlebars templates
         * @param {Array of neighborhoods or locations} data
         * @param {Type of current layer, see layerType} dataType
         */
        var listResults = function(data, dataType) {
            var isNb = (dataType === layerType.neighborhood),
                html = (isNb ? neighborhoodList : locationList),
                dataList,
                template = Handlebars.compile(html),
                handlebarsData = [],
                th = 0;

            // Sort everything by name ascending
            dataList = $.map(data, function(v, k) {
                return v;
            }).sort(function(a, b) {
                if (isNb) {
                    return a.name.localeCompare(b.name);
                } else {
                    return a.data.item.site_name.localeCompare(b.data.item.site_name);
                }
            });

            $.each(dataList, function(key, value) {
                var item = isNb ? value : value.data;
                handlebarsData.push(item);
            });

            window.clearTimeout(ajaxTimeoutId);
            $locationWrapper.empty().append(template(handlebarsData)).removeClass('ajax-spinner');


            // Remove css tooltips when on a touchscreen device
            if (common.isTouchscreen) {
                $('[data-hint]').removeAttr('data-hint');
            }

            // set quality icons
            $('.quality-icon').each(function(index) {
                var $this = $(this),
                    iconname = $this.data('img');
                $this.attr('src', common.getUrl('icon-quality', {quality: iconname}));
            });

            // set header title
            var $headerFav = $('#header-fav'),
                $headerDist = $('#header-dist');
            if (isNb) {
                $headerFav.text(gettext('Community'));
                $headerDist.text(gettext('Locations'));
            } else {
                $headerFav.text(gettext('Location'));
                $headerDist.text(gettext('More Information'));
            }

            // bind social sharing button clicks for individual locations
            $locationWrapper.find('.share-btn').on('click', function() {
                var key = $(this).data('key');

                $('#share-modal').trigger('init-modal', {
                    // the url is passed in to the sharing urls, so it must be absolute
                    url: common.getUrl('origin') +
                            common.getUrl('single-location', { location: key }),
                    title: 'Check out this early learning program'
                });
            });

            favorites.syncUI();
            // favorites.addToggleListener({
            //     button: '.favs-toggle'
            // });

            /**
             * Watch for favorite events, if there is one, then setIcon again
             */
            $('body').off('click.favs').on('click.favs', '.favs-toggle', function(e) {
                var $this = $(this);
                // Toggle all favorites
                favorites.toggle($this);

                var key = $this.data('loc-id'),
                    loc = dm.locations[key],
                    iconkey = 'icon-' + loc.getIconKey().key,
                    $locIcon = $('#loc-icon-' + key),
                    highlighted = false;

                if ($this.is('button')) {
                    highlighted = true;
                }

                // always highlighted because the mouse will be over the accordion div for the click
                // ^^ this is actually untrue. Don't set the icon highlighted **if** selecting from
                // the map tooltip, only from the left-hand results lift. - ajb 14 Apr 2016
                loc.setIcon({ highlighted: highlighted });
                $locIcon.attr('src', common.getUrl(iconkey));
                if (!common.isTouchscreen) {
                    $locIcon.parent('a').attr('data-hint', loc.getIconDescription());
                }
            });

            // Watch for hover events on the list so we can highlight both
            // the list item and the icon on the map
            var $locationContainer = $('.location-container');
            $locationContainer.each(function(index) {
                var $this = $(this),
                    key = $this.data('key'),
                    loc = dm.locations[key],
                    iconkey = 'icon-' + loc.getIconKey().key,
                    $locIcon = $('#loc-icon-' + key);
                $locIcon.attr('src', common.getUrl(iconkey));
                if (!common.isTouchscreen) {
                    $locIcon.parent('a').attr('data-hint', loc.getIconDescription());
                }
            }).on('show.bs.collapse', function(e) {
                var $this = $(this),
                    $morelessbtn = $this.find('.more-less-btn'),
                    $directionsLink = $this.find('#loc-dirs');
                $morelessbtn.html(gettext('Less'));
                if (!common.isTouchscreen) {
                    $morelessbtn.attr('data-hint', gettext('Click to show less information'));
                }
            }).on('hide.bs.collapse', function(e) {
                var $this = $(this),
                    $morelessbtn = $this.find('.more-less-btn');
                $morelessbtn.html(gettext('More'));
                if (!common.isTouchscreen) {
                    $morelessbtn.attr('data-hint', gettext('Click to show more information'));
                }
            });
            // feature detection: we only want hover events on non-touch devices
            if (!common.isTouchscreen) {
                $locationContainer.on('mouseenter mouseleave', function(e) {
                    var $this = $(this),
                    key = $this.data('key'),
                    loc = dm.locations[key];

                    if (e.type === 'mouseenter') {
                        $this.addClass('highlight');
                        loc.setIcon({'highlighted': true});
                    } else if (e.type === 'mouseleave') {
                        $this.removeClass('highlight');
                        loc.setIcon({'highlighted': false});
                    }
                });
            }
        };

        /**
         * Change tooltip when refining search
         */
        var refineListener = function() {

            // This should be handled by djangojs and gettext, but
            // For whatever reason that's not working. 
            //  - ajb, 6 June 2016 
            var less_filters_text = 'Less Filters';
            var more_filters_text = 'More Filters';
            if (CEL.serverVars.language == 'es') {
                less_filters_text = 'Menos Filtros';
                more_filters_text = 'Más Filtros';
            }

            if (!common.isTouchscreen) {
                $('#filters-more').on('show.bs.collapse', function(e) {
                    $('#filters-show-more').html(less_filters_text);
                    $('#refineBtn').attr('data-hint', gettext('Click to hide filters'));
                }).on('hide.bs.collapse', function(e) {
                    $('#refineBtn').attr('data-hint', gettext('Click to show filters'));
                    $('#filters-show-more').html(more_filters_text);
                });
            }
        };

        /*
         * Get map state from DOM and override defaults if necessary
         */
        var getMapState = function() {

            var lat = $map.data('lat') || latSettings,
                lng = $map.data('lng') || lngSettings,
                geolat = $map.data('geolat'),
                geolng = $map.data('geolng'),
                isGeolocated = false;

            if ($map.data('zoom')) {
                defaultZoom = $map.data('zoom');
                console.log(defaultZoom);
            } else if ($map.data('lat') || geolat) {
                defaultZoom = 15;
            }

            if (geolat && geolng) {
                lat = geolat;
                lng = geolng;
                isGeolocated = true;
            }
            return { point: [lat, lng], isGeolocated: isGeolocated };
        };

        /**
         * Add functionality to explore button when viewing neighborhoods.
         * On click - map pans to center of neighborhood and zooms, then
         * rebuilds list display
         */
        var exploreButton = function() {
            $('.explore-btn').click(function() {
                map.setView([$(this).data('lat'), $(this).data('lng')], zoomSettings);
            });
        };

        /**
         * Pans to neighborhood and zooms to reasonable level if current view
         * is too far out
         * @param {Name of neighborhood} name
         * @param {Number of schools in neighborhood} numSchools
         * @param {Latitude of neighborhood centroid} lat
         * @param {Longitude of neighborhood centroid} lng
         * @param {Flag to pan map to neighborhood} panFlag
         */
        var neighborhoodPan = function(name, numSchools, lat, lng, panFlag) {
            popupLayer.clearLayers();
            if (panFlag) {
                map.panTo([lat, lng]);
                if (map.getZoom() < zoomSettings - 3) {
                    // Check if at reasonable zoom level, if too far out
                    // zoom user in
                    map.setZoom(zoomSettings - 3);
                }
            }
            var popupContent = '<b>' + name + '</b><br>' + gettext('Number of Locations') + ': ' + numSchools + '<br><a class="neighborhood-popup" href="#">' + gettext('Explore') + '</a>',
                popup = L.popup().setLatLng([lat, lng]).setContent(popupContent).addTo(popupLayer);

            var data = ['_trackEvent', CEL.serverVars.language + '/search', 'ExploreNeighborhood', name];
            _gaq.push(data);

            $('.neighborhood-popup').on('click', function(e) {
                map.setView([lat, lng], zoomSettings);
            });
        };

        /*
         * Pans to location and zooms to reasonable level if current view is too far out
         */
        var locationPan = function(lat, lng) {
            map.panTo([lat, lng]);
            if (map.getZoom() < zoomSettings) {
            // Check if at reasonable zoom level, if too far out
                // zoom user in
                map.setZoom(zoomSettings);
            }
        };

        /**
         * Function that handles pans to neighborhood when clicking on accordion group
         *
         * Mostly just a wrapper around neighborhoodPan
         */
        var panHandler = function() {
            $(listItemSelector).click(function() {
                var $this = $(this);
                neighborhoodPan($this.data('name'), $this.data('schools'),
                                $this.data('lat'), $this.data('lng'), true);
            });
        };

        /**
         * Function that toggles map view on mobile devices
         */
        var mapToggle = function() {
            $('.results-left').toggleClass('none');
            $('.results-right').toggleClass('visible');
            var $toggleMapBtnIcon = $('#toggleMapBtn').children('i');
            $toggleMapBtnIcon.toggleClass('icon-globe icon-list');
        };

        /**
         * Function that turns query string parameters into a object
         */
         var qs2Obj = function () {
            var qs = document.URL.split('?')[1],
                vars = {};
            if(qs){
                var pairs = qs.split('&');
                for(var i = 0; i < pairs.length; i++){
                    var parts = pairs[i].split('=');
                    vars[parts[0]] = decodeURIComponent(parts[1] || '');
                }
            }

            return vars;
         };


        /******************************************************
         *                    Bind events                     *
         ******************************************************/

        /*
         * Update view when the dm triggers its neighborhood updated event
         * We only want to attach this event once...
         */
        dm.events.on('DataManager.neighborhoodUpdated', function(e) {
            // If not already displaying neighborhoods and zoomed out
            if (currentLayer !== layerType.neighborhood) {
                currentLayer = layerType.neighborhood;
            }

            listResults(dm.neighborhoods.data, currentLayer);
            locationLayer.clearLayers();
            neighborhoodLayer.clearLayers();
            neighborhoodLayer.addData(dm.neighborhoods.geojson);
            map.addLayer(neighborhoodLayer);
            panHandler();
            exploreButton();

            // set map to location/neighborhood if autocomplete requested it
            setAutocompleteLocation();
        });


        /*
         * Update view when the dm triggers its location updated event
         * We only want to attach this event once...
         */
        dm.events.on('DataManager.locationUpdated', function(e) {
            // If not already displaying locations and zoomed in
            if (currentLayer !== layerType.location) {
                currentLayer = layerType.location;
                popupLayer.clearLayers();
            }

            map.removeLayer(neighborhoodLayer);
            map.addLayer(locationLayer);
            listResults(dm.locations, currentLayer);

            // set map to location/neighborhood if autocomplete requested it
            setAutocompleteLocation();
        });

        dm.events.on('DataManager.locationUpdating DataManager.neighborhoodUpdating', function(e) {
            ajaxTimeoutId = window.setTimeout(function() {
                $locationWrapper.empty().addClass('ajax-spinner');
            }, spinnerDelayMillis);
        });

        // Load data and build map when page loads
        return {
            init: function() {
                var state = getMapState(),
                    historyState = History.getState().data,
                    zoom = defaultZoom,
                    qs = qs2Obj(),
                    label = qs.label,
                    mapboxURL = '';

                if (common.isRetinaDisplay()) {
                    mapboxURL = 'https://api.mapbox.com/v4/mapbox.streets/{z}/{x}/{y}@2x.png?access_token='
                } else {
                    mapboxURL = 'https://api.mapbox.com/v4/mapbox.streets/{z}/{x}/{y}.png?access_token='
                }

                var accessToken = 'pk.eyJ1IjoidGhlYW5kcmV3YnJpZ2dzIiwiYSI6ImNpaHh2Z2hpcDAzZnd0bG0xeDNqYXdiOGkifQ.jV7_LuEh4KX2r5RudiQdIg';
                var mapboxTiles = L.tileLayer(mapboxURL + accessToken,
                    {attribution: 'Imagery from <a href="http://mapbox.com/about/maps/">MapBox</a>'});

                map = new L.map('map').setView(state.point, zoom);   // Initialize Leaflet map
                map.addLayer(mapboxTiles);
                map.addLayer(popupLayer);

                // draw marker for geolocated point
                //      and open the map if on mobile
                if (state.isGeolocated) {
                    geolocatedIcon = L.icon({
                        iconUrl: common.getUrl('icon-geolocation'),
                        iconSize: [50, 50], 
                        iconAnchor: [17, 45]
                    });
                    geolocatedMarker = L.marker(state.point, {icon: geolocatedIcon}).addTo(map).setZIndexOffset(1000);

                    if (label) {
                        geolocatedMarker.on('click', function (e) {
                            var popupText = '<b>Current Search Location</b><p>{{ label }}</p>',
                                popupTemplate = Handlebars.compile(popupText);

                            geolocatedMarker.bindPopup(popupTemplate({label: label}));
                        });
                    }

                    var width = $(document).width();
                    if (width < common.breakpoints.desktop) {
                        mapToggle();
                    }
                }

                // add class 'in' to set filters state if requested by history and were on desktop
                // 
                // This seems to be partially outdated? I don't think there's any chevron in use any
                // more; still trying to parse how the show/hide filters on mobile works. These are
                // the only references to '#refineBtn' in the app. 
                //  - ajb, 3 May 2016
                //
                $(document).ready(function() {
                    var width = $(document).width(),
                        $refineBtn = $('#refineBtn');

                    if (historyState.filtersVisible !== false && width >= common.breakpoints.desktop) {
                        $collapseFilters.addClass('in');
                        $refineBtn.find('i').toggleClass('icon-down-open icon-right-open');
                    }
                    // Chevron change
                    $refineBtn.click(function() {
                        $(this).find('i').toggleClass('icon-down-open icon-right-open');
                        if (updateUrl) {
                            updateUrl(map.getCenter(), map.getZoom(), !($collapseFilters.hasClass('in')));
                        }
                    });
                });

                autocompleteLocationId = $map.data('location-id');
                autocompleteNeighborhoodId = $map.data('neighborhood-id');

                $locationWrapper = $('.locations-wrapper');
                map.on('zoomend', displayMap);    // Set event handler to call displayMap when zoom changes
                dm.events.on('DataManager.filtersUpdated', displayMap);
                map.on('moveend', displayMap);
                map.on('zoomend', displayMap);


                // highlight the appropriate list item when a location popup is shown
                map.on('popupopen', function(e) {
                    var $div = $('div.location-container[data-key=' + e.popup.options.key + ']');
                    if ($div.length > 0) {
                        $div.addClass('highlight');
                        $div[0].scrollIntoView();
                    }
                });

                // remove all highlighting when a location popup is closed
                map.on('popupclose', function() {
                    $('.location-container.highlight').removeClass('highlight');
                });

                // set up social sharing for the top button (next to favorites)
                $('#share-favorites-btn').on('click', favorites.initShareModal);

                // Bind filtering click handlers
                $filters.on('click', function() { dm.onFilterChange(); });
                $filterClearAll.on('click', function() {
                    $filters.prop('checked', false);
                    dm.onFilterChange();
                });

                $('#toggleMapBtn').click(function(e) {
                    mapToggle();
                    e.preventDefault();
                });

                // For the Contact button in locationList
                $('body').on('click', '.single-contact', function () {
                    var id = $(this).data('key');
                    $("#favs-toggle-loc-" + id).trigger('click');
                    return false;
                });

                displayMap();
                refineListener();
            }
        };
    }
);
