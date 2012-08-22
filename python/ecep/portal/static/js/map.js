ecep = ((typeof ecep == 'undefined') ? {} : ecep);

ecep.map = null;
ecep.clusterr = null;
ecep.loadedListener = null;
ecep.infoWindow = null;
ecep.geocoder = null;
ecep.geolocated_marker = null;
ecep.geocoded_marker = null;
ecep.directions_service = null;
ecep.directions_display = null;
ecep.comparing = [];
ecep.initialBounds = null;

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
        case 'location_info':
            return '/location/' + arguments[1] + '/';
        case 'compare':
            return '/compare/' + arguments[1] + '/' + arguments[2] + '/';
        default:
            throw 'Unknown URL endpoint "' + name + '"';
    }
};

ecep.init = function() {
    var inputNode = $('input.address-input');

    // Tie "enter" in text box to start button
    inputNode.keyup(function(event) {
        if(event.keyCode == 13) {
            $($(this).data('button')).click();
            return false;
        }
    });

    var opts = {
        center: new google.maps.LatLng(41.8377216268434, -87.68702100000002),
        zoom: 10,
        mapTypeId: google.maps.MapTypeId.ROADMAP
    };
    ecep.map = new google.maps.Map($('#map')[0], opts);

    // create one info window, geocoder to re-use
    ecep.infoWindow = new google.maps.InfoWindow();
    ecep.geocoder = new google.maps.Geocoder();
    ecep.directions_service = new google.maps.DirectionsService();
    ecep.directions_display = new google.maps.DirectionsRenderer({draggable:true});

    // load directions text when directions are changed
    ecep.directionsListener = google.maps.event.addListener(ecep.directions_display, 'directions_changed', ecep.typeDirections);

    // load locations when the map is all done
    ecep.loadedListener = google.maps.event.addListener(ecep.map, 'tilesloaded', ecep.loadLocations);

    // attach the geolocation handler to the geolocation button
    if (navigator.geolocation) {
        $('.geolocate').click(ecep.geolocate);
    }
    else {
        _gaq.push(['_trackEvent', 'Geolocate', 'Disabled', 'Browser does not support geolocation']);
        $('.geolocate').hide();
    }

    // attach the search handler to the search button(s)
    $('.search-button').click(ecep.search);

    //Show modal splash (see index.html)
    var cookies = document.cookie.split('; ');
    var cpos = $.inArray('show_splash=true', cookies)
    if (cpos >= 0) {
        $('#address-modal').modal({ keyboard:false, show:true });
        var ed = new Date(new Date().valueOf() + (1000 * 60 * 60));
        document.cookie = 'show_splash=false; expires='+ed.toUTCString();
    }

    $('#filter-toggle').popover({
        animation: false,
        placement: 'bottom',
        trigger: 'manual',
        title: 'Filter Locations',
        content: $('#filter-selection').text()
    });

    $('#filter-toggle').click(function() {
        $('#filter-toggle').popover('toggle');
        if ($('#update-filter:visible').length > 0) {

            // reset the element's left positioning
            $('.popover')[0].style.left = null;
            $('.popover')[0].style.top = null;

            $('#update-filter').click(ecep.loadLocations);
            $('#all').click(function(){
                var filters = $('.loc_filter_check');
                var all = this;
                if (!all.checked) return false;
                filters.each(function(idx, elem){
                    this.checked = all.checked;
                });
            });
            $('.loc_filter_check').click(function(){
                if ($('.loc_filter_check[name!="all"]:checked').length == 
                    $('.loc_filter_check[name!="all"]').length) {
                    $('#all').attr('checked', 'checked');
                }
                else {
                    $('#all').attr('checked', null);
                }

                if ($('.loc_filter_check:checked').length == 0) {
                    return false;
                }
            });
        }
    });

    $('#print-toggle').click(function(){
        window.print();
    });
};

