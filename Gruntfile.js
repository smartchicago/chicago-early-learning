module.exports = function(grunt) {
    grunt.initConfig({
        svgstore: {
            options: {
                prefix: 'cel-icon-',
                svg: {
                    viewBox: '0 0 100 100',
                    xmlns: 'http://www.w3.org/2000/svg'
                }
            },
            default: {
                files: {
                    'python/ecep/portal/static/svg/cel-svgs.svg':
                    ['python/ecep/portal/static/svg/cel/*.svg'],
                }
            }
        }
    });
    grunt.loadNpmTasks('grunt-svgstore');
    grunt.registerTask('default', ['svgstore']);
}