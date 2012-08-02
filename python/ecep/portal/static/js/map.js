ecep = ((typeof ecep == 'undefined') ? {} : ecep);

ecep.map = null;
ecep.loadedListener = null;
ecep.infoWindow = null;
ecep.geocoder = null;
ecep.geolocated_marker = null;
ecep.geocoded_marker = null;
ecep.directions_service = null;
ecep.directions_display = null;

ecep.getUrl = function(name) {
    switch (name) {
        case 'loadLocations': 
            return '/location/';
        case 'blue-dot':
            return 'http://maps.gstatic.com/mapfiles/ms2/micons/blue-dot.png';
        case 'green-dot':
            return 'http://maps.gstatic.com/mapfiles/ms2/micons/green-dot.png';
        case 'shadow-pin':
            return 'https://www.google.com/chart?chst=d_map_pin_shadow'; 
        default:
            throw 'Unknown URL endpoint "' + name + '"';
    }
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
    ecep.directions_service = new google.maps.DirectionsService();
    ecep.directions_display = new google.maps.DirectionsRenderer({draggable:true});
    ecep.directions_display.setMap(ecep.map);

    // load directions text when directions are changed
    ecep.directionsListener = google.maps.event.addListener(ecep.directions_display, 'directions_changed', ecep.typeDirections);

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
                    ecep.infoWindow.open(ecep.map,mkr);
                    google.maps.event.addListener(ecep.infoWindow, 'domready', function() {
                        if (ecep.geocoded_marker == null && ecep.geolocated_marker == null) {
                            // neither location available, disable navigation
                            $('.loc_directions').hide();
                            return;
                        }
                        else if (ecep.geocoded_marker == null || ecep.geolocated_marker == null) {
                            // only one location available, navigate to that
                            $('.nav_single').show();
                            $('.nav_multi').hide();
                        }
                        else {
                            // both locations available, ask user
                            $('.nav_multi').show();
                            $('.nav_single').hide();
                        }

                        $('.nav_to_location').click(ecep.directions);
                    });
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
            $('#search_address').val(addr);
        }
        else {
            alert('Sorry, Google cannot find that address.');
        }
    });
};

ecep.dropMarker = function(loc, title, color, reposition) {
    var url = ecep.getUrl('blue-dot');
    if (color == 'green') {
        url = ecep.getUrl('green-dot');
    }
    var marker = new google.maps.Marker({
        map: ecep.map,
        position: loc,
        title: title,
        icon: new google.maps.MarkerImage(url),
        shadow: new google.maps.MarkerImage(
            ecep.getUrl('shadow-pin'),
            new google.maps.Size(40, 37), 
            new google.maps.Point(0,0), 
            new google.maps.Point(12,37))
    });
    if (reposition) {
        ecep.map.setCenter(loc);
    }
    return marker;
};

ecep.directions = function(event) {
    var orig = $(this).data('navto');
    if (orig == null) {
        if (ecep.geocoded_marker != null) {
            marker = ecep.geocoded_marker;
        }
        else if (ecep.geolocated_marker != null) {
            marker = ecep.geolocated_marker;
        }
    }
    else {
        if (orig == 'geolocated') {
            marker = ecep.geolocated_marker;
        }
        else {
            marker = ecep.geocoded_marker;
        }
    }
    var dest = $(this).data('coords');
    var req = {
        origin: marker.getPosition().toString(),
        destination: dest,
        travelMode: google.maps.TravelMode.DRIVING
    };
    ecep.directions_service.route(req, function(result, rtestatus) {
        if (rtestatus == google.maps.DirectionsStatus.OK) {
            // update the map with line
            ecep.directions_display.setDirections(result);

            // update text instructions
            // move over by the width of instructions + 5px gutter
            $('#map_container').css('right', '305px');
        }
    });
};

ecep.typeDirections = function() {
    var result = ecep.directions_display.directions;

    var direlem = $('.directions');
    direlem.empty().show();
    direlem.append($('<h3>Driving Directions</h3>'));

    var warn = $('<div />');
    warn.addClass('d_warn');
    warn.html(result.routes[0].warnings);
    direlem.append(warn);

    var list = $('<ol />');
    var leg, step, elem, instr, dist;
    for (var l = 0; l < result.routes[0].legs.length; l++) {
        leg = result.routes[0].legs[l];
        for (var s = 0; s < leg.steps.length; s++) {
            step = leg.steps[s];
            elem = $('<li/>');
            elem.addClass('d_step');
            instr = $('<span/>');
            instr.addClass('d_instr');
            instr.html(step.instructions); 
            elem.append(instr);
            dist = $('<span/>');
            dist.addClass('d_dist');
            dist.text(step.distance.text);
            elem.append(dist);
            list.append(elem);
        }
    }
    direlem.append(list);
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