ecep.comparingChanged = function(event) {
    var cmp = $('#compare-content:visible');
    if (cmp.length > 0) {
        if (ecep.comparing.length == 0) {
            _gaq.push(['_trackEvent', 'Comparison', 'Change', 'No locations']);

            cmp.text('Please select a location to get started comparing.');
        }
        else {
            _gaq.push(['_trackEvent', 'Comparison', 'Change', 'Comparing: ' + ecep.comparing.join(', ')]);

            cmp.empty();
            var list = $('<ol/>');
            cmp.append(list);
            for (var c = 0; c < ecep.comparing.length; c++) {
                var item = $('<li/>');
                item.data('location-id', ecep.comparing[c].id);
                item.html(ecep.comparing[c].name);
                list.append(item);
            }

            if (ecep.comparing.length == 2) {
                var btn = $('<a/>');
                btn.attr('id', 'compare-locations');
                btn.addClass('btn');
                btn.addClass('gmnoprint');
                btn.text('Compare');
                btn.data('a', ecep.comparing[0].id);
                btn.data('b', ecep.comparing[1].id);

                cmp.append(btn);

                btn.click(function() {
                    var a = $(this).data('a'),
                        b = $(this).data('b');
                    ecep.showComparison(a, b);
                });
            }
        }
    }
};

ecep.showComparison = function(a, b) {
    _gaq.push(['_trackEvent', 'Comparison', 'Display', 'Comparing ' + a + ' to ' + b]);

    var test = $('<div class="hidden-phone" id="viztest"/>');
    $(document.body).append(test);
    var fullscreen = $('#viztest:visible').length == 0;
    test.remove();

    var url = ecep.getUrl('compare', a, b);

    var req = $.ajax({
        url: url,
        dataType: 'html',
        data: { m: 'embed' }
    });

    req.done(function(data, txtStatus, jqxhr) {
        _gaq.push(['_trackEvent', 'Comparison', 'AJAX success', data.length]);
        if(!fullscreen) {
            $('#compare-modal .modal-body').html(data);
            $('#compare-modal').modal();
            $('#compare-permalink').attr('href', url);
        }
        else {
            // add a fullscreen div
        }
    });

    req.fail(function(jqxhr, txtStatus, message) {
        _gaq.push(['_trackEvent', 'Comparison', 'Error', 'Status: ' + txtStatus + ', Message: ' + message]);
    });
};


ecep.expandInfo = function(event) {
    var type = (('data' in event) && event.data.type) ? event.data.type : 'popup';
    var mkr = ('data' in event) ? event.data.marker : this;

    _gaq.push(['_trackEvent', 'Location', 'Display', 'Type: ' + type + ', Location: ' + mkr.get('location_id')]);

    var req = $.ajax({
        url: ecep.getUrl('location_info', mkr.get('location_id')),
        dataType: 'html',
        data: { m:type }
    });

    req.done(function(data, txtStatus, jqxhr) {
        _gaq.push(['_trackEvent', 'Location', 'AJAX success', data.length]);
        ecep.infoWindow.close();
        ecep.infoWindow.setContent(data);
        ecep.infoWindow.setPosition(mkr.getPosition());
        ecep.infoWindow.open(ecep.map, mkr);

        // keep from attaching multiple domready callbacks
        if (ecep.infoWindow.get('domready')) {
            google.maps.event.removeListener(ecep.infoWindow.get('domready'));
        }

        ecep.infoWindow.set('domready', google.maps.event.addListener(ecep.infoWindow, 'domready', function() {
            if (ecep.geocoded_marker == null && ecep.geolocated_marker == null) {
                // neither location available, disable navigation
                $('.loc_directions').hide();
            }
            else if (ecep.geocoded_marker == null || ecep.geolocated_marker == null) {
                // only one location available, navigate to that
                $('.nav_single').show();
                $('.nav_multi').hide();
                $('.nav_to_location').click(ecep.directions);
            }
            else {
                // both locations available, ask user
                $('.nav_multi').show();
                $('.nav_single').hide();
                $('.nav_to_location').click(ecep.directions);
            }

            // this ensures that only one event is attached to this button
            $('.loc_moreinfo a')
                .off('click', ecep.expandInfo)
                .on('click', {marker: mkr, type: 'html'}, ecep.expandInfo);

            $('.loc_lessinfo a')
                .off('click', ecep.expandInfo)
                .on('click', {marker: mkr, type: 'popup'}, ecep.expandInfo);
        }));
    });

    req.fail(function(jqxhr, txtStatus, message) {
        _gaq.push(['_trackEvent', 'Location', 'Error', 'Status: ' + txtStatus + ', Message: ' + message]);
    });

    req.always(function() {
        if (ecep.comparing.length == 0) {
            ecep.comparing.push({id:mkr.get('location_id'), name:mkr.get('location_site_name')});
        }
        else if (ecep.comparing[0].id == mkr.get('location_id')) {
            if (ecep.comparing.length == 2) {
                // swap their positions
                ecep.comparing = [
                    ecep.comparing[1],
                    ecep.comparing[0]
                ];
            }
        }
        else {
            if (ecep.comparing.length == 2 && ecep.comparing[1].id == mkr.get('location_id')) {
                // swap their positions
                ecep.comparing = [
                    ecep.comparing[1],
                    ecep.comparing[0]
                ];
            }
            else {
                ecep.comparing.push({id:mkr.get('location_id'), name:mkr.get('location_site_name')});

                if (ecep.comparing.length > 2) {
                    ecep.comparing = ecep.comparing.slice(1);
                }
            }
        }

        ecep.comparingChanged();
    });
    
    return false;
};


