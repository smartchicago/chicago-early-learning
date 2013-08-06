/* This is the main entry point for logic for the search.html page
 */

'use strict';

require(['jquery', CEL.serverVars.gmapRequire], function($) {
    console.debug('search.js loaded!');

    // More/Less button toggle
    $('.more-less-btn').click(function() {
        $(this).toggleClass('active');
        $(this).html($(this).html() == 'More' ? 'Less' : 'More');
    });

    //Favorite star toggle
    $('img.fave-star').click(function () {
       if ($(this).hasClass('checked')){
           $(this).attr('src','img/icons/star-empty.svg').removeClass('checked');
       } else {
           $(this).attr('src','img/icons/star.svg').addClass('checked');
       }
       var favCount = $('.fave-star.checked').length;
       $('.search-fav-count').html(favCount);
    });


    // Chevron change
    $('#refineBtn').click(function() {
        $(this).find('i').toggleClass('icon-down-open icon-right-open');
    });
		
		

    //Slidepanel
    $(document).ready(function(){
        var $filterOptions = $('#filter-options'),
            $refineSearch = $('#refine-search'),
            getHeight = function() { return $filterOptions.height(); },
            animateLocationWrappers = function(top, duration) {
                $('.locations-wrapper').animate({
                    top: top
                }, duration);
            };

        $('.locations-wrapper').css('top', getHeight());

        $(window).on('resize', function(){
            $('.locations-wrapper').css('top', getHeight());
        });

        $('[data-slidepanel]').slidepanel({
            orientation: 'right',
            mode: 'overlay'
        });

        $filterOptions.on('shown', function () {
            animateLocationWrappers(getHeight(), 175);
        });

        $filterOptions.on('hidden', function () {
            animateLocationWrappers(getHeight(), 0);
        });

        $refineSearch.on('shown', function () {
            animateLocationWrappers(getHeight(), 175);
        });

        $refineSearch.on('hidden', function () {
            animateLocationWrappers(0, 0);
        });
				
    });
});

