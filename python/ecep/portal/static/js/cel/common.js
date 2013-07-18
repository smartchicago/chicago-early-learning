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
});
