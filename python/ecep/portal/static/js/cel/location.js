/********************************************************                                           
 * Copyright (c) 2013 Azavea, Inc.                                                                  
 * See LICENSE in the project root for copying permission                                           
 * Location with definition of location objects and 
 * data loader object
 *********************************************************/

define(['jquery', 'Leaflet'], function($, L) {
    var Location = function(starred, data){
        this.starred = starred;
        this.data = data;
    };

    /* Function that returns appropriate icon based on
     * a location's properties
     */
    Location.prototype.getIcon = function(){
        // TO DO: Add in functionality to get icon based on 
        // characteristics of location
    };

    Location.prototype.mapMarker = null;

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

        filterListener: function() {},

        /* Map of locations & neighborhoods, key is the id for
         * each object
         */
        locations: {},
        neighborhood: {}
    };

    return [Location, DataLoader];

});

