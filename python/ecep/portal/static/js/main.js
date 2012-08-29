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
ecep.locationMarkers = { };
ecep.initialBounds = null;
ecep.onMapPage = null;

ecep.getUrl = function(name) {
    var mapImgs = '/static/images/map/'
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
        case 'normal-marker':
            return mapImgs + 'marker-inactive.png';
        case 'search-marker':
            return mapImgs + 'loc-marker.png';
        case 'geo-marker':
            return mapImgs + 'geo-marker.png';
        case 'selected-marker':
            return mapImgs + 'marker-active.png';
        case 'cluster-small':
            return mapImgs + 'cluster-sm.png';
        case 'cluster-medium':
            return mapImgs + 'cluster-md.png';
        case 'cluster-large':
            return mapImgs + 'cluster-lg.png';

        default:
            throw 'Unknown URL endpoint "' + name + '"';
    }
};

ecep.markerStyle = [
    {
        url: ecep.getUrl('cluster-small'),
        //width and height don't scale image, they crop it
        width: 54,
        height: 54,
        anchor: [0, 0], //[x, y] in px from center
        textSize: 13,     //not sure what units these are
        textColor: 'white'
    },
    {
        url: ecep.getUrl('cluster-medium'),
        width: 61,
        height: 61,
        anchor: [0, 0],
        textSize: 13,
        textColor: 'white'
    },
    {
        url: ecep.getUrl('cluster-large'),
        width: 67,
        height: 67,
        anchor: [0, 0],
        textSize: 13,
        textColor: 'black'
    }
];

