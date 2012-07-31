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
    ecep.map = new google.maps.Map($('#map')[0], opts);

    // create one info window to re-use
    ecep.infoWindow = new google.maps.InfoWindow();

    // load locations when the map is all done
    ecep.loadedListener = google.maps.event.addListener(ecep.map, 'tilesloaded', ecep.loadLocations);

    $('#geolocate').click(ecep.geolocate);
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
                    ecep.infoWindow.setContent(content);
                    ecep.infoWindow.setPosition(latlng);
                    ecep.infoWindow.open(map,mkr);
                };
            };

            google.maps.event.addListener(marker, 'click', showinfo(data[i].content, ll, marker));

            markers.push(marker);
        }
        new MarkerClusterer(ecep.map, markers, {maxZoom:18});

        google.maps.event.removeListener(ecep.loadedListener);
    });

    load.fail(function(textStatus, jqxhr, message) {
        alert('Could not load locations: ' + message);
    });
};

ecep.geolocate = function() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            function(pos) {
                var ll = new google.maps.LatLng(pos.coords.latitude, pos.coords.longitude);
                var mkr = new google.maps.Marker({
                    map: ecep.map,
                    position: ll,
                    title: 'Your Location',
                    icon: { 
                        path: google.maps.SymbolPath.CIRCLE,
                        fillColor: 'blue',
                        fillOpacity: 1,
                        scale: 5,
                        strokeColor: 'black',
                        strokeWeight: 1
                    },
                    shadow: {
                        anchor: new google.maps.Point(-0.5, -0.25),
                        path: google.maps.SymbolPath.CIRCLE,
                        fillColor: 'black',
                        fillOpacity: 0.5,
                        scale: 5,
                        strokeWeight: 0
                    }
                });

                ecep.map.setCenter(ll);
            },
            function() {
                alert('Could not determine your location, sorry!');
            }
        );
    }
    else {
        alert('Your browser does not support automatic geolocation.\nPlease type your address into the search box, and click the "Search" button.');
    }
};

google.maps.event.addDomListener(window, 'load', ecep.init);
