define(['jquery'],
    function($) {
        'use strict';

        $(document).ready(function() {

            var $month = $('#month'),
                $day = $('#day'),
                $year = $('#year-4'),
                $input_two = $('.input-two'),
                $infants = $('#infants-block'),
                $preschool = $('#preschool-block'),
                $kindergarten = $('#kindergarten-block'),
                $over_seven = $('#seven-plus-block'),
                $calculator = $('.calculator'),
                $calculator_block = $('#calculator-block'),
                $error_block = $('#error-block');

            function validateDate(month, day, year) {
                var date = new Date(year, month, day);

                if (year < 1000 || year > 3000 || month < 0 || month > 12 || day > 31) {
                    return false;
                } else if ( isNaN(year) || isNaN(month) || isNaN(day) ) { 
                    return false
                } else if ( typeof date != 'undefined' ) {
                    return true;
                } else {
                    return false;
                }
            }

            function calculateProgram(month, day, year) {
                var date = new Date(year, month, day),
                    kindergarten_cutoff = new Date(2010, 8, 2),
                    preschool_cutoff = new Date(2012, 8, 2),
                    infants_cutoff = new Date(2014, 8, 2);

                if ( date >= infants_cutoff ) {
                    return $infants;
                } else if ( date < infants_cutoff && date >= preschool_cutoff ) {
                    return $preschool;
                } else if ( date < preschool_cutoff && date >= kindergarten_cutoff ) {
                    return $kindergarten;
                } else {
                    return $over_seven;
                }
            }

            function displayProgramBlock($block) {
                $calculator_block.fadeOut(500);
                $block.delay(500).fadeIn(500);
            }

            function resetCalculator(target) {
                var $target = $(target);
                $calculator.find("input[type=text]").val("")
                $target.fadeOut(500);
                $calculator_block.delay(500).fadeIn(500);
            }

            /* -- Focus Listener -- */
            $month.keyup(function() {
                if (this.value.length == 2) {
                    $day.focus();
                }
            });

            $day.keyup(function() {
                if (this.value.length == 2) {
                    $year.focus();
                }
            });
            
            /* -- Submit Listener -- */
            $calculator.submit(function(e) {
                var month = parseInt($month.val()) - 1,
                    day = parseInt($day.val()),
                    year = parseInt($year.val());

                e.preventDefault();
                if ( validateDate(month, day, year) ) {
                    $error_block.hide()
                    var $program = calculateProgram(month, day, year);
                    displayProgramBlock($program);
                } else {
                    $error_block.show();
                }
            });

            /* -- Reset Listener -- */
            $('.calculator-reset').on('click', function(e) {
                var $this = $(this),
                    target = $this.data("block");
                resetCalculator(target);
            });
        });
    }
);
