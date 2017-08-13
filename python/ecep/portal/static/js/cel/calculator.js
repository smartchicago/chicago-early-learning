define(['jquery'],
    function($) {
        'use strict';

        $(document).ready(function() {
            var $month = $('#month'),
                $day = $('#day'),
                $year = $('#year'),
                $infants = $('#programs-infants'),
                $preschool = $('#programs-preschool'),
                $kindergarten = $('#programs-kindergarten'),
                $calculator = $('#calculator');


            function validateDate(month, day, year) {
                return true;
            }

            function calculateProgram(month, day, year) {
                var date = new Date(year, month, day),
                    preschool_cutoff = new Date(2012, 8, 2),
                    infants_cutoff = new Date(2014, 8, 2);

                if ( date > infants_cutoff ) {
                    return $infants;
                } else if ( date < infants_cutoff && date > preschool_cutoff ) {
                    return $preschool;
                } else {
                    return $kindergarten;
                }
            }

            function scrollToProgram($target) {
                $('html, body').animate({
                    scrollTop: $target.offset().top
                }, 500);
            }
            
            /* -- Submit Listener -- */
            $calculator.submit(function(e) {
                var month = parseInt($month.val()) - 1,
                    day = parseInt($day.val()),
                    year = parseInt($year.val());

                e.preventDefault();
                if ( validateDate(month, day, year) ) {
                    var $scroll = calculateProgram(month, day, year);
                    scrollToProgram($scroll);
                }
            });
        });
    }
);