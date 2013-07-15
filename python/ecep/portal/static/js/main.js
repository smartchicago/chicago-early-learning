/* Main app file for CEL project
 * Mostly stolen from requirejs examples: http://requirejs.org/docs/api.html
 */

'use strict';
 
requirejs.config({
    //By default load any module IDs from js/lib
    baseUrl: (window && window.cel_baseUrl) || 'static/js/lib',
    //except, if the module ID starts with 'app',
    //load it from the js/app directory. paths
    //config is relative to the baseUrl, and
    //never includes a '.js' extension since
    //the paths config could be for a directory.
    paths: {
        cel: '../cel',
        jquery: 'jquery-1.10.2.min'
    }
});

require(['jquery'], function($) {
    console.debug('main.js loaded!');
    if (typeof $ !== 'undefined') {
        console.debug('jquery loaded!');
    }
});