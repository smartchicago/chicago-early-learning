/********************************************************
 * Copyright (c) 2013 Azavea, Inc.
 * See LICENSE in the project root for copying permission
 ********************************************************/


define(['jquery', 'Leaflet', 'Handlebars', 'text!templates/neighborhoodList.html', 'text!templates/locationList.html', 
        'topojson', 'icons', 'favorites', 'location', 'common', CEL.serverVars.gmapRequire, 'styling',
        'leaflet-providers', 'history'], 
    function($, L, Handlebars, neighborhoodList, locationList, topojson, icons, favorites, location, common) {

        'use strict';

        var map,   // Leaflet map
            $map = $('#map'),
            $filters = $('.filters-inner :checkbox'),
            $filterClearAll = $('#filter-clear-all'),
            listItemSelector = '.locations-wrapper .accordion-group',
            zoomSettings = CEL.serverVars.zoomSettings,   // setting for zoom transition
            defaultZoom = $map.data('zoom') || 10,
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
                    neighborhoodPan(value.name, value.schools, value.center.lat, value.center.lng, true);
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
                updateUrl();
            } else {
                // If we move the map, don't want to go back to geolocated spot in history
                // and also don't want the geolocated marker at the center of the map user
                // is going back to.
                updateUrl = function () {
                    History.pushState(
                        {isGeolocated: false},
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
                handlebarsData = [];

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

            $locationWrapper.empty();
            $locationWrapper.append(template(handlebarsData));

            // set header title
            var $headerFav = $('#header-fav'),
                $headerDist = $('#header-dist');
            if (isNb) {
                $headerFav.text(gettext('Neighborhood'));
                $headerDist.text(gettext('Schools'));
            } else {
                $headerFav.text(gettext('School'));
                $headerDist.text(gettext('More Information'));
            }

            // bind social sharing button clicks for individual locations
            $locationWrapper.find('.share-btn').on('click', function() {
                var key = $(this).data('key');

                $('#share-modal').trigger('init-modal', {
                    // the url is passed in to the sharing urls, so it must be absolute
                    url: document.location.origin + '/location/' + key  + '/',
                    title: 'Check out this early learning program'
                });
            });

            favorites.syncUI();
            favorites.addToggleListener({
                button: '.favs-toggle'
            });

            /**
             * Watch for favorite events, if there is one, then setIcon again
             */
            $('.favs-toggle').on('click', function(e) {
                var $this = $(this),
                    key = $this.data('loc-id'),
                    loc = dm.locations[key],
                    iconkey = 'icon-' + loc.getIconKey();

                // always highlighted because the mouse will be over the accordion div for the click
                loc.setIcon({ highlighted: true });
                $('#loc-icon-' + key).attr('src', common.getUrl(iconkey));
            });

            // Watch for hover events on the list so we can highlight both 
            // the list item and the icon on the map
            var $locationContainer = $('.location-container');
            $locationContainer.each(function(index) {
                var $this = $(this),
                    key = $this.data('key'),
                    loc = dm.locations[key],
                    iconkey = 'icon-' + loc.getIconKey();
                $('#loc-icon-' + key).attr('src', common.getUrl(iconkey));
            }).on('show.bs.collapse', function(e) {
                var $this = $(this),
                    $morelessbtn = $this.find('.more-less-btn'),
                    $directionsLink = $this.find('#loc-dirs');
                $morelessbtn.html(gettext('Less'));
                $morelessbtn.attr('data-hint', gettext('Click to show less information'));
            }).on('hide.bs.collapse', function(e) {
                var $this = $(this),
                    $morelessbtn = $this.find('.more-less-btn');
                $morelessbtn.html(gettext('More'));
                $morelessbtn.attr('data-hint', gettext('Click to show more information'));
            });
            // feature detection: we only want hover events on non-touch devices 
            if (!('ontouchstart' in document.documentElement)) {
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
        var refineListener = function(){
            $('#collapseFilters').on('show.bs.collapse', function(e) { 
                $('#refineBtn').attr('data-hint', gettext('Click to hide filters')); 
            }).on('hide.bs.collapse', function(e) {
                $('#refineBtn').attr('data-hint', gettext('Click to show filters'));
            });
        };

        /*
         * Get map state from DOM and override defaults if necessary 
         */
        var getMapState = function() {
            var lat = latSettings,
                lng = lngSettings,
                geolat = $map.data('geo-lat'),
                geolng = $map.data('geo-lng'),
                isGeolocated = false;
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
            var popupContent = '<b>' + name + '</b><br>' + gettext('Number of Schools') + ': ' + numSchools + '<br><a class="neighborhood-popup" href="#">' + gettext('Explore') + '</a>',
                popup = L.popup().setLatLng([lat, lng]).setContent(popupContent).addTo(popupLayer);

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
            $('#toggleMapBtn').click(function() {
                $('.results-left').toggle();
                var $resultsRight = $('.results-right');
                if ($resultsRight.css('visibility') === 'hidden') {
                    $resultsRight.css('visibility', 'visible');
                }
                else {
                    $resultsRight.css('visibility', 'hidden');
                }
            });
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



        // Load data and build map when page loads
        return {
            init: function() {
                var state = getMapState(),
                    historyState = History.getState().data;
                map = new L.map('map').setView(state.point, defaultZoom);   // Initialize Leaflet map
                L.tileLayer.provider('Acetate.all').addTo(map);             // basemap
                map.addLayer(popupLayer);

                // Use history for mapstate if not undefined (prevents geolocation when browsing back)
                state.isGeolocated = typeof historyState.isGeolocated === 'undefined' ? state.isGeolocated : historyState.isGeolocated;
                
                // draw marker for geolocated point 
                if (state.isGeolocated) {
                    geolocatedIcon = L.icon({
                        iconUrl: common.getUrl('icon-geolocation')
                    });
                    geolocatedMarker = L.marker(state.point, {icon: geolocatedIcon}).addTo(map);
                }

                autocompleteLocationId = $map.data('location-id');
                autocompleteNeighborhoodId = $map.data('neighborhood-id');

                $locationWrapper = $('.locations-wrapper');
                map.on('zoomend', displayMap);    // Set event handler to call displayMap when zoom changes
                dm.events.on('DataManager.filtersUpdated', displayMap);
                map.on('moveend', displayMap);
                map.on('zoomend', displayMap);


                // highlight the appropriate list item when a location popup is shown
                map.on('popupopen', function(e) {
                    var $div = $('.location-container div[data-key=' + e.popup.options.key + ']');
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
                mapToggle();
                displayMap();
                refineListener();
            }
        };
    }
);
