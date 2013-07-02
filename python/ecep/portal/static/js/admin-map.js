/********************************************************
 * Copyright (c) 2013 Azavea, Inc.
 * See LICENSE in the project root for copying permission
 ********************************************************/

var ecepAdmin = ((typeof ecepAdmin == 'undefined') ? {} : ecepAdmin);

ecepAdmin.marker_array = [];
ecepAdmin.map;

ecepAdmin.clearMarkers = function() {
    for (var i = 0; i < ecepAdmin.marker_array.length; i++){
        ecepAdmin.marker_array[i].setMap(null);
    }
    ecepAdmin.marker_array = [];
}

ecepAdmin.addMarker = function(location) {
    var marker = new google.maps.Marker({
        map: ecepAdmin.map,
        position: location
    });
    google.maps.event.addListener(marker, 'click', function() {
        ecepAdmin.addGeocodedPoint(marker.getPosition());
    });

    ecepAdmin.marker_array.push(marker);
};

ecepAdmin.loadMap = function(){
    var latlng = new google.maps.LatLng(41.8941, -87.6229914);
    var mapOptions = {
        zoom: 12,
        center: latlng,
        mapTypeId: google.maps.MapTypeId.ROADMAP
    };
    ecepAdmin.map = new google.maps.Map(document.getElementById('map'), mapOptions);

    google.maps.event.addListener(ecepAdmin.map, "rightclick", function(event) {
        ecepAdmin.clearMarkers();
        ecepAdmin.addMarker(event.latLng);
        ecepAdmin.addGeocodedPoint(event.latLng);
    });

};


// Function to add geocoded location to admin form
ecepAdmin.addGeocodedPoint = function(location) {
    document.getElementById('id_geom').value = "POINT (" + location.lng() + " " + location.lat() + ")";
};

// Function to filter results that are not rooftop results
ecepAdmin.rooftopResults = function(geocode_results) {
    for (var i = 0; i < geocode_results.length; i++) {
        if (geocode_results[i].geometry.location_type != 'ROOFTOP') {
            geocode_results.splice(i, 1);
        }
    }
};

/** Function to geocode address and insert value into the location
 *  input of the admin form.
 *
 *  Provides user feedback if geocoding is unsuccessful and describes
 *  how to manually set the geolocation by right-clicking
 */
ecepAdmin.geocodeAddress = function() {
    var geocoder = new google.maps.Geocoder();
    var streetnum = document.getElementById("id_address").value,
        city = document.getElementById("id_city").value,
        state = document.getElementById("id_state").value,
        zip = document.getElementById("id_zip").value;
    var address = [streetnum, city, state, zip].join(', ');
    ecepAdmin.clearMarkers();
    
    geocoder.geocode( {'address': address}, function(results, status) {
        // Filter results (only rooftop)
        ecepAdmin.rooftopResults(results);

        // Add markers for all results
        for (var i = 0; i < results.length; i++) {
            ecepAdmin.addMarker(results[i].geometry.location);
        }

        // If only one marker, set the form value to that location
        // and zoom into that location
        if (results.length == 1) {
            ecepAdmin.addGeocodedPoint(results[0].geometry.location);
            ecepAdmin.map.setZoom(15);
            ecepAdmin.map.setCenter(results[0].geometry.location);
        }

        // If more than 2 results, let user know they can choose one
        // by clicking on the correct marker or they can set their 
        // own marker with a right-click
        else if (results.length > 1) {
            document.getElementById('map-help').value = " There are multiple locations that match that address, please select the correct location by clicking on a marker. You can also set the location manually by right-clicking on a position.";
            document.getElementById('map-help').visibility = 'visible';
        }

        // If there aren't any results, let user know they can manually set
        // the location by right clicking on the map
        else if (results.length == 0 || status != google.maps.GeocoderStatus.OK) {
            document.getElementById('map-help').innerHTML = "We could not match that address to a location. You can manually set the location by right-clicking on any location on the map.";
            document.getElementById('map-help').style.display = 'block';
        }

    });

};

ecepAdmin.mapHelp = function() {
    document.getElementById('map-help').innerHTML = "Please fill in the address of the location then click the 'Geocode Address' button to find its latitude and longitude. You can also select a location manually by right clicking anywhere on the map.";
    document.getElementById('map-help').style.display = 'block';
};

google.maps.event.addDomListener(window, 'load', ecepAdmin.loadMap);
