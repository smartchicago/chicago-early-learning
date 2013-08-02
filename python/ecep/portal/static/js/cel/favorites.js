/********************************************************                                           
 * Copyright (c) 2013 Azavea, Inc.                                                                  
 * See LICENSE in the project root for copying permission                                           
 * Module for working with starred locations
 *  add/remove locations and add
 *      listeners for sharing/clearing/toggling favorites
 *********************************************************/

define(['jquery', 'cel-cookie', 'jquery-cookie'], function($, celcookie) {

    'use strict';

    var favs = {

        /*
         * Store a reference here so we don't have to pass it around
         */
        cookie: celcookie,

        /*
         * Get the favorites cookie
         */
        getCookie: function() {
            return $.cookie(favs.cookie.name) || "";
        },

        /*
         * Input: string id
         * Output: true if input in cookie, else false
         */
        isStarred: function(id) {
            if (!id) {
                return false;
            }
            id = parseInt(id, 10);
            var cookie = favs.getCookie(),
                idArray = cookie.split(',').map(function(x) { return parseInt(x, 10); });
            return (idArray.indexOf(id) >= 0); 
        },

        /* 
         * Given a location id, adds the location id to the correct cookie 
         */
        addIdToCookie: function(id) {
            if (!id) {
                return;
            }

            var cookie = favs.cookie,
                cookieString = favs.getCookie(),
                idArray,
                arrayLen,
                idExists;

            if (cookieString) {
                idArray = cookieString.split(',');
                arrayLen = idArray.length;
                idExists = false;
   
                // only add id if it doesn't exist in the cookie already
                for (var i = 0; i < arrayLen; i++) {
                    if (id == idArray[i]) {
                        idExists = true;
                        break;
                    }
                }
                if (!idExists) {
                    idArray.push(id);
                }

                idArray = $.grep(idArray, function (x) { return x !== ""; });
                cookieString = idArray.join(',');
            } else {
                cookieString = id;
            }

            $.cookie(cookie.name, cookieString, cookie.options);
        },

        /* 
         * Given a location id, removes the location id from the correct cookie 
         */
        removeIdFromCookie: function(id) {
            if (!id) {
                return;
            }
            var cookie = favs.cookie,
                cookieString = favs.getCookie(),
                idArray,
                arrayLen,
                currentId;

            if (!cookieString) {
                return;
            }

            idArray = cookieString.split(',');
            arrayLen = idArray.length;

            for (var i = 0; i < arrayLen; i++) {
                currentId = idArray[i];
                if (id == currentId) {
                    idArray.splice(i, 1);
                }
            }
            
            cookieString = idArray.join(',');
            $.cookie(cookie.name, cookieString, cookie.options);
        },

        /*
         * Sync the view with a set cookie on page load
         *  
         * Properly sets buttons for all starred locations
         */
        syncUI: function(options) {
            var defaults = {
                    button: '#faves-clear',
                    countspan: '#fav-count',
                    container: '.container'
                },
                opts = $.extend({}, defaults, options),
                self = favs,
                cookie = favs.getCookie(),
                starredIds, 
                starredIdsLength, 
                starredId;

            starredIds = cookie ? cookie.split(',') : [];
            starredIdsLength = starredIds.length;
            starredId = 0;
            
            // toggle any buttons for starred locations to on state
            for (var i = 0; i < starredIdsLength; i++) {
                starredId = starredIds[i];
                favs.toggle($('#favs-toggle-loc-' + starredId));
            }
            $('.fav-count').html(starredIdsLength);
        },

        /*
         * Toggles the state of whatever element is passed to it,
         *      calling the add/removeIdFromCookie functions to ensure the cookie remains in sync
         *
         * Optional options argument allows for changing some of the default settings
         */
        toggle: function($elt, options) {
            var defaults = {
                    imgpath: '/static/img/icons/',
                    idAttribute: 'data-loc-id',
                    selectedClass: 'favs-button-selected'
                }, 
                opts = $.extend({}, defaults, options),
                buttonImg = $elt.children('img'),
                buttonId = $elt.attr(opts.idAttribute),
                img = '',
                increment = 0,
                $favbutton;

            // toggle off
            if ($elt.hasClass(opts.selectedClass)) {
                img = 'star-empty.svg';
                favs.removeIdFromCookie(buttonId);
                increment = -1;
                $elt.attr('data-hint', gettext('Click to star location'));
            // toggle on
            } else {
                img = 'star.svg';
                favs.addIdToCookie(buttonId);
                increment = 1;
                $elt.attr('data-hint', gettext('Click to remove star from location'));
            }

            buttonImg.attr('src', opts.imgpath + img);
            $elt.toggleClass(opts.selectedClass);
            $favbutton = $('.fav-count');
            $favbutton.html(parseInt($favbutton.html(), 10) + increment);
        },

        /*
         * Adds a click listener for toggling a favorite on/off to the button specified 
         *      in the options object.
         */
        addToggleListener: function(options) {
            var defaults = {
                    button: '.faves-add'
                },
                opts = $.extend({}, defaults, options),
                self = favs,
                button = $(opts.button);

            // toggle the button/cookie state
            button.on('click', function(e) {
                self.toggle($(this));
            });
        },

        /*
         * Adds a click listener to the specified selector for clearing all favorites
         *      from the cookie.
         */
        addClearListener: function(options) {
            var defaults = {
                    button: '#faves-clear',
                    countspan: '.fav-count',
                    container: '.container'
                },
                opts = $.extend({}, defaults, options),
                self = favs,
                clearbutton = $(opts.button);

            clearbutton.on('click', function(e) {
                $(opts.countspan).html('0');
                $(opts.container).empty();
                $.removeCookie(self.cookie.name, self.cookie.options);
            });
        },

        /*
         * Initializes a share modal with the stored favorites information
         */
        initShareModal: function() {
            // we talked about modifying this module to keep id state in memory in
            // addition to using a cookie. when that's implemented, this function
            // should be modified to use that in-memory data.
            var ids = favs.getCookie() || '',
                count = ids.split(',').length;

            $('#share-modal').trigger('init-modal', {
                // the url is passed in to the sharing urls, so it must be absolute
                url: document.location.origin + '/starred/' + ids  + '/',
                title: 'I just starred ' + count + ' locations'
            });
        },

        /*
         * Adds a click listener to the specified selector for sharing current favorites.
         */
        addShareListener: function(options) {
            var defaults = {
                    button: '#faves-share'
                },
                opts = $.extend({}, defaults, options),
                self = favs,
                sharebutton = $(opts.button);

            sharebutton.on('click', favs.initShareModal);
        }
    };
    return favs;
});