ecep.loadLocations = function() {
    var data = {};
    var gaMsg = [];
    var filters = $('.loc_filter_check:checked');
    filters.each(function(idx, elem) {
        if (elem.id == 'all')
            return;

        data[elem.id] = elem.value;
        gaMsg.push(elem.id + '=' + elem.value);
    });

    if (ecep.geocoded_marker) {
        var pos = ecep.geocoded_marker.getPosition()
        data.pos = pos.lng() + ' ' + pos.lat();
        data.rad = $('#search-radius').val();

        gaMsg.push('pos='+data.pos);
        gaMsg.push('rad='+data.rad);
    }

    if (ecep.initialBounds == null) {
        ecep.initialBounds = ecep.map.getBounds();
    }

    _gaq.push(['_trackEvent', 'Locations', 'Load', 'Filters: ' + gaMsg.join(';')]);

    var load = $.ajax({
        url: ecep.getUrl('loadLocations'),
        dataType: 'json',
        data: data
    });

    load.done(function(data, textStatus, jqxhr) {
        _gaq.push(['_trackEvent', 'Locations', 'AJAX success', data.length]);

        var markers = [];
        var bounds = new google.maps.LatLngBounds();

        if (ecep.geocoded_marker) {
            bounds.extend(ecep.geocoded_marker.getPosition());
        }
        if (ecep.geolocated_marker) {
            bounds.extend(ecep.geolocated_marker.getPosition());
        }

        for (var i = 0; i < data.length; i++) {
            if (!data[i].lng || !data[i].lat) {
                continue;
            }
            var ll = new google.maps.LatLng(data[i].lat, data[i].lng);
            bounds.extend(ll);

            var marker = new google.maps.Marker({
                position: ll,
                title: data[i].site_name});
            marker.set('location_id', data[i].id);
            marker.set('location_site_name', data[i].site_name);

            google.maps.event.addListener(marker, 'click', ecep.expandInfo);

            markers.push(marker);
        }

        if (ecep.clusterr != null) {
            ecep.clusterr.clearMarkers();
        }
        ecep.clusterr = new MarkerClusterer(ecep.map, markers, {maxZoom:18, printable:true});

        ecep.map.fitBounds(bounds);

        google.maps.event.removeListener(ecep.loadedListener);
    });

    load.fail(function(jqxhr, textStatus, message) {
        // this fires when a request is aborted: i.e. if you click
        // a link before the locations are done loading.
        if (jqxhr.getAllResponseHeaders()) {
            _gaq.push(['_trackEvent', 'Locations', 'Canceled', 'Status: ' + textStatus + ', Message: ' + message]);
        }
        else {
            _gaq.push(['_trackEvent', 'Locations', 'Error', 'Status: ' + textStatus + ', Message: ' + message]);
        }
    });
};

ecep.geolocate = function() {
    _gaq.push(['_trackEvent', 'Geolocate', 'Begin']);
    navigator.geolocation.getCurrentPosition(
        function(pos) {
            var ll = new google.maps.LatLng(pos.coords.latitude, pos.coords.longitude);
            if (ecep.initialBounds.contains(ll)) {
                _gaq.push(['_trackEvent', 'Geolocate', 'Found']);
                ecep.geolocated_marker = ecep.dropMarker(ll, "Your Location", 'blue', true);

                ecep.clearDirections();
            }
            else {
                _gaq.push(['_trackEvent', 'Geolocate', 'Found', 'Out of area']);
                console.warn('User location is outside the service area.');
            }
        },
        function() {
            _gaq.push(['_trackEvent', 'Geolocate', 'Error']);
            console.warn('User location cannot be found.');
        }
    );
};

