/********************************************************                                           
 * Copyright (c) 2013 Azavea, Inc.                                                                  
 * See LICENSE in the project root for copying permission                                           
 * Settings for cookies used on the CEL site 
 *********************************************************/

define(['jquery', 'celcookie', 'jquery-cookie'], function($, celcookie) {

    'use strict';

    return {
        addFavoriteClickEvent: function(selector) {

        },
        removeFavoriteClickEvent: function(selector) {

        },
        clearFavoritesClickEvent: function(options) {
            var defaults = {
                button: '#faves-clear',
                countspan: '#fav-count',
                container: '.container',
                cookie: celcookie
            };
            var opts = $.extend({}, defaults, options);

            var clearbutton = $(button);
            clearbutton.on('click', function(e) {
                debugger;
                $(countspan).html('0');
                $(container).empty();
                $.removeCookie(opts.cookie.name, opts.cookie.options);
            });
        },
        shareFavoritesClickEvent: function(selector) {

        }
    };
});
