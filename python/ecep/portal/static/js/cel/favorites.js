/********************************************************                                           
 * Copyright (c) 2013 Azavea, Inc.                                                                  
 * See LICENSE in the project root for copying permission                                           
 * Module for working with starred locations
 *  add/remove locations and add
 *      listeners for sharing/clearing/toggling favorites
 *********************************************************/

define(['jquery', 'cel-cookie', 'jquery-cookie'], function($, celcookie) {

    'use strict';

    return {

        /*
         * Store a reference here so we don't have to pass it around
         */
        cookie: celcookie,

        /* 
         * Given a location id, adds the location id to the correct cookie 
         */
        addIdToCookie: function(id) {
            var cookie = this.cookie,
                cookieString = $.cookie(cookie.name);

            if (cookieString) {
                var idArray = cookieString.split(','),
                arrayLen = idArray.length,
                idExists = false;
   
                // only add id if it doesn't exist in the cookie already
                for (var i = 0; i < arrayLen; i++) {
                    if (id === idArray[i]) {
                        idExists = true;
                        break;
                    }
                }
                if (!idExists) {
                    idArray.push(id);
                }

                cookieString = idArray.join(',');
            } else {
                cookieString = id;
            }

            //console.log("favorites.add():", id, cookieString);
            $.cookie(cookie.name, cookieString, cookie.options);
        },

        /* 
         * Given a location id, removes the location id from the correct cookie 
         */
        removeIdFromCookie: function(id) {
            var cookie = this.cookie,
                cookieString = $.cookie(cookie.name);
            if (!cookieString) {
                return;
            }

            var idArray = cookieString.split(','),
                arrayLen = idArray.length;

            for (var i = 0; i < arrayLen; i++) {
                var currentId = idArray[i];
                if (id === currentId) {
                    idArray.splice(i, 1);
                }
            }
            
            cookieString = idArray.join(',');
            //console.log("favorites.remove():", id, cookieString);
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
            };
            var opts = $.extend({}, defaults, options),
                self = this,
                cookie = $.cookie(this.cookie.name);

            if (cookie) {
                var starredIds = cookie.split(','),
                    starredIdsLength = starredIds.length,
                    starredId = 0;
               
                // toggle any buttons for starred locations to on state
                for (var i = 0; i < starredIdsLength; i++) {
                    starredId = starredIds[i];
                    this.toggle($('#favs-toggle-loc-' + starredId));
                }
            }
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
            };
            var opts = $.extend({}, defaults, options),
                buttonImg = $elt.children('img'),
                buttonId = $elt.attr(opts.idAttribute),
                img = '',
                increment = 0;

            // toggle off
            if ($elt.hasClass(opts.selectedClass)) {
                img = 'star-empty.svg';
                this.removeIdFromCookie(buttonId);
                increment = -1;
            // toggle on
            } else {
                img = 'star.svg';
                this.addIdToCookie(buttonId);
                increment = 1;
            }

            buttonImg.attr('src', opts.imgpath + img);
            $elt.toggleClass(opts.selectedClass);
            var $favbutton = $('.fav-count');
            $favbutton.html(parseInt($favbutton.html(), 10) + increment);
        },

        /*
         * Adds a click listener for toggling a favorite on/off to the button specified 
         *      in the options object.
         */
        addToggleListener: function(options) {
            var defaults = {
                button: '.faves-add'
            };
            var opts = $.extend({}, defaults, options),
                self = this;

            // toggle the button/cookie state
            var button = $(opts.button);
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
            };
            var opts = $.extend({}, defaults, options),
                self = this;

            var clearbutton = $(opts.button);
            clearbutton.on('click', function(e) {
                $(opts.countspan).html('0');
                $(opts.container).empty();
                $.removeCookie(self.cookie.name, self.cookie.options);
            });
        },

        /*
         * Adds a click listener to the specified selector for sharing current favorites.
         */
        addShareListener: function(options) {
            var defaults = {
                button: '.faves-share'
            };
            var opts = $.extend({}, defaults, options),
                self = this;

            var sharebutton = $(opts.button);
            sharebutton.on('click', function(e) {
                // TODO: Implement sharing as part of share scrum card
            });
        }
    };
});
