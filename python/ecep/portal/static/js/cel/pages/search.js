
define(['jquery', 'Leaflet', 'common'],
    function($, L, common) {
        var map,
            $map = $('#map');

    var getMapState = function() {
        var lon = -87.6207733154,
            lat = 41.8725248264;

        return [lat, lon];
    };

    return {
        init: function() {
            var state = getMapState(),
                accessToken = 'pk.eyJ1IjoidGhlYW5kcmV3YnJpZ2dzIiwiYSI6ImNpaHh2Z2hpcDAzZnd0bG0xeDNqYXdiOGkifQ.jV7_LuEh4KX2r5RudiQdIg',
                mapboxURL,
                mapboxTiles;

            if (common.isRetinaDisplay()) {
                mapboxURL = 'https://api.mapbox.com/v4/mapbox.streets/{z}/{x}/{y}@2x.png?access_token='
            } else {
                mapboxURL = 'https://api.mapbox.com/v4/mapbox.streets/{z}/{x}/{y}.png?access_token='
            }

            mapboxTiles = L.tileLayer(mapboxURL + accessToken,
                { attribution: 'Imagery from <a href="http://mapbox.com/about/maps/">MapBox</a>'});

            map = new L.map('map').setView(state, 13);
            debugger;
            map.addLayer(mapboxTiles);

        }
    }
});