ecep.init = function() {
    //Are we on the map page?
    var path = window.location.pathname;
    if (path === '/' || path === '/index.html') {
        ecep.onMapPage = true;
    }
    else {
        // disable some mapbar stuff when not on map page
        ecep.onMapPage = false;
        $('#filter-toggle').css('visibility', 'hidden');
        $('#find-me-btn').css('visibility', 'hidden');
    }

    // attach the search handler to the search button(s)
    $('.search-button').click(ecep.search);

    // Tie "enter" in text box to start button
    var inputNode = $('input.address-input');
    if (inputNode) {
        inputNode.keypress(function(event) {
            if(event.keyCode == 13) {
                $($(this).data('button')).click();
                return false;
            }
        });
    }

    $('#print-toggle').click(function(){
        window.print();
		$(this).attr('target', '_blank');
    });


    //Bail early if we're not on the map page
    if (!ecep.onMapPage) {
        $(document.body).addClass('static');
        return;
    }

    /*************************************************************************
     *                      Begin Map specific init                          *
     *************************************************************************/
    

    var al = google.maps.event.addListener;     //saves some typing
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
    ecep.directionsListener = al(ecep.directions_display, 'directions_changed', ecep.typeDirections);

    //Tie up address search handler
    var addr = $('#search-address').val();
    var searchOnLoad = (ecep.onMapPage && addr != null && addr != '');
    if (searchOnLoad) {
        // Perform search if necessary once map is ready
        var searchListener = al(ecep.map, 'tilesloaded', function() {
            if (ecep.initialBounds == null) {
                ecep.initialBounds = ecep.map.getBounds();
            }

            ecep.search(addr);

            google.maps.event.removeListener(searchListener);
        });
    }
    else {
        // load locations when the map is all done
        ecep.loadedListener = al(ecep.map, 'tilesloaded', ecep.loadLocations);
    }

    // attach the geolocation handler to the geolocation button
    if (navigator.geolocation) {
        $('.geolocate').click(ecep.geolocate);
    }
    else {
        _gaq.push(['_trackEvent', 'Geolocate', 'Disabled', 'Browser does not support geolocation']);
        $('.geolocate').hide();
    }

    var cookies = document.cookie.split('; ');
    var cpos = $.inArray('show_splash=true', cookies)
    if (cpos >= 0 && !searchOnLoad) {
        //Show modal splash (see index.html)
        $('#address-modal').modal({ keyboard:false, show:true });
        var ed = new Date(new Date().valueOf() + (1000 * 60 * 60));
        document.cookie = 'show_splash=false; expires='+ed.toUTCString();
    }

    $('#filter-toggle').popover({
        animation: false,
        placement: 'bottom',
        trigger: 'manual',
        title: 'Filters',
        content: $('#filter-selection').text()
    });

    $('#filter-toggle').click(function() {
        $('#filter-toggle').popover('toggle');
        if ($('#update-filter:visible').length > 0) {

            // reset the element's left positioning
            //$('.popover')[0].style.left = null;
            //$('.popover')[0].style.top = null;

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
};

ecep.comparingChanged = function(event) {
    _gaq.push(['_trackEvent', 'Comparison', 'Change', 'Comparing: ' + ecep.comparing.join(', ')]);
    var cmp = $('#compare-content'),
        activeImg = ecep.markerImage('selected-marker'),
        inactiveImg = ecep.markerImage('normal-marker');

    // if the first item in the list, it must have been sloughed off; remove it
    if (cmp.find('li:first').data('location-id') != ecep.comparing[0].id) {
        cmp.find('li:first').remove();
    }

    // a callback used when items are clicked, and items are added
    var wireCompare = function(x, a, b) {
        x.data('a', a);
        x.data('b', b);
        x.on('click', function() {
            $('#filter-toggle').popover('hide');
            var a = $(this).data('a'),
                b = $(this).data('b');
            ecep.showComparison(a, b);
        });
        x.removeClass('disabled');
    };

    // create a new list item for the last item in the comparison
    // (only ever add one at a time)
    var listNode = $('<li/>'),
        item = ecep.comparing[ecep.comparing.length - 1];

    listNode.addClass('loc_item');
    listNode.data('location-id', item.id);
    listNode.html(item.name);
    listNode.on('click', function() {
        // when you click on an listNode, toggle the active class
        $(this).toggleClass('active');
        item.active = !item.active;

        var mh = ecep.locationMarkers[item.id];
        //this should always be true, but just to be safe...
        if (mh) { 
            mh.active = !mh.active;
            mh.mkr.setIcon(mh.active ? activeImg : inactiveImg);
        }

        var actives = cmp.find('li.loc_item.active');
        var btn = $('#compare-locations');
        btn.off('click');

        // if two listNodes are selected, then wire up the comparison button
        if (actives.length == 2) {
            wireCompare(btn, $(actives[0]).data('location-id'), $(actives[1]).data('location-id'));
        }
        // more or less than two listNodes? disable the compare button
        else {
            btn.addClass('disabled');
        }
    });
    cmp.find('ul').append(listNode);

    // if there are two or more items, we can compare (maybe)
    if (ecep.comparing.length >= 2) {
        var btn = $('#compare-locations')
        if (btn.length == 0) {
            btn = $('<a/>');
            btn.attr('id', 'compare-locations');
            btn.addClass('btn');
            btn.addClass('gmnoprint');
            btn.addClass('btn-primary');
            btn.addClass('compare-btn');
            btn.text('Compare');

            cmp.append(btn);
        }

        // always remove the click, to prevent multiple events
        btn.off('click');

        var a = null, b = null;
        var actives = cmp.find('li.loc_item.active');

        // if only two items in the list, allow comparing
        // prior to selection
        if (ecep.comparing.length == 2) {
            a = ecep.comparing[0].id;
            b = ecep.comparing[1].id;
        }
        // if there are two selected items, they may be compared
        else if (actives.length == 2) {
            a = $(actives[0]).data('location-id');
            b = $(actives[1]).data('location-id');
        }

        // two things selected? wire up and enable button
        if (a != null && b != null) {
            wireCompare(btn, a, b);
        }
        // no two things comparable, disable the button
        else {
            btn.addClass('disabled');
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
            $('#compare-box').css('z-index', 1070);
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
        var found = false;
        var loc_id = mkr.get('location_id');
        for (var i = 0; i < ecep.comparing.length && !found; i++) {
            found = found || ecep.comparing[i].id == loc_id;
        }

        // add the location if it's not alredy in the list
        if (!found) {
            ecep.comparing.push({
                id: loc_id,
                name: mkr.get('location_site_name'),
                active: false
            });

            // limit the list to 10 items
            if (ecep.comparing.length > 10) {
                ecep.comparing = ecep.comparing.slice(1);
            }

            ecep.comparingChanged();
        }
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
            var loc = data[i];
            var mh = ecep.locationMarkers[loc.id] || { mkr: null, active: false };

            if (!loc.lng || !loc.lat) {
                continue;
            }
            var ll = new google.maps.LatLng(loc.lat, loc.lng);
            bounds.extend(ll);

            var markerImg = ecep.markerImage(mh.active ? 'selected-marker' : 'normal-marker');

            var marker = new google.maps.Marker({
                position: ll,
                title: loc.site_name, 
                icon: markerImg
            });
            marker.set('location_id', loc.id);
            marker.set('location_site_name', loc.site_name);

            google.maps.event.addListener(marker, 'click', ecep.expandInfo);

            markers.push(marker);
            mh.mkr = marker;
            ecep.locationMarkers[loc.id] = mh;
        }

        if (ecep.clusterr != null) {
            ecep.clusterr.clearMarkers();
        }
        ecep.clusterr = new MarkerClusterer(ecep.map, markers, {
            maxZoom: 18,
            styles: ecep.markerStyle
        });

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
                ecep.geolocated_marker = ecep.dropMarker(ll, "Your Location", 'geo-marker', true);

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

ecep.geocode = function(addr) {
    ecep.geocoder.geocode({'address': addr, 'bounds': ecep.initialBounds },
        function(results, geocodeStatus) {
            if (geocodeStatus == google.maps.GeocoderStatus.OK) {
                var ll = results[0].geometry.location;

                if (ecep.initialBounds.contains(ll)) {
                    _gaq.push(['_trackEvent', 'Geocode', 'Found']);

                    ecep.geocoded_marker = ecep.dropMarker(
                        ll, results[0].formatted_address, 'search-marker', true);
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

ecep.dropMarker = function(loc, title, urlName, reposition) {
    var marker = new google.maps.Marker({
        map: ecep.map,
        position: loc,
        title: title,
        icon: ecep.markerImage(urlName)
    });
    if (reposition) {
        if (!ecep.map.getBounds().contains(loc)) {
            ecep.map.setCenter(loc);
        }
    }
    return marker;
};

ecep.markerImage = function(name) {
    var markerImg = new google.maps.MarkerImage(
        ecep.getUrl(name),
        new google.maps.Size(25, 25)
    );
    markerImg.anchor = new google.maps.Point(12, 25);

    return markerImg;
}

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

ecep.search = function(address) {
    _gaq.push(['_trackEvent', 'Geocode', 'Begin', 'From: ' + this.id]);
    if (typeof(address) !== 'string') {
        address = null;
    }

    var addr = address || $($(this).data('address')).val();
    var rad = $('#search-radius').val();

    if (addr == '') {
        alert('Please type in an address.');
        return;
    }
    
    if (!ecep.onMapPage) {
        var form = $('#search-form');
        form.find('input[name="searchText"]').val(addr);
        form.find('input[name="searchRadius"]').val(rad);
        form.submit();
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

//Modal splash setup
$(document).ready(ecep.init);

