
define(['jquery', 'Leaflet', 'Handlebars', 'common', ],
    function($, L, Handlebars, common) {
        var map,
            $map = $('#map'),
            $filters = $('#filters'),
            $filtersToggle = $('#filters-toggle'),
            accessToken = 'pk.eyJ1IjoidGhlYW5kcmV3YnJpZ2dzIiwiYSI6ImNpaHh2Z2hpcDAzZnd0bG0xeDNqYXdiOGkifQ.jV7_LuEh4KX2r5RudiQdIg',
            mapboxURL,
            mapboxTiles,
            locationLayer,
            default_longitude = -87.6207733154,
            default_latitude = 41.8725248264;
            default_zoom = 13;
            locationMarkers = [];

        var filterset = $filters.find('input');

        var defaultIcon = new L.icon({
            key: null,
            highlighted: false,
            iconUrl: '/static/img/map-icons/2x/CBO/neutral.png',
            shadowUrl: '/static/img/leaflet-icons/marker-shadow.png',
            iconSize: [50, 50],
            shadowSize: [41, 41],
            iconAnchor: [25, 50],
            shadowAnchor: [10, 41],
            popupAnchor: [0, -60]
        });

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
        };

        var getMarkerIcon = function(location) {

        }

        var drawMap = function(locations) {
            $.each(locations, function(i, location) {                    
                var location = L.marker([location.latitude, location.longitude], {icon: defaultIcon});
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
                });


                /* -- Fetch locationcs, Draw Map -- */
                $.getJSON(common.getUrl('map-json'), function(response) {
                    drawMap(response.locations);
                });
            }
        }
    }
);