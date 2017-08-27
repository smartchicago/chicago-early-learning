
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
            $compare = $('#compare'),
            $compare_buttons = $('.compare-btn'),
            $compare_count = $('#compare-count'),
            $compare_site = $('#compare-site'),
            $compare_sites = $('#compare-sites'),
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

        var getMarkerUrl = function(current_location) {
            var icon_url = '/static/img/map-icons/2x/';
            icon_url += current_location.cps ? 'CPS/' : 'CBO/';
            icon_url += (current_location.availability) ? current_location.availability : 'neutral';
            icon_url += (current_location.accred == "") ? '-accredited' : '';
            icon_url += (favorites.isStarred(current_location.id)) ? '-selected' : '';
            icon_url += '.png';

            return icon_url;
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

        var toggleFavoriteMarker = function(current_location) {
            var favorite_ids = favorites.getFavoriteIds(),
                icon_url = getMarkerUrl(current_location),
                location_class = '.location-id-' + current_location.id,
                $marker = $map.find('.leaflet-marker-icon' + location_class);

            $marker.attr('src', icon_url);
        }

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