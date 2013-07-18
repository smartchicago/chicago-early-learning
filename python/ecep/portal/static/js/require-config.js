/* Sitewide require configuration
 * This file MUST be loaded asynchronously on all pages for require to work
 */

requirejs.config({
    //except, if the module ID starts with 'app',
    //load it from the js/app directory. paths
    //config is relative to the baseUrl, and
    //never includes a '.js' extension since
    //the paths config could be for a directory.
    paths: {
        jquery: '../lib/jquery-1.10.2.min',
        bootstrap: '../lib/bootstrap',
        Leaflet: '../lib/leaflet',
        'Leaflet-google': '../lib/leaflet-google'
    },
    shim: {
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
