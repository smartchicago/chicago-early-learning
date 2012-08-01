ecep = ((typeof ecep == 'undefined') ? {} : ecep);

ecep.map = null;
ecep.loadedListener = null;
ecep.infoWindow = null;
ecep.geocoder = null;
ecep.geolocated_marker = null;
ecep.geocoded_marker = null;

ecep.getUrl = function(name) {
    if (name == 'loadLocations') {
        return '/location/';
    }

    throw 'Unknown URL endpoint "' + name + '"';
};

ecep.init = function() {
    var inputNode = $('input.address-input');
    var startButtonNode = $('button#start-button');

    // Tie "enter" in text box to start button
    inputNode.keyup(function(event) {
        if(event.keyCode == 13) {
            startButtonNode.click();
        }
    });

    var opts = {
        center: new google.maps.LatLng(41.85003, -87.65005),
        zoom: 10,
        mapTypeId: google.maps.MapTypeId.ROADMAP
    };
    ecep.map = new google.maps.Map($('#map')[0], opts);

    // create one info window, geocoder to re-use
    ecep.infoWindow = new google.maps.InfoWindow();
    ecep.geocoder = new google.maps.Geocoder();

    // load locations when the map is all done
    ecep.loadedListener = google.maps.event.addListener(ecep.map, 'tilesloaded', ecep.loadLocations);

    // attach the geolocation handler to the geolocation button
    $('#geolocate').click(ecep.geolocate);

    // attache the search handler to the search button
    $('#search').click(ecep.search);

    //Show modal splash (see index.html)
    $('#address-modal').modal('show');
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

    load.fail(function(jqxhr, textStatus, message) {
        // this fires when a request is aborted: i.e. if you click
        // a link before the locations are done loading.
        if (jqxhr.getAllResponseHeaders()) {
            var msg = 'Could not load locations: ' + message;
            console.error(msg);
        }
    });
};

ecep.geolocate = function() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            function(pos) {
                var ll = new google.maps.LatLng(pos.coords.latitude, pos.coords.longitude);
                ecep.geolocated_marker = ecep.dropMarker(ll, "Your Location", 'blue', true);
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

ecep.search = function() {
    if (ecep.geocoded_marker != null) {
        ecep.geocoded_marker.setMap(null);
        ecep.geocoded_marker = null;
    }
    var addr = $('#search_address').val();
    ecep.geocode(addr);
};

ecep.geocode = function(addr) {
    ecep.geocoder.geocode({'address': addr}, function(results, geocodeStatus) {
        if (geocodeStatus == google.maps.GeocoderStatus.OK) {
            var ll = results[0].geometry.location;
            ecep.geocoded_marker = ecep.dropMarker(ll, results[0].formatted_address, 'green', true);
        }
        else {
            alert('Sorry, Google cannot find that address.');
        }
    });
};

ecep.dropMarker = function(loc, title, color, reposition) {
    var marker = new google.maps.Marker({
        map: ecep.map,
        position: loc,
        title: title,
        icon: {
            path: google.maps.SymbolPath.CIRCLE,
            fillColor: color,
            fillOpacity: 1,
            scale: 7,
            strokeColor: 'black',
            strokeWeight: 0.5
        },
        shadow: {
            anchor: new google.maps.Point(-0.5, -0.25),
            path: google.maps.SymbolPath.CIRCLE,
            fillColor: 'black',
            fillOpacity: 0.5,
            scale: 7,
            strokeWeight: 0
        }
    });
    if (reposition) {
        ecep.map.setCenter(loc);
    }
    return marker;
};

ecep.addressClicked = function() {
    var inputNode = $('input.address-input:visible');
    var inputText = inputNode.val();

    ecep.geocode(inputText);

    inputNode.val('');
    $('#address-modal').modal('hide');
};

//Modal splash setup
$(document).ready(ecep.init);

