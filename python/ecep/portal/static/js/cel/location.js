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
            if (value.fieldname === gettext("Accreditation") && value.value !== gettext('None')) {
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
            if (value.fieldname.toLowerCase() === gettext("Program Information").toLowerCase()) {
                if (value.value.indexOf(gettext("CPS Based")) !== -1) {
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
        options = options || {};

        var scaleDimensions = function(option, scale) {
            scale = parseFloat(scale);
            if (isNaN(scale)) {
                return;
            }
            option[0] = Math.round(option[0] * scale);
            option[1] = Math.round(option[1] * scale);
        };

        var setHighlighted = function(options) {
            var scale = 1.25;
            scaleDimensions(options.iconSize, scale);
            scaleDimensions(options.shadowSize, scale);
            scaleDimensions(options.iconAnchor, scale);
            scaleDimensions(options.shadowAnchor, scale);
            scaleDimensions(options.popupAnchor, scale);
            return options;
        };

        var defaults = {
            key: null,
            highlighted: false,
            iconUrl: '/static/img/leaflet-icons/marker-icon.png',
            shadowUrl: '/static/img/leaflet-icons/marker-shadow.png',
            iconSize: [50, 50],
            shadowSize: [41, 41],
            iconAnchor: [25, 50],
            shadowAnchor: [10, 41],
            popupAnchor: [0, -60]
        };
        var iconOpts = $.extend({}, defaults, options),
            key = '';

        // build a key!
        var og_key = this.getIconKey();
        key = iconOpts.key ? iconOpts.key : og_key.key;

        // set icon url if not provided in options
        if (!options.iconUrl) {
            iconOpts.iconUrl = og_key.icon_url;
        }

        // highlighting means we scale all dimensions up and replace the icon with @2x
        if (iconOpts.highlighted) {
            iconOpts = setHighlighted(iconOpts);
        }

        var icon = L.icon(iconOpts);
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
     * get the icon key used in getIcon and the iconcache
     */
    Location.prototype.getIconKey = function() {
        // Handle special Enrollment center icons
        if(this.data.item.type == 1) {
            return 'enrollment';
        }
        var key = this.isSchool() ? 'school' : 'center';
        key += this.isAccredited() ? '-accredited' : '';
        key += this.isStarred() ? '-starred' : '';

        var icon_url = '/static/img/map-icons/'
        icon_url += '2x/';
        icon_url += this.isSchool() ? 'CPS/' : 'CBO/';
        icon_url += this.data.item.availability ? this.data.item.availability : 'neutral';
        icon_url += this.isAccredited() ? '-accredited' : '';
        icon_url += this.isStarred() ? '-selected' : '';
        icon_url += '.png';

        return { 'key': key, 'icon_url': icon_url };
    };

    /*
     * return a pretty print string describing the icon and location
     */
    Location.prototype.getIconDescription = function() {
        var descriptions = {
            center: gettext('Center'),
            'center-starred': gettext('Favorite Center'),
            'center-accredited': gettext('Accredited Center'),
            'center-accredited-starred': gettext('Favorite Accredited Center'),
            school: gettext('School'),
            'school-starred': gettext('Favorite School'),
            'school-accredited': gettext('Accredited School'),
            'school-accredited-starred': gettext('Favorite Accredited School')
        };
        var key = this.getIconKey();
        return descriptions[key.key];
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
        var defaults = {
                popup: true
            },
            icon = this.getIcon(options),
            marker = this.getMarker();
        options = $.extend({}, defaults, options);
        if (marker) {
            marker.setIcon(icon);
        } else {
            marker = this.mapMarker = new L.Marker(this.getLatLng(), { icon: icon });
            if (options.popup === true) {
                var locId = this.getId(),
                    data = this.data;

                marker.on('click', function (e) {
                    var isStarred = favorites.isStarred(locId),
                        icon = isStarred ? 'fa fa-check-circle compare-check' : 'fa fa-plus-circle',
                        hint = isStarred ? 'tooltip.unstar' : 'tooltip.star',
                        selected = isStarred ? 'favs-button-selected' : '';
                    var enrollmentInsertion = '';
                    if(data.item.type == 1) {
                        var enrollmentInsertion = '<h4>Enrollment Center</h4>';
                        var hours = '';
                        $.each(data.sfields, function(key, value) {
                            if(value.key == 'duration_hours') {
                                hours = value.value;
                            }
                        });
                        if(hours) {
                            enrollmentInsertion = enrollmentInsertion + hours + "<br />";
                        }
                    }
                    var popupText = '<div><b><a href="' + common.getUrl('single-location', { location: locId, slug: common.slugify(data.item.site_name) }) +
                        '">{{item.site_name}}</a></b><br>{{item.address}}<br>' + enrollmentInsertion +
                        '{{#each sfields}}{{#if_eq this.key "weekday_availability"}}{{#if_not_eq this.value "None"}}<small>{{this.value}}</small><br>{{/if_not_eq}}{{/if_eq}}{{#if_eq this.key "program_info"}}{{#if_not_eq this.value "None"}}<small>{{this.value}}{{/if_not_eq}}</small>{{/if_eq}}{{/each}}<br>' +
                        '<a href="#" id="favs-toggle-loc-{{item.key}}" class="favs-toggle hint--top ga-track ' + selected + '" data-hint="{{' + hint + '}}" data-loc-id="{{item.key}}" data-ga-category="search" data-ga-action="Favorite Location"><i class="' + icon + '"></i></a></div>';
                    var popupTemplate = Handlebars.compile(popupText);

                    var popup = L.popup()
                        .setContent(popupTemplate(data));

                    marker.bindPopup(popup);
                });
            }
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

    var LocationManager = function($filters) {
        this.locations = {};
        this.neighborhoods = {
            data: {}
        };
        this.events = $({});
        this.filters = $filters;
    }

    Location.prototype = {
        
    }

    /**
     * Creates a new DataManager object
     * @param { Optional query collection of DOM filter objects to bind onFilterChange to } $filters
     */
    var DataManager = function($filters) {
            var that = this;
            this.locations = {};
            this.neighborhoods = {
                data: {} // data for neighborhood (e.g. number of schools)
            };
            this.events = $({});
            this.$filters = $filters;
        }



    DataManager.prototype = {
        /**
         * DOM filters to read filter settings from
         * Set in constructor
         */
        $filters: null,

        /**
         * Updates if location is shown in map and list based on
         * applied filters and bounding box of map
         */
        locationUpdate: function(map, locationLayer) {
            var that = this;
            that.events.trigger('DataManager.locationUpdating');

            var filters = that.getFilters(map);
            $.getJSON(common.getUrl('location-api'), filters, function(data) {
                // Unfortunately we can't just blow away the locations here because that
                // makes the popovers disappear every time you pan, so we have to do it
                // the hard way.

                var locs = that.locations;


                // Mark...
                $.each(locs, function(i, location) {
                    // Only the truely worthy shall survive
                    location._mark = false;
                });

                // Load...
                $.each(data.locations, function(i, location) {
                    var key = location.item.key;
                    if (!locs[key]) {
                        var l = new Location(location);
                        l.setMarker();
                        locationLayer.addLayer(l.getMarker());
                        l._mark = true;
                        locs[key] = l;
                    } else {
                        locs[key]._mark = true;
                    }
                });

                // ...and Sweep
                $.each(locs, function(i, location) {
                    if (location._mark) {
                        delete location._mark;
                    } else {
                        locationLayer.removeLayer(location.getMarker());
                        delete locs[i];
                    }
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
        neighborhoodUpdate: function() {
            var that = this;
            that.events.trigger('DataManager.neighborhoodUpdating');

            var filters = that.getFilters();
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
                return $.getJSON(common.getUrl('neighborhoods-geojson'), function(data) {
                        that.neighborhoods.geojson = data;
                });
            }
        },

        /**
         * Alerts listeners that filter data has changed
         */
        onFilterChange: function() {
            this.events.trigger('DataManager.filtersUpdated');
        },

        /**
         * Gets the current state of location filters for passing into a GET request
         * @param { Leaflet map object to read current bounds from } map
         * @return { query params dict }
         */
        getFilters: function(map) {
            var opts = { },
                $filters = this.$filters;
            $filters.filter(':checked').each(function(idx, elem) {
                opts[elem.id] = elem.checked;
            });
            if (map && map.getBounds) {
                opts.bbox = map.getBounds().toBBoxString();
            }

            return opts;
        },

        /**
         * Map of locations & neighborhoods, key is the id for
         * each object
         */
        locations: null,
        neighborhoods: null,    // Has one key 'data' with a list of neighborhood objects

        /*
         * Available events:
         * neighborhoodUpdating: 'DataManager.neighborhoodUpdating'
         *      triggered when a neighborhood update begins, before the json request is sent
         * neighborhoodUpdated: 'DataManager.neighborhoodUpdated',
         *      triggered when neighborhood data is finished loading
         * locationUpdating: 'DataManager.locationUpdating'
         *      triggered when a location update begins, before the json request is sent
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

