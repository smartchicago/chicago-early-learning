/********************************************************
 * Copyright (c) 2013 Azavea, Inc.
 * See LICENSE in the project root for copying permission
 ********************************************************/


define(['jquery', 'Leaflet', 'text!templates/neighborhoodList.html', 'text!templates/locationList.html', 
        'topojson', 'icons', 'favorites', 'common', CEL.serverVars.gmapRequire, 'styling', 'leaflet-providers'], 
    function($, L, neighborhoodList, locationList, topojson, icons, favorites, common) {
        'use strict';

        var map,   // Leaflet map
            gmap,    // Google basemap
            zoomSettings = CEL.serverVars.zoomSettings,   // setting for zoom transition
            defaultZoom = $('#map').data('zoom') || 10,
            latSettings = CEL.serverVars.latSettings,    // lng + lat settings for initial view
            lngSettings = CEL.serverVars.lngSettings,
            autocompleteIcon,
            autocompleteMarker,                         // marker for autocomplete request
            locations,    // Store location data
            neighborhoods,    // Store neighborhood data
            template,    // Hold handlebars template
            layerType = { none: 'none', neighborhood: 'neighborhood', location: 'location'},
            // Keep track of current layer displayed
            currentLayer = layerType.none,
            locationLayer = new L.LayerGroup(),   // Location/school layer group
            neighborhoodLayer = new L.LayerGroup(),   // Neighborhood layer group
            popupLayer = new L.LayerGroup(),   // Popup Layer
            markerMap, // Used for storing a map of location keys -> map markers
            neighborhoodGeojson,    // Store neighborhood geojson
            $locationWrapper;    // Store div wrapper for results on left side

        /**
         * Loads Json data for neighborhoods and locations
         * then displays one based on current zoom level
         */
        var loadData = function() {
            $.when(
                $.getJSON(common.getUrl('location-api'), function(data) {
                    locations = data.locations;
                }),
                $.getJSON(common.getUrl('neighborhood-api'), function(data) {
                    neighborhoods = data;
                }),
                $.getJSON(common.getUrl('neighborhoods-topo'), function(data) {
                    neighborhoodLayer = L.geoJson(null, {
                        style: {
                            color: '#666',
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
                    neighborhoodGeojson = topojson.feature(data, data.objects.neighborhoods);
                })).then(displayMap);
        };

        /**
         * Controls logic of whether to display locations or neighborhoods
         * based on current zoom level. Called when map is initialized
         * and after a change in zoom level.
         */
        var displayMap = function() {
            var zoomLevel = map.getZoom(),
                popupTemplate = Handlebars.compile('<b>{{item.site_name}}</b><br>{{item.address}}');
            
            if (currentLayer !== 'neighborhood' && zoomLevel < zoomSettings) {
                // If not already displaying neighborhoods and zoomed out
                currentLayer = layerType.neighborhood;
                listResults(neighborhoods);
                locationLayer.clearLayers();
                neighborhoodLayer.clearLayers();
                neighborhoodLayer.addData(neighborhoodGeojson);
                map.addLayer(neighborhoodLayer);
                panHandler();
                exploreButton(neighborhoods);
            }
            else if (currentLayer !== 'location' && zoomLevel >= zoomSettings) {
                // If not already displaying locations and zoomed in
                map.removeLayer(neighborhoodLayer);
                map.addLayer(locationLayer);
                popupLayer.clearLayers();
                currentLayer = layerType.location;
                listResults(locations);
                markerMap = {};

                // Create map markers and bind popups
                $.each(locations, function(i, location) {
                    var pos = location.position,
                        lat = pos.lat,
                        lng = pos.lng,
                        icon = icons.schoolIcon,
                        locMarker = L.marker([lat, lng], { icon: icon }),
                        key = location.item.key;

                    markerMap[key] = locMarker;
                    locationLayer.addLayer(locMarker);
                    locMarker.bindPopup(popupTemplate(location), { key: key });
                });

                // Bind to accordion events so we can pan to the map location
                $('.accordion-group').click(function() {
                    var $this = $(this),
                        key = $this.data('key'),
                        marker = markerMap[key],
                        latLng = marker.getLatLng();

                    // 'togglePopup' would work better here, but it appears our version of leaflet
                    // doesn't have it implemented. If we upgrade leaflet, we should switch this
                    // to use it. Either that or keep track of whether or not this accordion group
                    // is collapsed (there is currently a 'collapsed' class added, but it seems to
                    // be inconsistent when testing it, probably due to some behind-the-scenes
                    // setTimeouts.
                    marker.openPopup();
                    map.panTo(latLng);
                });
            }
        };

        /**
         * Changes list results display using Handlebars templates
         * @param {Array of neighborhoods or locations} data
         */
        var listResults = function(data) {
            var html = (data.neighborhoods) ? neighborhoodList : locationList;
            template = Handlebars.compile(html);
            $locationWrapper.empty();
            $locationWrapper.append(template(data));

            favorites.syncUI();
            favorites.addToggleListener({
                button: ".favs-toggle"
            });

            // Watch for hover events on the list so we can highlight both 
            // the list item and the icon on the map
            $('.location-container').hover(function(e) {
                var $this = $(this),
                    key = $this.data('key'),
                    marker = markerMap[key];

                // Keeping the icon selection simple for now, since everything is
                // currently hardcoded to school and there is a separate icon management
                // task. This swaps out the marker for a highlight marker on mouseenter and 
                // switches it back to school on mouseleave. It should eventually tie in to
                // the icon management system, using the data of the location to determine the
                // appropriate icon state. The highlight marker will probably go away and will
                // be more specific to the actual marker (probably just increasing its size).
                if (e.type === 'mouseenter') {
                    $this.addClass('highlight');
                    marker.setIcon(icons.highlightIcon);
                } else if (e.type === 'mouseleave') {
                    $this.removeClass('highlight');
                    marker.setIcon(icons.schoolIcon);
                }
            });
        };

        /*
         * Get map state from DOM and override defaults if necessary 
         */
        var getMapState = function() {
            var lat = latSettings,
                lng = lngSettings,
                $map = $('#map'),
                geolat = $map.data('geo-lat'),
                geolng = $map.data('geo-lng'),
                isAutocomplete = false;
            if (geolat && geolng) {
                lat = geolat; 
                lng = geolng;
                isAutocomplete = true;
            } 
            return { point: [lat, lng], isAutocomplete: isAutocomplete };
        };

        /**
         * Add functionality to explore button when viewing neighborhoods.
         * On click - map pans to center of neighborhood and zooms, then
         * rebuilds list display
         * @param {Array of neighborhoods} data
         */
        var exploreButton = function(data) {
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
            var popupContent = '<b>' + name + '</b><br>Number of Schools: ' + numSchools,
                popup = L.popup().setLatLng([lat, lng]).setContent(popupContent).addTo(popupLayer);
        };
        
        /**
         * Function that handles pans to neighborhood when clicking on accordion group
         * 
         * Mostly just a wrapper around neighborhoodPan
         */
        var panHandler = function() {
            $('.accordion-group').click(function() {
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

        // Load data and build map when page loads
        return {
            init: function(){
                var state = getMapState();
                map = new L.map('map').setView(state.point, defaultZoom);    // Initialize Leaflet map
                /*
                var osmUrl='http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
                    osmAttrib='Map data © OpenStreetMap contributors',
                    osm = new L.TileLayer(osmUrl, {attribution: osmAttrib});       
                map.addLayer(osm);
                */
                L.tileLayer.provider('Acetate.all').addTo(map);
                map.addLayer(popupLayer);

                // draw marker for autocompleted location
                if (state.isAutocomplete) {
                    autocompleteIcon = L.icon({
                        iconUrl: common.getUrl('autocomplete-icon')
                    });
                    autocompleteMarker = L.marker(state.point, {icon: autocompleteIcon}).addTo(map);
                }

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
                
                loadData();    // Load initial data
                mapToggle();
            }
        };
    }
);
