/********************************************************
 * Copyright (c) 2013 Azavea, Inc.
 * See LICENSE in the project root for copying permission
 * Requires: google-maps-api-v3; jquery; leaflet;
 ********************************************************/

var ecepLocation = ((typeof ecepLocation === 'undefined') ? {} : ecepLocation);

var schoolIcon = L.icon({
    iconUrl: '/static/img/leaflet-icons/marker-school.png',
    shadowUrl: '/static/img/leaflet-icons/marker-shadow.png',

    iconSize:     [35, 45], // size of the icon
    shadowSize:   [41, 41], // size of the shadow
    iconAnchor:   [10, 60], // point of the icon which will correspond to marker's location
    shadowAnchor: [4, 62],  // the same for the shadow
    popupAnchor:  [-3, -76] // point from which the popup should open relative to the iconAnchor
});

/* On page load, query api to get locations position, add marker to map
 * for location. Use google maps layer for leaflet.
 */
window.onload = function() {
    $.getJSON(window.location.pathname+'position', function(data) {
        ecepLocation.map = new L.Map('location-map', {center: new L.LatLng(data[0].lat, data[0].lng), zoom: 13});
        ecepLocation.gmap = new L.Google('ROADMAP');
        ecepLocation.map.addLayer(ecepLocation.gmap);
        L.marker([data[0].lat, data[0].lng], {icon: schoolIcon}).addTo(ecepLocation.map);
        ecepLocation.map.panTo(new L.LatLng(data[0].lat, data[0].lng));
    });
};
