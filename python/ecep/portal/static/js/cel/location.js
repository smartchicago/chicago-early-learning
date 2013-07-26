/********************************************************
 * Copyright (c) 2013 Azavea, Inc.
 * See LICENSE in the project root for copying permission
 * Location with definition of location objects and
 * data loader object
 *********************************************************/

define(['jquery', 'Leaflet', 'favorites'], function($, L, favorites) {

    /*
     * Constructor for location
     * data -- object returned from the /location/api/<id>/ url
     */
    var Location = function(data){
        if (data.position && data.item) {
            this.data = data;
        } else {
            throw "CELLocationInvalid";
        }

        this.mapMarker = null;
    };

    /*
     * Return ID of the location
     *      shortcut if we need more functionality later
     */
    Location.prototype.getId = function() {
        return this.data.item.key;
    };

    /*
     * Checks if location is starred
     * Returns:
     *      true if starred
     *      false if not starred
     */
    Location.prototype.isStarred = function() {
        var id = this.getId();
        var cookie = favorites.getCookie();
        var idlist = cookie.split(',');
        if (idlist.indexOf(id) >= 0) {
            return true;
        } else {
            return false;
        }
    };

    /*
     * Add location to cookie string
     */
    Location.prototype.setStarred = function() {
        favorites.addIdToCookie(this.id);
    };

    /*
     * Is the location accredited?
     */
    Location.prototype.isAccredited = function() {
        // quick way.
        return (this.data.sfields[0].value === "None") ? false : true;
        // detailed way
        /*
        var isAccredited = false;
        $.each(this.data.sfields, function(key, value) {
            if (value.fieldname === "Accreditation" && value.value !== "None") {
                isAccredited = true;
                return false;
            }
        });
        */
    };

    /*
     * Determines if the location is a school or not
     * Returns:
     *      true if school
     *      false if not
     */
    Location.prototype.isSchool = function() {
        return true;
    };

    /* Function that returns appropriate icon based on
     * a location's properties
     */
    Location.prototype.getIcon = function(options) {

        var setHighlighted = function(options) {

        };

        var defaults = {
            highlighted: false,
            iconUrl: '/static/img/leaflet-icons/marker-icon.png',
            shadowUrl: '/static/img/leaflet-icons/marker-shadow.png',
            iconSize: [35, 45],
            shadowSize: [41, 41],
            iconAnchor: [10, 60],
            shadowAnchor: [4, 62],
            popupAnchor: [10, -60]
        };
        var iconOpts = $.extend({}, defaults, options),
            key = '';

        // build a key!
        key += (this.isSchool()) ? 'school' : 'center';
        key += (this.isStarred()) ? '-starred' : '';
        key += (this.isAccredited()) ? '-accredited' : '';

        // if the icon already exists in cache, just return reference to that
        //if (DataManager.IconCache[key]) {
            //console.log("From DataManager.IconCache:", DataManager.IconCache[key]);
            //return DataManager.IconCache[key];
        //}


        switch (key) {
            case 'school':
                $.extend(iconOpts, {iconUrl: '/static/img/leaflet-icons/marker-school.png'});
                break;
            case 'school-starred':
                $.extend(iconOpts, {iconUrl: '/static/img/leaflet-icons/marker-school.png'});
                break;
            case 'school-accredited':
                $.extend(iconOpts, {iconUrl: '/static/img/leaflet-icons/marker-school.png'});
                break;
            case 'school-accredited-starred':
                $.extend(iconOpts, {iconUrl: '/static/img/leaflet-icons/marker-school.png'});
                break;
            case 'center':
                $.extend(iconOpts, {iconUrl: '/static/img/leaflet-icons/marker-home.png'});
                break;
            case 'center-starred':
                $.extend(iconOpts, {iconUrl: '/static/img/leaflet-icons/marker-home.png'});
                break;
            case 'center-accredited':
                $.extend(iconOpts, {iconUrl: '/static/img/leaflet-icons/marker-home.png'});
                break;
            case 'center-accredited-starred':
                $.extend(iconOpts, {iconUrl: '/static/img/leaflet-icons/marker-home.png'});
                break;
            case 'geolocation':
                break;
            default:
                return null;
        }

        // highlighting means we double all dimensions and replace the icon with @2x
        if (iconOpts.highlighted) {
            iconOpts = setHighlighted(iconOpts);
        }

        var icon = L.icon(iconOpts);
        //DataManager.IconCache[key] = icon;
        return icon;
    };

    /* Sets boolean value for if location should be on list
     */
    Location.prototype.showInList = function(filters, map){
        // if location filter
    };

    var DataLoader = {

        iconcache: {},

        /* Updates if location is shown in map and list based on
         * applied filters and bounding box of map
         */
        locationUpdate: function(filters, map) {},

        /* Updates school counts for neighborhoods based on
         * filters
         *
         * @param {Filters taken from filter-list/model} filters
         */
        neighborhoodUpdate: function(filters, neighborhoodLayer) {},

        /* Updates locations when zoom changes
         */
        onZoomChange: function(map) {},

        idleListener: function(map) {}, // Listens to map for zoom and movement

        filterListener: function() {}, // listens to filters for changes

        /* Map of locations & neighborhoods, key is the id for
         * each object
         */
        locations: {},
        neighborhood: {},

        events: {zoomChanged: 'zoomChanged',
                 dataReady: 'dataReady'
                }
    };

    return {Location: Location,
            DataLoader:  DataLoader};

});

