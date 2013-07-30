/********************************************************
 * Copyright (c) 2013 Azavea, Inc.
 * See LICENSE in the project root for copying permission
 * Location with definition of location objects and
 * data loader object
 *********************************************************/

define(['jquery', 'Leaflet', 'Handlebars', 'favorites', 'topojson', 'common'],
    function($, L, Handlebars, favorites, topojson, common) {

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
        return favorites.isStarred(this.getId());
    };

    /*
     * Add location to cookie string
     */
    Location.prototype.setStarred = function(add) {
        if (add) {
            favorites.addIdToCookie(this.getId());
        } else {
            favorites.removeIdFromCookie(this.getId());
        }
    };

    /*
     * Is the location accredited?
     */
    Location.prototype.isAccredited = function() {
        var isAccredited = false;
        $.each(this.data.sfields, function(key, value) {
            if (value.fieldname === "Accreditation" && value.value !== "None") {
                isAccredited = true;
                return false;
            }
        });
        return isAccredited;
    };

    /*
     * Determines if the location is a school or not
     * Returns:
     *      true if school
     *      false if not
     */
    Location.prototype.isSchool = function() {
        var isSchool = false;
        $.each(this.data.sfields, function(key, value) {
            if (value.fieldname === "Affiliations") {
                if (value.value.indexOf("CPS Based") !== -1) {
                    isSchool = true;
                } 
                return false;
            }
        });
        return isSchool;
    };

    /* Function that returns appropriate icon based on
     * a location's properties
     */
    Location.prototype.getIcon = function(options) {

        var doubleDimensions = function(option) {                                                        
            option[0] *=2;                                                                          
            option[1] *=2;                                                                          
        };                                                                                          

        var setHighlighted = function(options) {                                                         
            doubleDimensions(options.iconSize);                                                
            doubleDimensions(options.shadowSize);                                              
            doubleDimensions(options.iconAnchor);                                              
            doubleDimensions(options.shadowAnchor);                                            
            doubleDimensions(options.popupAnchor);                                             
            options.iconUrl = options.iconUrl.replace(".png", "@2x.png");                                             
            options.shadowUrl = options.shadowUrl.replace(".png", "@2x.png");
            return options;
        };

        var defaults = {
            key: null,
            highlighted: false,
            iconUrl: '/static/img/leaflet-icons/marker-icon.png',
            shadowUrl: '/static/img/leaflet-icons/marker-shadow.png',
            iconSize: [35, 45],
            shadowSize: [41, 41],
            iconAnchor: [17, 45],
            shadowAnchor: [10, 41],
            popupAnchor: [0, -60]
        };
        var iconOpts = $.extend({}, defaults, options),
            key = '',
            cacheKey;

        // build a key!
        if (iconOpts.key) {
            key = iconOpts.key;
        } else {
            key += this.isSchool() ? 'school' : 'center';
            key += this.isAccredited() ? '-accredited' : '';
            key += this.isStarred() ? '-starred' : '';
        }

        // cache the icon with a simple key
        cacheKey = key;
        if (iconOpts.highlighted) {
            cacheKey += '-highlighted';
        }
        if (_iconcache[cacheKey]) {
            return _iconcache[cacheKey];
        }

        switch (key) {
            case 'school':
                $.extend(iconOpts, {iconUrl: '/static/img/leaflet-icons/school.png'});
                break;
            case 'school-starred':
                $.extend(iconOpts, {iconUrl: '/static/img/leaflet-icons/school-starred.png'});
                break;
            case 'school-accredited':
                $.extend(iconOpts, {iconUrl: '/static/img/leaflet-icons/school-accredited.png'});
                break;
            case 'school-accredited-starred':
                $.extend(iconOpts, {iconUrl: '/static/img/leaflet-icons/school-accredited-starred.png'});
                break;
            case 'center':
                $.extend(iconOpts, {iconUrl: '/static/img/leaflet-icons/center.png'});
                break;
            case 'center-starred':
                $.extend(iconOpts, {iconUrl: '/static/img/leaflet-icons/center-starred.png'});
                break;
            case 'center-accredited':
                $.extend(iconOpts, {iconUrl: '/static/img/leaflet-icons/center-accredited.png'});
                break;
            case 'center-accredited-starred':
                $.extend(iconOpts, {iconUrl: '/static/img/leaflet-icons/center-accredited-starred.png'});
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
        _iconcache[cacheKey] = icon;
        return icon;
    };

    /*
     * Set the locations map marker icon
     */
    Location.prototype.setIcon = function(options) {
        if (this.mapMarker) {
            var icon = this.getIcon(options);
            this.mapMarker.setIcon(icon);
        }
    };

    /*
     * Get location marker object
     */
    Location.prototype.getMarker = function() {
        return this.mapMarker || null;
    };

    /*
     * Input: Leaflet Marker Icons object
     * Output: Reference to the created marker
     * If map marker already exists, updates existing marker icon
     * If map marker does not exist, creates marker with proper icon
     */
    Location.prototype.setMarker = function(options) {
        var popupTemplate = Handlebars.compile('<b>{{item.site_name}}</b><br>{{item.address}}'),
            icon = this.getIcon(options),
            marker = this.getMarker();
        if (marker) {
            marker.setIcon(icon);
        } else {
            this.mapMarker = new L.Marker(this.getLatLng(), { icon: icon });
            this.mapMarker.bindPopup(popupTemplate(this.data), {key: this.getId()});
        }
    };

    Location.prototype.getLatLng = function() {
        return new L.LatLng(this.data.position.lat, this.data.position.lng);
    };

    /* Sets boolean value for if location should be on list
     */
    Location.prototype.isWithinMapBounds = function(map){
        var mapBounds = map.getBounds();
        return mapBounds.contains(this.getLatLng());
    };


    /**
     * Creates a new DataManager object
     * @param { Optional query collection of DOM filter objects to bind onFilterChange to } $filters
     */
    var DataManager = function($filters) {
            var that = this;
            this.events = $({});
            this.$filters = $filters || $('.filters-inner :checkbox');
            this.$filters.on('click', function() { that.onFilterChange(); });
        },
        _iconcache = {};

    DataManager.prototype = {
        /**
         * Settings for layers - data manager needs access to these to know which to load
         */
        zoomSettings: CEL.serverVars.zoomSettings,

        /**
         * DOM filters to read filter settings from
         * Set in constructor
         */
        $filters: null,

        /**
         * Updates if location is shown in map and list based on
         * applied filters and bounding box of map
         */
        locationUpdate: function(map) {
            var filters = this.getFilters(map);
                that = this;
            $.getJSON(common.getUrl('location-api'), filters, function(data) {
                $.each(data.locations, function(i, location) {
                    var key = location.item.key;
                    if (!that.locations[key]) {
                        that.locations[key] = new Location(location);
                    }
                    that.locations[key].setMarker();
                });
                that.events.trigger('DataManager.locationUpdated');
            });
        },

        /**
         * Updates school counts for neighborhoods based on
         * filters.
         *
         * Download topojson if not already downloaded.
         */
        neighborhoodUpdate: function(map) {
            var that = this,
                filters = that.getFilters(map);
            $.when(
                $.getJSON(common.getUrl('neighborhood-api'), filters, function(data) {
                    var neighborhoods = that.neighborhoods.data;
                    $.each(data.neighborhoods, function(i, neighborhood) {
                        var key = neighborhood.id;
                        neighborhoods[key] = neighborhood;
                    });
                }),
                that.geojsonUpdate()
            ).then(function() {
                that.events.trigger('DataManager.neighborhoodUpdated');
            });
        },
    
        /*
         * Get geojson for the neighborhoods and store in DataManager
         */
        geojsonUpdate: function() {
            var that = this;
            if (that.neighborhoods.geojson === undefined) {
                return $.getJSON(common.getUrl('neighborhoods-topo'), function(data) {
                        that.neighborhoods.geojson = topojson.feature(data, data.objects.neighborhoods);
                });
            }
        },

        // Updates data on filter changes
        onFilterChange: function() {
            this.events.trigger('DataManager.filtersUpdated');
        },

        getFilters: function(map) {
            var opts = { },
                $filters = this.$filters || $('.filters-inner :checkbox');
            $filters.filter(':checked').each(function(idx, elem) {
                opts[elem.id] = elem.checked;
            });
            if (map && map.getBounds) {
                opts.bbox = map.getBounds().pad(1.5).toBBoxString();
            }
            
            return opts;
        },

        /**
         * Map of locations & neighborhoods, key is the id for
         * each object
         */
        locations: {},
        neighborhoods: {
            data: {} // data for neighborhood (e.g. number of schools)
        },

        /* 
         * Available events:
         * neighborhoodUpdated: 'DataManager.neighborhoodUpdated',
         *      triggered when neighborhood data is finished loading
         * locationUpdated: 'DataManager.locationUpdated'
         *      triggered when location data is finished loading
         * filtersUpdated: 'DataManager.filtersChanged'
         *      fired when DOM filters change.  This includes checkboxes and map bounding box
         */
        events: null
    };

    return {
        Location: Location,
        DataManager: DataManager
    };
});

