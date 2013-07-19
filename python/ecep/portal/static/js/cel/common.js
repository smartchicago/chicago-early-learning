/* Main app file for CEL project
 * Mostly stolen from requirejs examples: http://requirejs.org/docs/api.html
 */

'use strict';

define(['jquery', 'Leaflet', '../lib/response', 'bootstrap', 'Leaflet-google'], function($, L, Response) {
    // See http://requirejs.org/docs/api.html for details
    console.debug('common.js loaded!');
    if ($) {
        console.debug('jquery loaded!');
    }
    if ($.fn.popover) {
        console.debug('bootstrap loaded!');
    }
    if (L) {
        console.debug('Leaflet loaded!');
    }
    if (Response) {
        console.debug('Response loaded!');
    }
    if (L.Google) {
        console.debug('Leaflet-google loaded!');
    }

    // Tooltips for all!  Anything w/ a tooltip tag gets a tooltip
    $("[rel='tooltip']").tooltip();

    // Setup Response stuff
    Response.create({ mode: 'markup', prefix: 'r', breakpoints: [0,480,767,1024] });
    Response.create({ mode: 'src',  prefix: 'src', breakpoints: [0,480,767,1024] });

    // geolocation                                                                                  
    $(document).ready(function() {
        $('.geolocation-button').bind('click', function(e) {                                                   
            if ("geolocation" in navigator) {                                                           
                navigator.geolocation.getCurrentPosition(function(position) {                           
                    var positionString = position.coords.latitude + ", " + position.coords.longitude;   
                    // TODO:    load browse.html with the map centered on geolocated position           
                    //          at a respectable zoom level                                             
                    // placeholder for above TODO                                                       
                    $('#appendedInputButton').val(positionString);                                      
                });                                                                                     
            } else {                                                                                    
                alert('Geolocation not available on your browser.');                                    
            }                                                                                           
        });
    });
});
