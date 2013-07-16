/* Main app file for CEL project
 * Mostly stolen from requirejs examples: http://requirejs.org/docs/api.html
 */

'use strict';

requirejs.config({
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

define(['jquery'], function($) {
    // This is the main entry point.  In order to add modules that get loaded, make a new file in
    // ../cel, and load it by adding it to the args above (both in the array and function)
    // for example, to define module foo:
    //
    // Add the file ../cel/foo.js
    //
    // Put this in it:
    // define(['dep1', 'dep2'], function(dep1, dep2) {
    //     // foo body
    //     return something;
    // });
    //
    // Then load it above by modifying the line above:
    // require(['jquery', 'foo'], function($, foo) {
    //
    // parameter foo gets assigned the return value of the function in define()
    // 
    // See http://requirejs.org/docs/api.html for details
    console.debug('main.js loaded!');
    if (typeof $ !== 'undefined') {
        console.debug('jquery loaded!');
    }
});