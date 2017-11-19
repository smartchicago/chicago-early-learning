define(['jquery', 'Leaflet', 'common'],
  function($, L, common) {
    'use strict';

    $(document).ready(function() {
      var $map = $('#colman-map'),
          access_token = 'pk.eyJ1IjoidGhlYW5kcmV3YnJpZ2dzIiwiYSI6ImNpaHh2Z2hpcDAzZnd0bG0xeDNqYXdiOGkifQ.jV7_LuEh4KX2r5RudiQdIg',
          mapboxURL;

      if (common.isRetinaDisplay()) {
          mapboxURL = 'https://api.mapbox.com/v4/mapbox.streets/{z}/{x}/{y}@2x.png?access_token='
      } else {
          mapboxURL = 'https://api.mapbox.com/v4/mapbox.streets/{z}/{x}/{y}.png?access_token='
      }

      var mapboxTiles = L.tileLayer(mapboxURL + access_token,
            {attribution: 'Imagery from <a href="http://mapbox.com/about/maps/">MapBox</a>'});

      var latLng = new L.LatLng($map.data("address-latitude"), $map.data("address-longitude"));
      var map = new L.Map('colman-map', { center: latLng, zoom: 14 });

      var defaults = {
        iconUrl: '/static/img/map-icons/2x/CPS/neutral.png',
        shadowUrl: '/static/img/leaflet-icons/marker-shadow.png',
        iconSize: [50, 50],
        shadowSize: [41, 41],
        iconAnchor: [25, 50],
        shadowAnchor: [10, 41]
      };

      var icon = new L.icon(defaults);

      map.addLayer(mapboxTiles);
      L.marker(latLng, {icon: icon}).addTo(map);
    });
});
