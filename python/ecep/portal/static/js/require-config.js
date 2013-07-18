/* Sitewide require configuration
 * This file MUST be loaded asynchronously on all pages for require to work
 */

// These settings are mirrored in build.main.js, if you're going to change them check there too
requirejs.config({
    paths: {
        'jquery': '../lib/jquery-1.10.2.min',
        'jquery-ui-autocomplete': '../lib/jquery-ui-1.10.3.autocomplete-only.min',
        'bootstrap': '../lib/bootstrap',
        'Leaflet': '../lib/leaflet',
        'Leaflet-google': '../lib/leaflet-google',
        'async': '../lib/require-plugins/async'
    },
    shim: {
        'jquery-ui-autocomplete': {
            deps: ['jquery'],
            exports: '$'
        },
        'bootstrap': {
            // http://stackoverflow.com/a/13556882/639619
            // Don't use the return value from bootstrap, it should attach stuff to the
            // $ object, require jquery and use it instead
            deps: ['jquery'],
            exports: '$.fn.popover'
        },
        'Leaflet': {
            exports: 'L'
        },
        'Leaflet-google': {
            deps: ['Leaflet'],
            exports: 'L.Google'
        },
        '../lib/response': {
            deps: ['jquery'],
            exports: 'Response',
            init: function ($) {
                return this.Response.noConflict();
            }
        }
    },
    enforceDefine: true
});
