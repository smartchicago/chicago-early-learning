var map = null;
var loadedListener = null;
var infoWindow = null

function init(mapid) {
    var opts = {
        center: new google.maps.LatLng(41.85003, -87.65005),
        zoom: 10,
        mapTypeId: google.maps.MapTypeId.ROADMAP
    };
    map = new google.maps.Map($('#'+mapid)[0], opts);

    infoWindow = new google.maps.InfoWindow();

    // load locations when the map is all done
    loadedListener = google.maps.event.addListener(map, 'tilesloaded', loadLocations);
};

function loadLocations() {
    var load = $.ajax({
        url: '/location/',
        dataType: 'json'
    });

    load.done(function(data, textStatus, jqxhr) {
        var markers = [];
        for (var i = 0; i < data.length; i++) {
            if (!data[i].lng || !data[i].lat) {
                continue;
            }
            var ll = new google.maps.LatLng(data[i].lat, data[i].lng);

            var marker = new google.maps.Marker({
                position: ll,
                title: data[i].site_name});

            var showinfo = function(content, latlng, mkr) {
                return function() {
                    infoWindow.setContent(content);
                    infoWindow.setPosition(latlng);
                    infoWindow.open(map,mkr);
                };
            };

            google.maps.event.addListener(marker, 'click', showinfo(data[i].content, ll, marker));

            markers.push(marker);
        }
        new MarkerClusterer(map, markers, {maxZoom:18});

        google.maps.event.removeListener(loadedListener);
    });

    load.fail(function(textStatus, jqxhr, message) {
        alert('Could not load locations: ' + message);
    });
};

$(function(){
    init('map');
});
