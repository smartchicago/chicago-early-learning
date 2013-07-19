/* Production build parameters for main javascript file
 * To build, run:
 *    node r.js -o build.main.js
 * Then perhaps `manage.py collectstatic`
 */

// Beware, some of these parameters are duplicated in debug mode in base.html and main.js
({
    // See http://requirejs.org/docs/optimization.html
    // and https://github.com/jrburke/r.js/blob/master/build/example.build.js
    // for docs.

    appDir: 'cel',
    dir: 'cel-build',
    
    // By default load any module IDs from js/lib
    baseUrl: '../lib',
    
    // Build output file
    // out: 'main.min.js',
    
    // Modules to optimize into out file
    // include: ['main'],
    
    // Modules to exclude from optimization (usually large, already minified libraries)
    exclude: ['jquery'],
    
    // If the module ID starts with 'cel',
    // load it from the js/cel directory. paths
    // config is relative to the baseUrl, and
    // never includes a '.js' extension since
    // the paths config could be for a directory.
    paths: {
        jquery: 'jquery-1.10.2.min',
        common: '../cel/common'
    },
    
    modules: [
        {
            name: 'common',
            include: 'common'
        }
    ]
})