ecep.search = function() {
    _gaq.push(['_trackEvent', 'Geocode', 'Begin', 'From: ' + this.id]);
    var addr = $($(this).data('address')).val();

    if (addr == '') {
        alert('Please type in an address.');
        return;
    }

    if (ecep.geocoded_marker != null) {
        ecep.geocoded_marker.setMap(null);
        ecep.geocoded_marker = null;
    }

    ecep.geocode(addr);

    // we can always hide this, even if it's hidden
    $('#address-modal').modal('hide');
};

ecep.geocode = function(addr) {
    ecep.geocoder.geocode({'address': addr, 'bounds': ecep.initialBounds },
        function(results, geocodeStatus) {
            if (geocodeStatus == google.maps.GeocoderStatus.OK) {
                var ll = results[0].geometry.location;

                if (ecep.initialBounds.contains(ll)) {
                    _gaq.push(['_trackEvent', 'Geocode', 'Found']);

                    ecep.geocoded_marker = ecep.dropMarker(ll, results[0].formatted_address, 'green', true);
                    $('#search-address').val(addr);

                    // trigger the load event, and apply the radius filter
                    ecep.loadLocations();

                    ecep.clearDirections();

                    return;
                }
                else {
                    _gaq.push(['_trackEvent', 'Geocode', 'Found', 'Out of area']);
                }
            }
            else {
                _gaq.push(['_trackEvent', 'Geocode', 'Not Found']);
            }

            alert('Sorry, the address:\n\n"' + addr + '"\n\nCan\'t be found in the service area.');
        }
    );
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
        if (!ecep.map.getBounds().contains(loc)) {
            ecep.map.setCenter(loc);
        }
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
        travelMode: google.maps.TravelMode.WALKING
    };
    _gaq.push(['_trackEvent', 'Directions', 'Begin', 'From "' + req.origin + '" to "' + req.destination + '"']);
    ecep.directions_service.route(req, function(result, rtestatus) {
        if (rtestatus == google.maps.DirectionsStatus.OK) {
            _gaq.push(['_trackEvent', 'Directions', 'Found']);
            // update the map with line
            ecep.directions_display.setDirections(result);

            // update text instructions
            // move over by the width of instructions + 5px gutter
            $('#map-container, #compare-box').addClass('show-directions').removeClass('hide-directions');
            google.maps.event.trigger(ecep.map, 'resize');
        }
        else {
            _gaq.push(['_trackEvent', 'Directions', 'Error']);
        }
    });
};

ecep.clearDirections = function() {
    // clear any existing directions off the page
    ecep.directions_display.setMap(null);
    $('.directions').remove();

    var loc = ecep.map.getCenter();
    $('#map-container, #compare-box').addClass('hide-directions').removeClass('show-directions');
    google.maps.event.trigger(ecep.map, 'resize');
    ecep.map.setCenter(loc);
};

ecep.typeDirections = function() {
    _gaq.push(['_trackEvent', 'Directions', 'Display']);
    var result = ecep.directions_display.directions;
    ecep.directions_display.setMap(ecep.map);

    var direlem = $('.directions');
    if (direlem.length == 0) {
        $('#map-container')
            .after('<div class="visible-phone directions"/>')
            .after('<div class="hidden-phone directions"/>');
        direlem = $('.directions');
    }
    else {
        direlem.empty();
    }
    direlem.append($('<button class="clear_dir btn pull-right gmnoprint"><i class="icon-remove"></i> Close</button>'));

    $('.clear_dir').click(ecep.clearDirections);

    direlem.append($('<h3>Walking Directions</h3>'));

    var external_dir = $('<div />');
    external_dir.addClass('external-directions');

    var external_link = $('<a/>');
    external_link.addClass('ext-dir');
    external_link.text('Directions from Google');
    var url = 'http://maps.google.com/?saddr=' + result.routes[0].legs[0].start_address +
        '&daddr=' + result.routes[0].legs[result.routes[0].legs.length-1].end_address;
    var tracker = _gat._getTrackerByName('outlinkTracker');
    external_link.attr('href', tracker._getLinkerUrl(url));
    external_dir.append(external_link);
    direlem.append(external_dir);

    var warn = $('<div />');
    warn.addClass('d_warn');
    for (var i = 0; i < result.routes[0].warnings.length; i++) {
        var p = $('<p/>');
        p.html(result.routes[0].warnings[i]);
        warn.append(p);
    }
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

//Modal splash setup
$(document).ready(ecep.init);

