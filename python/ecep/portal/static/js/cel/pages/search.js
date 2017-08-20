
define(['jquery', 'Leaflet', 'Handlebars', 'common', ],
    function($, L, Handlebars, common) {
        var map,
            $map = $('#map'),
            $filters = $('#filters'),
            $filtersToggle = $('#filters-toggle');

        var filterset = $filters.find('input');

    var getMapState = function() {
        var lon = -87.6207733154,
            lat = 41.8725248264;

        return [lat, lon];
    };

    var locations = [
        {
            name: "Rueben Salazar Elementary Bilingual Center",
            id: 1,
            address: "160 W Wendell St",
            full_year: true,
            school_year: true,
            full_day: true,
            party_day: true,
            cps_based: true,
            latitude: 41.901484799999956,
            longitude: -87.63403069999995,
        },
        {
            name: "Fussy Baby Network",
            id: 2,
            address: "451 N LaSalle St",
            full_year: true,
            school_year: true,
            full_day: true,
            party_day: true,
            cps_based: true,
            latitude: 41.890763999999976,
            longitude: -87.632385, 
        },
        {
            name: "Edward Jenner Elementary Academy of the Arts",
            id: 3,
            address: "1119 N Cleveland Ave",
            full_year: true,
            school_year: true,
            full_day: true,
            party_day: true,
            cps_based: true,
            latitude: 41.90256,
            longitude: -87.64102499999997, 
        },
        {
            name: "George Manierre Elementary School",
            id: 4,
            address: "1420 N Hudson Ave",
            full_year: true,
            school_year: true,
            full_day: true,
            party_day: true,
            cps_based: true,
            latitude: 41.907228999999994,
            longitude: -87.63983699999999, 
        }
    ]




    return {
        init: function() {
            var state = getMapState(),
                accessToken = 'pk.eyJ1IjoidGhlYW5kcmV3YnJpZ2dzIiwiYSI6ImNpaHh2Z2hpcDAzZnd0bG0xeDNqYXdiOGkifQ.jV7_LuEh4KX2r5RudiQdIg',
                mapboxURL,
                mapboxTiles;

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

            mapboxTiles = L.tileLayer(mapboxURL + accessToken,
                { attribution: 'Imagery from <a href="http://mapbox.com/about/maps/">MapBox</a>'});

            locationMarkers = [];
            $.each(locations, function(i, location) {
                var location = L.marker([location.latitude, location.longitude], {icon: defaultIcon});
                locationMarkers.push(location);
            });

            var locationLayer = L.layerGroup(locationMarkers);

            map = new L.map('map').setView(state, 13);
            map.addLayer(mapboxTiles);
            map.addLayer(locationLayer);


            /* -- Listeners -- */
            $filtersToggle.on('click', function() {
                var $this = $(this),
                    $filterLink = $this.find('a');
                $filterLink.toggleClass('svg-gray');
                $filterLink.toggleClass('svg-orange');
                $filters.toggle();
            });
        }
    }
});