!function ($) {
  "use strict";
  // version: 1.4
  // by Mattia Larentis - follow me on twitter! @SpiritualGuru

  $.fn.toggleButtons = function (opt) {
    var $element
      , $labelEnabled
      , options
      , active
      , styleActive
      , styleDisabled
      , animationCss
      , transitionSpeed = 0.05
      , defaultSpeed = 0.05;

    this.each(function () {
      $element = $(this);

      options = $.extend({}, $.fn.toggleButtons.defaults, opt);

      $element.attr("data-enabled", options.label.enabled === undefined ? "ON" : options.label.enabled);
      $element.attr("data-disabled", options.label.disabled === undefined ? "OFF " : options.label.disabled);

      $element.addClass('toggle-button');

      $labelEnabled = $('<label></label>').attr('for', $element.find('input').attr('id'));
      $element.append($labelEnabled);

      if (options.animated) {
        $element.addClass('toggle-button-animated');

        if (options.transitionSpeed !== undefined)
          if (/^(\d*%$)/.test(options.transitionSpeed))  // is a percent value?
            transitionSpeed = defaultSpeed * parseInt(options.transitionSpeed) / 100;
          else
            transitionSpeed = options.transitionSpeed;

        animationCss = ["-webkit-", "-moz-", "-o-", ""];
        $(animationCss).each(function () {
          $element.find('label').css(this + 'transition', 'all ' + transitionSpeed + 's');
        });
      }

      $element.css('width', options.width);

      active = $element.find('input').is(':checked');

      if (!active)
        $element.addClass('disabled');

      styleActive = options.style.enabled === undefined ? "" : options.style.enabled;
      styleDisabled = options.style.disabled === undefined ? "" : options.style.disabled;

      if (active && styleActive !== undefined)
        $element.addClass(styleActive);
      if (!active && styleDisabled !== undefined)
        $element.addClass(styleDisabled);

      $element.on('click', function (e) {
        if ($(e.target).is('input'))
          return true;

        e.stopPropagation();
        $(this).find('label').click();
      });


      $element.find('label').on('click', function (e) {
        e.stopPropagation();
        e.preventDefault();

        $element = $(this).parent();

        $element
          .delay(transitionSpeed * 500).queue(function () {
            $(this).toggleClass('disabled')
              .toggleClass(styleActive)
              .toggleClass(styleDisabled)
              .dequeue();
          });

        active = !($element.find('input').is(':checked'));

        $element.find('input').attr('checked', active);
        options.onChange($element, active, e);
      });
    });
  };

  $.fn.toggleButtons.defaults = {
    onChange: function () {
    },
    width: 100,
    animated: true,
    transitionSpeed: undefined,
    label: {
      enabled: undefined,
      disabled: undefined
    },
    style: {
      enabled: undefined,
      disabled: undefined
    }
  };
}($);