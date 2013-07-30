/********************************************************
 * Copyright (c) 2013 Azavea, Inc.
 * See LICENSE in the project root for copying permission
 ********************************************************/


define(['jquery', 'Leaflet', 'text!templates/neighborhoodList.html', 'text!templates/locationList.html', 
        'topojson', 'icons', 'favorites', 'location', 'common', CEL.serverVars.gmapRequire, 'styling',
        'leaflet-providers'], 
    function($, L, neighborhoodList, locationList, topojson, icons, favorites, location,  common) {

        'use strict';

        var map,   // Leaflet map
            $map = $('#map'),
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
            dm = new location.DataManager(),    // DataManager object
            isAutocompleteSet = true,
            autocompleteLocationId,
            autocompleteNeighborhoodId,
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
        var displayMap = function() {
            var zoomLevel = map.getZoom();

            if (isAutocompleteSet && autocompleteLocationId) {
                dm.locationUpdate(map);
            } else if (isAutocompleteSet && autocompleteNeighborhoodId) {
                dm.neighborhoodUpdate(map);
            } else if (currentLayer !== layerType.neighborhood && zoomLevel < zoomSettings) {
                dm.neighborhoodUpdate(map);
            } else if (currentLayer !== layerType.location && zoomLevel >= zoomSettings) {
                dm.locationUpdate(map);
            }
        };

        /**
         * Changes list results display using Handlebars templates
         * @param {Array of neighborhoods or locations} data
         */
        var listResults = function(data, dataType) {
            var html = dataType === layerType.neighborhood ? neighborhoodList : locationList,
                template = Handlebars.compile(html),
                handlebarsData = [];

            $.each(data, function(key, value) {
                var item = layerType.neighborhood === dataType ? value : value.data;
                handlebarsData.push(item);
            });

            $locationWrapper.empty();
            $locationWrapper.append(template(handlebarsData));

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
                button: ".favs-toggle"
            });

            /**
             * Watch for favorite events, if there is one, then setIcon again
             */
            $('.favs-toggle').on('click', function(e) {
                var $this = $(this),
                    key = $this.data('loc-id'),
                    loc = dm.locations[key];
                loc.setIcon();
            });

            // Watch for hover events on the list so we can highlight both 
            // the list item and the icon on the map
            
            $('.location-container').hover(function(e) {
                var $this = $(this),
                    key = $this.data('key'),
                    loc = dm.locations[key];

                // Keeping the icon selection simple for now, since everything is
                // currently hardcoded to school and there is a separate icon management
                // task. This swaps out the marker for a highlight marker on mouseenter and 
                // switches it back to school on mouseleave. It should eventually tie in to
                // the icon management system, using the data of the location to determine the
                // appropriate icon state. The highlight marker will probably go away and will
                // be more specific to the actual marker (probably just increasing its size).
                if (e.type === 'mouseenter') {
                    $this.addClass('highlight');
                    loc.setIcon({'highlighted': true});
                } else if (e.type === 'mouseleave') {
                    $this.removeClass('highlight');
                    loc.setIcon({'highlighted': false});
                }
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
                map.panTo([$(this).data('lat'), $(this).data('lng')]);
                map.setZoom(zoomSettings);
                displayMap();
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
            var popupContent = '<b>' + name + '</b><br>Number of Schools: ' + numSchools + '<br><a class="neighborhood-popup" href="#">Explore</a>',
                popup = L.popup().setLatLng([lat, lng]).setContent(popupContent).addTo(popupLayer);

            $('.neighborhood-popup').on('click', function(e) {
                map.panTo([lat, lng]);
                map.setZoom(zoomSettings);
                displayMap();
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
            $('.locations-wrapper .accordion-group').click(function() {
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
        dm.events.on("DataManager.neighborhoodUpdated", function(e) {
            // If not already displaying neighborhoods and zoomed out
            currentLayer = layerType.neighborhood;
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
        dm.events.on("DataManager.locationUpdated", function(e) {
            // If not already displaying locations and zoomed in
            currentLayer = layerType.location;
            map.removeLayer(neighborhoodLayer);
            map.addLayer(locationLayer);
            popupLayer.clearLayers();
            listResults(dm.locations, currentLayer);

            // Create map markers and bind popups
            $.each(dm.locations, function(i, location) {
                var locMarker = location.getMarker();
                locationLayer.addLayer(locMarker);
            });

            // set map to location/neighborhood if autocomplete requested it
            setAutocompleteLocation();

            // Bind to accordion events so we can pan to the map location
            $('.accordion-group').click(function() {
                var $this = $(this),
                key = $this.data('key'),
                loc = dm.locations[key],
                marker = loc.getMarker(),
                latLng = loc.getLatLng();

                // 'togglePopup' would work better here, but it appears our version of leaflet
                // doesn't have it implemented. If we upgrade leaflet, we should switch this
                // to use it. Either that or keep track of whether or not this accordion group
                // is collapsed (there is currently a 'collapsed' class added, but it seems to
                // be inconsistent when testing it, probably due to some behind-the-scenes
                // setTimeouts.
                marker.openPopup();
                map.panTo(latLng);
            });
        });


        dm.events.on('DataManager.filtersUpdated', displayMap);


        // Load data and build map when page loads
        return {
            init: function(){
                var state = getMapState();
                map = new L.map('map').setView(state.point, defaultZoom);   // Initialize Leaflet map
                L.tileLayer.provider('Acetate.all').addTo(map);             // basemap
                map.addLayer(popupLayer);

                // draw marker for geolocated point 
                if (state.isGeolocated) {
                    geolocatedIcon = L.icon({
                        iconUrl: common.getUrl('autocomplete-icon')
                    });
                    geolocatedMarker = L.marker(state.point, {icon: geolocatedIcon}).addTo(map);
                }

                autocompleteLocationId = $map.data('location-id');
                autocompleteNeighborhoodId = $map.data('neighborhood-id');

                $locationWrapper = $('.locations-wrapper');
                map.on('zoomend', displayMap);    // Set event handler to call displayMap when zoom changes

                // highlight the appropriate list item when a location popup is shown
                map.on('popupopen', function(e) {
                    $('div[data-key=' + e.popup.options.key + ']').addClass('highlight');
                });

                // remove all highlighting when a location popup is closed
                map.on('popupclose', function() {
                    $('.location-container.highlight').removeClass('highlight');                           
                });

                // set up social sharing for the top button (next to favorites)
                $('#share-favorites-btn').on('click', favorites.initShareModal);
                
                mapToggle();
                displayMap();
            }
        };
    }
);
