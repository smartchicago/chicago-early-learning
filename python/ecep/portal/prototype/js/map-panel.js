// Leaflet stuff
// leaflet.js
var map2 = L.map('map-panel').setView([41.88, -87.62], 12);

L.tileLayer('http://a.tiles.mapbox.com/v3/azavea.map-3kktou80/{z}/{x}/{y}.png', {
    maxZoom: 18
}).addTo(map2);

var homeIcon = L.icon({
    iconUrl: 'js/images/marker-home.png',
    shadowUrl: 'js/images/marker-shadow.png',

    iconSize:     [35, 45], // size of the icon
    shadowSize:   [41, 41], // size of the shadow
    iconAnchor:   [10, 60], // point of the icon which will correspond to marker's location
    shadowAnchor: [4, 62],  // the same for the shadow
    popupAnchor:  [-3, -76] // point from which the popup should open relative to the iconAnchor
});

L.marker([41.883852, -87.632061], {icon: homeIcon}).addTo(map);

var schoolIcon = L.icon({
    iconUrl: 'js/images/marker-school.png',
    shadowUrl: 'js/images/marker-shadow.png',

    iconSize:     [35, 45], // size of the icon
    shadowSize:   [41, 41], // size of the shadow
    iconAnchor:   [10, 60], // point of the icon which will correspond to marker's location
    shadowAnchor: [4, 62],  // the same for the shadow
    popupAnchor:  [-3, -76] // point from which the popup should open relative to the iconAnchor
});

L.marker([41.843811, -87.686763], {icon: schoolIcon}).addTo(map).bindPopup("<strong>YMCA Rauner Family</strong><br>2700 S. Western Ave., Chicago, IL 60608");

var popup = L.popup();


// More/Less button toggle
$('.more-less-btn').click(function() {
	$(this).toggleClass("active");
	$(this).html($(this).html() == "More" ? "Less" : "More");
});