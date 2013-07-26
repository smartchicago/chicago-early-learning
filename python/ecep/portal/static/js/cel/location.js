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
    }

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
    }

    /* 
     * Add location to cookie string
     */
    Location.prototype.setStarred = function() {
        favorites.addIdToCookie(this.id);
    }

    /* Function that returns appropriate icon based on
     * a location's properties
     */
    Location.prototype.getIcon = function(options){
        // TO DO: Add in functionality to get icon based on 
        // characteristics of location
        var defaults = {

        };
        var opts = $.extend({}, defaults, options);
    };

    /* Sets boolean value for if location should be on list
     */
    Location.prototype.showInList = function(filters, map){
        // if location filter 
    };

    var DataLoader = {

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

