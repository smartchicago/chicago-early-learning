/********************************************************
 * Copyright (c) 2013 Azavea, Inc.
 * See LICENSE in the project root for copying permission
 * Javascript for setting up stylings, etc. on pages
 ********************************************************/

define(['jquery'], function($) {
    
    'use strict';

    $(document).ready(function(){
        var th;

        $(window).on("resize", function(){
            th = $("#filter-options").height();
            $(".locations-wrapper").css("top", th);
        });
        $('#filter-options').on('shown', function () {
            th = $("#filter-options").height();
            $(".locations-wrapper").animate({
                top: th 
            }, 175);
        });
            
        $('#filter-options').on('hidden', function () {
            th = $("#filter-options").height();
            $(".locations-wrapper").animate({
                top: th
            }, 0);
        });
            
        $('#refineSearch').on('shown', function () {
            $(".locations-wrapper").animate({
                top: th 
            }, 175);
        });
            
        $('#refineSearch').on('hidden', function () {
            $(".locations-wrapper").animate({
                top: 0
            }, 0);
        });
    });
});
