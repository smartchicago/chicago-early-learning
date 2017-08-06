/* Sitewide require configuration
 * This file MUST be loaded asynchronously on all pages for require to work
 */

// These settings are mirrored in build.main.js, if you're going to change them check there too
requirejs.config({
    paths: {
        jquery: '../lib/jquery-1.10.2.min',
        'jquery-ui': '../lib/jquery-ui-1.10.3.autocomplete-only.min',
        'jquery-cookie': '../lib/jquery.cookie',
        bootstrap: '../lib/bootstrap',
        Leaflet: '../lib/leaflet',
        'leaflet-providers': '../lib/leaflet-providers',
        Handlebars: '../lib/handlebars',
        async: '../lib/require-plugins/async',
        text: '../lib/require-plugins/text',
        topojson: '../lib/topojson',
        styling: '../lib/styling',
        history: '../lib/native.history',
        Clipboard: '../lib/clipboard.min'
    },
    shim: {
        'jquery-ui': {
            deps: ['jquery'],
            exports: '$'
        },
        history: {
            exports: 'History'
        },
        bootstrap: {
            // http://stackoverflow.com/a/13556882/639619
            // Don't use the return value from bootstrap, it should attach stuff to the
            // $ object, require jquery and use it instead
            deps: ['jquery'],
            exports: '$.fn.popover'
        },
        Leaflet: {
            exports: 'L'
        },
        'leaflet-providers': {
            deps: ['Leaflet'],
            exports: 'L'
        },
        '../lib/response': {
            deps: ['jquery'],
            exports: 'Response',
            init: function ($) {
                return this.Response.noConflict();
            }
        },
        Handlebars: {
            exports: 'Handlebars'
        },
        topojson: {
            exports: 'topojson'
        }
    },
    enforceDefine: true
});
