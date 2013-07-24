/********************************************************
 * Copyright (c) 2013 Azavea, Inc.
 * See LICENSE in the project root for copying permission
 ********************************************************/


define(['jquery', 'Leaflet', 'text!templates/neighborhoodList.html', 'text!templates/locationList.html', 
        'topojson', 'icons', 'favorites', 'common', CEL.serverVars.gmapRequire, 'styling'], 
    function($, L, neighborhoodList, locationList, topojson, icons, favorites, common) {
        'use strict';

        var map,   // Leaflet map
            gmap,    // Google basemap
            zoomSettings = CEL.serverVars.zoomSettings,   // setting for zoom transition
            defaultZoom = $('#map').data('zoom') || 10,
            latSettings = CEL.serverVars.latSettings,    // lng + lat settings for initial view
            lngSettings = CEL.serverVars.lngSettings,
            locations,    // Store location data
            neighborhoods,    // Store neighborhood data
            template,    // Hold handlebars template
            layerType = { none: 'none', neighborhood: 'neighborhood', location: 'location'},
            // Keep track of current layer displayed
            currentLayer = layerType.none,
            locationLayer = new L.LayerGroup(),   // Location/school layer group
            neighborhoodLayer = new L.LayerGroup(),   // Neighborhood layer group
            popupLayer = new L.LayerGroup(),   // Popup Layer
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
            var zoomLevel = map.getZoom();
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
                for(var i = 0; i < locations.length; i++) {
                    var lat = locations[i].position.lat,
                        lng = locations[i].position.lng,
                        locMarker = L.marker([lat, lng], {icon: icons.schoolIcon});
                    locationLayer.addLayer(locMarker);
                }
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
        };

        /*
         * Override default lat/lng settings geolocation lat/lng if it exists 
         */
        var getMapLatLng = function() {
            var lat = latSettings,
                lng = lngSettings,
                $map = $('#map'),
                geolat = $map.data('geo-lat'),
                geolng = $map.data('geo-lng');
            if (geolat && geolng) {
                lat = geolat; 
                lng = geolng;
            } 
            return [lat, lng];
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

        // Load data and build map when page loads
        return {
            init: function(){
                map = new L.map('map').setView(getMapLatLng(), defaultZoom);    // Initialize Leaflet map
                gmap = new L.Google('ROADMAP');    // Add Google baselayer
                map.addLayer(gmap);
                map.addLayer(popupLayer);
                $locationWrapper = $('.locations-wrapper');
                map.on('zoomend', displayMap);    // Set event handler to call displayMap when zoom changes
                loadData();    // Load initial data
            }
        };
    }
);
