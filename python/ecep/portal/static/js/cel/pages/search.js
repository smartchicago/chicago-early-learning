
define(['jquery', 'Leaflet', 'Handlebars', 'text!templates/redesign/search-result.html', 'common', 'favorites'],
    function($, L, Handlebars, searchResultHTML, common, favorites) {
        var map,
            $map = $('#map'),
            $filters = $('#filters'),
            $filters_inputs = $filters.find('input:checkbox'),
            $filters_toggle = $('#filters-toggle'),
            $filters_clear = $('#filters-clear'),
            $results_wrapper = $('#results'),
            $results_list = $('.results-list'),
            $locations_more = $('#locations-more'),
            $search_input = $('#search-input'),
            accessToken = 'pk.eyJ1IjoidGhlYW5kcmV3YnJpZ2dzIiwiYSI6ImNpaHh2Z2hpcDAzZnd0bG0xeDNqYXdiOGkifQ.jV7_LuEh4KX2r5RudiQdIg',
            mapboxURL,
            mapboxTiles,
            locationLayer = new L.layerGroup(),
            default_longitude = -87.6207733154,
            default_latitude = 41.8725248264,
            default_zoom = 13,
            list_index = 0,
            locations = [],
            display_labels = [],
            locationMarkers = [];

        var filterset = $filters.find('input');

        if (common.isRetinaDisplay()) {
            mapboxURL = 'https://api.mapbox.com/v4/mapbox.streets/{z}/{x}/{y}@2x.png?access_token='
        } else {
            mapboxURL = 'https://api.mapbox.com/v4/mapbox.streets/{z}/{x}/{y}.png?access_token='
        }

        /* -- Functions -- */
        var getMapState = function() {
            var latitude = $map.data('latitude') || default_latitude,
                longitude = $map.data('longitude') || default_longitude,
                isGeolocated = false;
                zoom = default_zoom

            if ($map.data('latitude') && $map.data('longitude')) {
                isGeolocated = true;
                zoom = 15;
            }

            return { point: [latitude, longitude],
                     isGeolocated: isGeolocated,
                     zoom: zoom };
        }

        var getMarkerIcon = function(location) {
            var defaults = {
                key: null,
                highlighted: false,
                iconUrl: '/static/img/map-icons/2x/CBO/neutral.png',
                shadowUrl: '/static/img/leaflet-icons/marker-shadow.png',
                iconSize: [50, 50],
                shadowSize: [41, 41],
                iconAnchor: [25, 50],
                shadowAnchor: [10, 41],
                popupAnchor: [0, -60]
            };

            var icon_url = '/static/img/map-icons/2x/';
            icon_url += location.cps ? 'CPS/' : 'CBO/';
            icon_url += location.availability;
            icon_url += (location.accred == "") ? '-accredited' : '';
            icon_url += (favorites.isStarred(location.id)) ? '-selected' : '';
            icon_url += '.png';

            defaults.iconUrl = icon_url;
            return defaults;
        }

        var drawMap = function(locations) {
            $.each(locations, function(i, location) {
                var location_icon = new L.icon(getMarkerIcon(location));
                var location = L.marker([location.latitude, location.longitude], {icon: location_icon});
                locationMarkers.push(location);
            });
            state = getMapState();
            locationLayer = new L.layerGroup(locationMarkers);
            map = new L.map('map').setView(state.point, state.zoom);
            mapboxTiles = L.tileLayer(mapboxURL + accessToken,
                    { attribution: 'Imagery from <a href="http://mapbox.com/about/maps/">MapBox</a>'});
            map.addLayer(mapboxTiles);
            map.addLayer(locationLayer);
        }

        var updateMap = function(locations) {

        }

        var listLocations = function(locations) {
            var filtered_locations = filterLocations(locations),
                sorted_locations = sortLocations(filtered_locations),
                html = searchResultHTML,
                first_ten = sorted_locations.slice(list_index, list_index+10),
                template = Handlebars.compile(html);

            list_index+=10;
            $results_list.append(template(first_ten));
        }

        var sortLocations = function(locations) {
            return locations.sort(function(a, b) { return a.distance - b.distance });
        }

        var currentFilters = function() {
            var inputs = $filters_inputs.filter(":checked");
            var ids = $.map(inputs, function(element) {
                return element.id;
            });
            return ids;
        }

        var clearFilters = function() {
            $filters_inputs.prop('checked', false);
        }

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

        var calculateHaversine = function(latitude_to, longitude_to, latitude_from, longitude_from) {
            var p = 0.017453292519943295,
                c = Math.cos,
                a = 0.5 - c((latitude_to - latitude_from) * p)/2 +
                    c(latitude_from * p) * c(latitude_to * p) *
                    (1 - c((longitude_to - longitude_from) * p))/2;

                return 12742 * Math.asin(Math.sqrt(a)) * 0.621371192;
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
                    $filters.trigger('filters-update')
                });

                /* Remove all filters */
                $filters_clear.on('click', function() {
                    clearFilters();
                    $filters.trigger('filters-update')
                });

                /* Filters Update event */
                $filters.on('filters-update', function() {
                    $results_wrapper.animate({
                        scrollTop: 0,
                    }, 100);
                    
                    list_index = 0;
                    $results_list.empty();
                    listLocations(locations);
                });

                /* Filter Pane Toggle */
                $locations_more.on('click', function() {
                    listLocations(locations);
                });

                /* -- Fetch locationcs, Draw Map -- */
                $.getJSON(common.getUrl('map-json'), function(response) {
                    locations = response.locations;
                    display_labels = response.display;

                    locations = $.each(locations, function(i, location) {
                        var data_latitude = $map.data('latitude'),
                            data_longitude = $map.data('longitude');

                        location["distance"] = calculateHaversine(location.latitude, location.longitude, data_latitude, data_longitude);
                        location["rounded_distance"] = Math.round(location["distance"] * 10)/10;
                        location["labels"] = display_labels;
                        location["copa_url"] = common.getUrl('copa-apply', {ids: [location["copa_key"]]});
                    });

                    var width = $(document).width();
                    if ( width >= common.breakpoints.medium ) {
                        drawMap(locations);
                    }
                    listLocations(locations);
                });
            }
        }
    }
);