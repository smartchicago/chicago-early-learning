
define(['jquery', 'Leaflet', 'Handlebars', 'text!templates/redesign/search-result.html', 'text!templates/location-popup.html', 'common', 'favorites'],
    function($, L, Handlebars, searchResultHTML, popupHTML, common, favorites) {
        var map,
            $map = $('#map'),
            $filters = $('#filters'),
            $filters_inputs = $filters.find('input:checkbox'),
            $filters_toggle = $('#filters-toggle'),
            $filters_clear = $('#filters-clear'),
            $results_wrapper = $('#results'),
            $results_default = $('.results-default'),
            $results_calculator = $('.results-calculator'),
            $results_scroll = $('.results-scroll'),
            $results_age = $('#calculated-age'),
            $results_list = $('.results-list'),
            $locations_more = $('#locations-more'),
            $search_input = $('#search-input'),
            $compare = $('#compare'),
            $compare_submit = $('#compare_submit'),
            $compare_buttons = $('.compare-btn'),
            $compare_count = $('#compare-count'),
            $compare_site = $('#compare-site'),
            $compare_sites = $('#compare-sites'),
            accessToken = 'pk.eyJ1IjoidGhlYW5kcmV3YnJpZ2dzIiwiYSI6ImNpaHh2Z2hpcDAzZnd0bG0xeDNqYXdiOGkifQ.jV7_LuEh4KX2r5RudiQdIg',
            mapboxURL,
            mapboxTiles,
            locationLayer = new L.layerGroup(),
            neighborhoodLayer = new L.layerGroup(),
            popupLayer = new L.LayerGroup(),
            legend = L.control({position: 'bottomright'}),
            default_longitude = -87.6207733154,
            default_latitude = 41.8725248264,
            default_zoom = 11,
            location_zoom = 15,
            neighborhood_zoom_cutoff = 13,
            list_index = 0,
            neighborhoods_data = {},
            locations = [],
            display_labels = [],
            locationMarkers = [],
            geolocatedMarker;

        var layerType = {
                // No map layer is currently selected
                none: 'none',

                // Neighborhood polygons layer
                neighborhood: 'neighborhood',

                // Individual locations/schools layer
                location: 'location'
            },
            current_layer = layerType.none;

        if (common.isRetinaDisplay()) {
            mapboxURL = 'https://api.mapbox.com/v4/mapbox.streets/{z}/{x}/{y}@2x.png?access_token='
        } else {
            mapboxURL = 'https://api.mapbox.com/v4/mapbox.streets/{z}/{x}/{y}.png?access_token='
        }

        neighborhoodLayer = L.geoJson(null, {
            style: {
                color: '#ee5713',
                fillColor: '#ee703f',
                weight: 1,
                opacity: 1,
                fillOpacity: 0.7
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

        legend.onAdd = function (map) {
            var div = L.DomUtil.create('div', 'legend');
            div.innerHTML += '<img src="/static/img/legend_' + $map.data('language') + '.png">';
            return div;
        }
        
        /* -- Functions -- */

        /*  Get basic map stats  */
        var getMapState = function() {
            var latitude = $map.data('latitude') || default_latitude,
                longitude = $map.data('longitude') || default_longitude,
                isGeolocated = false;
                zoom = default_zoom;

            current_layer = layerType.neighborhood;

            if ($map.data('latitude') && $map.data('longitude')) {
                isGeolocated = true;
                zoom = 15;
                current_layer = layerType.location;
            }

            return { point: [latitude, longitude],
                     isGeolocated: isGeolocated,
                     zoom: zoom };
        }


        /*  Icon wrapper function  */
        var getMarkerIcon = function(current_location) {
            var defaults = {
                iconUrl: '/static/img/map-icons/2x/CBO/neutral.png',
                shadowUrl: '/static/img/leaflet-icons/marker-shadow.png',
                iconSize: [50, 50],
                shadowSize: [41, 41],
                iconAnchor: [25, 50],
                shadowAnchor: [10, 41],
                popupAnchor: [0, -60],
                className: 'location-id-'
            };

            defaults.iconUrl = getMarkerUrl(current_location);
            defaults.className += current_location.id;
            return defaults;
        }


        /*  Construct Marker image URL from location data  */
        var getMarkerUrl = function(current_location) {
            var icon_url = '/static/img/map-icons/2x/';
            icon_url += current_location.cps ? 'CPS/' : 'CBO/';
            icon_url += (current_location.availability) ? current_location.availability : 'neutral';
            icon_url += (current_location.accred == "") ? '-accredited' : '';
            icon_url += (favorites.isStarred(current_location.id)) ? '-selected' : '';
            icon_url += '.png';

            return icon_url;
        }


        /*  Construct Location Popup  */
        var setPopup = function(location_data) {
            var popup_template = Handlebars.compile(popupHTML),
                content = popup_template(location_data);

            return L.popup().setContent(content);
        }


        /*  Initialize Map  */
        var drawMap = function(locations) {
            $.each(locations, function(i, location_data) {
                var location_icon = new L.icon(getMarkerIcon(location_data));
                var locationMarker = L.marker([location_data.latitude, location_data.longitude], {icon: location_icon});
                locationMarkers.push(locationMarker);

                locationMarker.on('click', function(e) {
                    var popup = setPopup(location_data);
                    this.bindPopup(popup);
                });
            });
            
            state = getMapState();
            locationLayer = new L.layerGroup(locationMarkers);
            neighborhoodLayer.addData(neighborhoods_data);
            map = new L.map('map').setView(state.point, state.zoom);
            mapboxTiles = L.tileLayer(mapboxURL + accessToken,
                    { attribution: 'Imagery from <a href="http://mapbox.com/about/maps/">MapBox</a>'});
            map.addLayer(mapboxTiles);
            map.addLayer(popupLayer);

            switch (current_layer) {
                case layerType.neighborhood:
                    map.addLayer(neighborhoodLayer);
                    break;
                case layerType.location:
                    map.addLayer(locationLayer);
                    map.addControl(legend);
                    break;
            }

            map.on('zoomend', function(e) {
                updateLayer(map.getZoom());
            });

            if (state.isGeolocated) {
                var geolocatedIcon = L.icon({iconUrl: common.getUrl('icon-geolocation'), iconSize: [50, 50], iconAnchor: [17, 45]});
                geolocatedMarker = L.marker(state.point, {icon: geolocatedIcon}).addTo(map).setZIndexOffset(1000);
            }
        }


        /*  Update Map with new data  */
        var updateMap = function(locations) {
            var filtered_locations = filterLocations(locations);
            locationMarkers = [];

            $.each(filtered_locations, function(i, location) {
                var location_icon = new L.icon(getMarkerIcon(location));
                var location = L.marker([location.latitude, location.longitude], {icon: location_icon});
                locationMarkers.push(location);
            });
            var filteredLayer = new L.layerGroup(locationMarkers);
            map.removeLayer(locationLayer);
            map.addLayer(filteredLayer);
            locationLayer = filteredLayer;
        }


        /*  Switch between neighborhood and location layers  */
        var updateLayer = function(zoom) {
            switch (current_layer) {
                case layerType.location:
                    if ( zoom <= neighborhood_zoom_cutoff ) {
                        popupLayer.clearLayers();
                        map.removeLayer(locationLayer);
                        map.removeControl(legend);
                        map.addLayer(neighborhoodLayer);
                        current_layer = layerType.neighborhood;

                        if (geolocatedMarker) { map.removeLayer(geolocatedMarker); }
                    }
                    break;
                case layerType.neighborhood:
                    if ( zoom > neighborhood_zoom_cutoff) {
                        popupLayer.clearLayers();
                        map.removeLayer(neighborhoodLayer);
                        map.addLayer(locationLayer);
                        map.addControl(legend);
                        current_layer = layerType.location;

                        if (geolocatedMarker) { map.addLayer(geolocatedMarker); }
                    }
                    break;
            }
        }


        /*  Change location marker image when adding location to favorites  */
        var toggleFavoriteMarker = function(current_location) {
            var favorite_ids = favorites.getFavoriteIds(),
                icon_url = getMarkerUrl(current_location),
                location_class = '.location-id-' + current_location.id,
                $marker = $map.find('.leaflet-marker-icon' + location_class);

            $marker.attr('src', icon_url);
        }


        /*    */
        var initializeList = function(calculated) {
            var age_filter = $filters_inputs.filter(calculated.program);
            age_filter.prop('checked', true);
            $filters.trigger('filters-update');
            $results_age.text(calculated.years);
            $results_calculator.hide();
            $results_scroll.show();
        }

        /*  Add locations to results column  */
        var listLocations = function(locations) {
            var filtered_locations = filterLocations(locations),
                sorted_locations = sortLocations(filtered_locations),
                html = searchResultHTML,
                first_ten = sorted_locations.slice(list_index, list_index+10),
                template = Handlebars.compile(html);

            list_index+=10;
            $results_list.append(template(first_ten));

            syncFavorites();

            $('.compare-btn').off().on('click', function() {
                var $this = $(this),
                    this_id = $this.data('location'),
                    this_location = locations.filter(function(toggled_location) { return (toggled_location.id == this_id) })[0];

                favorites.toggleFavoriteButton($this);
                toggleFavoriteMarker(this_location);
                $compare.trigger('favorites-update');
            });
        }


        /*  Calculate and sort locations by distance from query  */
        var sortLocations = function(locations) {
            return locations.sort(function(a, b) { return a.distance - b.distance });
        }


        /*  Grab current active filters  */
        var currentFilters = function() {
            var inputs = $filters_inputs.filter(":checked");
            var ids = $.map(inputs, function(element) {
                return element.id;
            });
            return ids;
        }


        /*  Clear filters  */
        var clearFilters = function() {
            $filters_inputs.prop('checked', false);
        }


        /*  Apply current filters to location list  */
        var filterLocations = function(location_list) {
            function allTrue(element, index, array) {
                return element == true;
            }

            var filter_ids = currentFilters();
            var filtered_locations = location_list.filter(function(current_location) {
                var filter_bools = $.map(filter_ids, function(f) { 
                    // Protect against nulls
                    if (current_location[f]) {
                        return true;
                    } else {
                        return false;
                    }
                });
                return filter_bools.every(allTrue);
            });
            return filtered_locations;
        }


        /*  Distance between two lat/long pairs  */
        var calculateHaversine = function(latitude_to, longitude_to, latitude_from, longitude_from) {
            var p = 0.017453292519943295,
                c = Math.cos,
                a = 0.5 - c((latitude_to - latitude_from) * p)/2 +
                    c(latitude_from * p) * c(latitude_to * p) *
                    (1 - c((longitude_to - longitude_from) * p))/2;

                return 12742 * Math.asin(Math.sqrt(a)) * 0.621371192;
        }


        /*  Apply favorite styles to buttons, compare link button, and location icons on load  */
        var syncFavorites = function() {
            var favorite_sites = favorites.getFavoriteIds(),
                $compare_buttons = $results_wrapper.find('.compare-btn'),
                $favorited_buttons;

            $favorited_buttons = $compare_buttons.filter(function(i, button) {
                var $button = $(button),
                    button_id = $button.data('location');

                return ($.inArray(String(button_id), favorite_sites)  >= 0);
            });

            $.each($favorited_buttons, function(i, button) {
                var $button = $(button);
                favorites.toggleFavoriteButton($button, 'add');
            });

            if (favorite_sites.length > 1) {
                $compare_count.html(favorite_sites.length);
                $compare_site.hide();
                $compare_sites.show();
                $compare.show();
            } else if (favorite_sites.length > 0) {
                $compare_count.html(favorite_sites.length);
                $compare_sites.hide();
                $compare_site.show();
                $compare.show();
            } else {
                $compare.hide();
            }
        }

        var neighborhoodPan = function(name, numSchools, lat, lng, panFlag) {
            popupLayer.clearLayers();
            if (panFlag) {
                map.panTo([lat, lng]);
                if ( map.getZoom() <= default_zoom ) {
                    map.setZoom(location_zoom);
                }
            }
            var popupContent = '<b>' + name + '</b><br>' + gettext('Number of Locations') + ': ' + numSchools + '<br><a class="neighborhood-popup" href="#">' + gettext('Explore') + '</a>',
                popup = L.popup().setLatLng([lat, lng]).setContent(popupContent).addTo(popupLayer);

            $('.neighborhood-popup').on('click', function(e) {
                map.setView([lat, lng], location_zoom);
            });
        }

        /* -- Calculator -- */
        var $month = $('#month'),
            $day = $('#day'),
            $year = $('#year'),
            $input_two = $('.input-two'),
            $calculator = $('.calculator'),
            $calculator_block = $('.results-calculator-form');

        var validateDate = function(month, day, year) {
            var date = new Date(year, month, day);

            if (year < 1000 || year > 3000 || month < 0 || month > 12 || day > 31) {
                return false;
            } else if ( isNaN(year) || isNaN(month) || isNaN(day) ) { 
                return false
            } else if ( typeof date != 'undefined' ) {
                return true;
            } else {
                return false;
            }
        }

        var calculateProgram = function(month, day, year) {
            var date = new Date(year, month, day),
                preschool_cutoff = new Date(2012, 8, 2),
                infants_cutoff = new Date(2014, 8, 2),
                program = '',
                calculated = { years: calculateYears(date) };

            if ( date >= infants_cutoff ) {
                program = '#infants';
            } else if ( date < infants_cutoff && date >= preschool_cutoff ) {
                program = "#preschool";
            } else {
                console.log('other');
            }

            calculated.program = program;
            return calculated;
        }

        var calculateYears = function(date) {
            var now = new Date(2017, 9, 1),
                date_diff = now - date;

            return Math.floor(date_diff/(365*24*60*60*1000));
        }

        var displayProgramBlock = function($block) {
            $calculator_block.fadeOut(500);
            $block.delay(500).fadeIn(500);
        }


        /* -- Initializer -- */
        return {
            init: function() {
                list_index = 0;
                $search_input.attr('placeholder', ($map.data('address') || 'Enter an address'));

                /* -- Listeners -- */
                /* Filter Pane Toggle */ 
                $filters_toggle.on('click', function() {
                    var $this = $(this),
                        $filterLink = $this.find('a');
                    $filterLink.toggleClass('svg-gray');
                    $filterLink.toggleClass('svg-orange');
                    $filters.toggle();
                });

                /* Add a filter */
                $filters_inputs.on('click', function() {
                    $filters.trigger('filters-update');
                });

                /* Remove all filters */
                $filters_clear.on('click', function() {
                    clearFilters();
                    $filters.trigger('filters-update');
                });

                /* Filters Update event */
                $filters.on('filters-update', function() {
                    $results_wrapper.animate({
                        scrollTop: 0,
                    }, 100);
                    
                    list_index = 0;
                    $results_list.empty();
                    listLocations(locations);
                    updateMap(locations);
                });

                /* Filter Pane Toggle */
                $locations_more.on('click', function() {
                    listLocations(locations);
                });


                $compare.on('favorites-update', function() {
                    syncFavorites();
                });


                /* -- Calculator Focus Listener -- */
                $month.keyup(function() {
                    if (this.value.length == 2) {
                        $day.focus();
                    }
                });

                $day.keyup(function() {
                    if (this.value.length == 2) {
                        $year.focus();
                    }
                });

                /* -- Submit Listener -- */
                $calculator.submit(function(e) {
                    var month = parseInt($month.val()) - 1,
                        day = parseInt($day.val()),
                        year = parseInt($year.val()) + 2000;

                    e.preventDefault();
                    if ( validateDate(month, day, year) ) {
                        var calculated = calculateProgram(month, day, year);
                        initializeList(calculated);
                    }
                });

                /* -- Fetch Neighborhoods -- */
                $.getJSON(common.getUrl('neighborhoods-geojson'), function(data) {
                    neighborhoods_data = data;
                });


                /* -- Fetch locationcs, Draw Map -- */
                $.getJSON(common.getUrl('map-json'), function(response) {
                    var data_latitude = $map.data('latitude') || default_latitude,
                        data_longitude = $map.data('longitude') || default_longitude;

                    locations = response.locations;
                    display_labels = response.display;


                    locations = $.each(locations, function(i, location) {
                        location["distance"] = calculateHaversine(location.latitude, location.longitude, data_latitude, data_longitude);
                        location["rounded_distance"] = Math.round(location["distance"] * 10)/10;
                        location["labels"] = display_labels;
                        location["copa_url"] = common.getUrl('copa-apply', {ids: [location["copa_key"]]});
                    });

                    var width = $(document).width();
                    if ( width >= common.breakpoints.medium ) {
                        drawMap(locations);
                    }

                    if ( $map.data('latitude') ) {
                        listLocations(locations);
                    }
                });
            }
        }
    }
);