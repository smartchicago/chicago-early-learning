
define(['jquery', 'Leaflet', 'Handlebars', 'text!templates/redesign/search-result.html', 'common', 'favorites'],
    function($, L, Handlebars, searchResultHTML, common, favorites) {
        var map,
            $map = $('#map'),
            $filters = $('#filters'),
            $filtersToggle = $('#filters-toggle'),
            $results_list = $('.results-list'),
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

        var listLocations = function(locations) {
            var sorted_locations = sortLocations(locations),
                html = searchResultHTML,
                first_ten = sorted_locations.slice(0,10),
                template = Handlebars.compile(html),
                rendered_locations = [];

            console.log(first_ten);
            console.log(display_labels);
            $results_list.empty().append(template(first_ten));
        }

        var sortLocations = function(locations) {
            var data_latitude = $map.data('latitude'),
                data_longitude = $map.data('longitude');

            locations = $.each(locations, function(i, location) {
                location["distance"] = calculateHaversine(location.latitude, location.longitude, data_latitude, data_longitude);
                location["rounded_distance"] = Math.round(location["distance"] * 10)/10;
                location["labels"] = display_labels;
            });
            return locations.sort(function(a, b) { return a.distance - b.distance });
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

                /* -- Listeners -- */
                $filtersToggle.on('click', function() {
                    var $this = $(this),
                        $filterLink = $this.find('a');
                    $filterLink.toggleClass('svg-gray');
                    $filterLink.toggleClass('svg-orange');
                    $filters.toggle();
                    console.log(locations);
                });


                /* -- Fetch locationcs, Draw Map -- */
                $.getJSON(common.getUrl('map-json'), function(response) {
                    locations = response.locations;
                    display_labels = response.display;

                    var width = $(document).width();
                    if ( width >= common.breakpoints.medium ) {
                        drawMap(response.locations);
                    }
                    listLocations(response.locations);
                });
            }
        }
    }
);