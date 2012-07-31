ecep = ((typeof ecep == 'undefined') ? {} : ecep);

ecep.map = null;
ecep.loadedListener = null;
ecep.infoWindow = null

ecep.getUrl = function(name) {
    if (name == 'loadLocations') {
        return '/location/';
    }

    throw 'Unknown URL endpoint "' + name + '"';
};

ecep.init = function() {
    var opts = {
        center: new google.maps.LatLng(41.85003, -87.65005),
        zoom: 10,
        mapTypeId: google.maps.MapTypeId.ROADMAP
    };
    map = new google.maps.Map($('#map')[0], opts);

    infoWindow = new google.maps.InfoWindow();

    // load locations when the map is all done
    loadedListener = google.maps.event.addListener(map, 'tilesloaded', ecep.loadLocations);
};

ecep.loadLocations = function() {
    var load = $.ajax({
        url: ecep.getUrl('loadLocations'),
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

google.maps.event.addDomListener(window, 'load', ecep.init);
