//Tooltips 
$(function () {
    $("[rel='tooltip']").tooltip({
      placement : 'bottom'
    });
});


// Responsive stuff
// response.js
(function() {
	Response.create({ mode: 'markup', prefix: 'r', breakpoints: [0,480,767,1024] });
	Response.create({ mode: 'src',  prefix: 'src', breakpoints: [0,480,767,1024] });
})();


// Leaflet stuff
// leaflet.js
var map = L.map('map').setView([41.88, -87.62], 12);

L.tileLayer('http://a.tiles.mapbox.com/v3/azavea.map-3kktou80/{z}/{x}/{y}.png', {
    attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, Imagery &copy; <a href="http://www.mapbox.com">Mapbox</a>',
    maxZoom: 18
}).addTo(map);

var homeIcon = L.icon({
    iconUrl: 'js/images/marker-home.png',
    shadowUrl: 'js/images/marker-shadow.png',

    iconSize:     [35, 45], // size of the icon
    shadowSize:   [41, 41], // size of the shadow
    iconAnchor:   [10, 60], // point of the icon which will correspond to marker's location
    shadowAnchor: [4, 62],  // the same for the shadow
    popupAnchor:  [-3, -76] // point from which the popup should open relative to the iconAnchor
});

L.marker([41.883852, -87.632061], {icon: homeIcon}).addTo(map);

var schoolIcon = L.icon({
    iconUrl: 'js/images/marker-school.png',
    shadowUrl: 'js/images/marker-shadow.png',

    iconSize:     [35, 45], // size of the icon
    shadowSize:   [41, 41], // size of the shadow
    iconAnchor:   [10, 60], // point of the icon which will correspond to marker's location
    shadowAnchor: [4, 62],  // the same for the shadow
    popupAnchor:  [-3, -76] // point from which the popup should open relative to the iconAnchor
});

L.marker([41.843811, -87.686763], {icon: schoolIcon}).addTo(map).bindPopup("<strong>YMCA Rauner Family</strong><br>2700 S. Western Ave., Chicago, IL 60608");

var popup = L.popup();


// More/Less button toggle
$('.more-less-btn').click(function() {
	$(this).toggleClass("active");
	$(this).html($(this).html() == "More" ? "Less" : "More");
});




//Favorite star toggle
$("img.fave-star").click(function () {
   if ($(this).hasClass("checked")){
     $(this).attr("src","img/icons/star-empty.svg").removeClass("checked");
   } else {
     $(this).attr("src","img/icons/star.svg").addClass("checked");
   }
   var favCount = $('.fave-star.checked').length;
   $('.search-fav-count').html(favCount);
});


// Chevron change
$('#refineBtn').click(function() {
    $(this).find("i").toggleClass("icon-chevron-down icon-chevron-right");
});





//Slidepanel
$(document).ready(function(){
  var th = $("#filter-options").height();
  $(".locations-wrapper").css("top", th);

  $(window).on("resize", function(){
    th = $("#filter-options").height();
    $(".locations-wrapper").css("top", th);
  });

  $('[data-slidepanel]').slidepanel({
    orientation: 'right',
    mode: 'overlay'
  });

  $('#filter-options').on('shown', function () {
    th = $("#filter-options").height();
    $(".locations-wrapper").animate({
      top: th 
    }, 175);
  });

  $('#filter-options').on('hidden', function () {
    th = $("#filter-options").height();
    $(".locations-wrapper").animate({
      top: th
    }, 0);
  });

    $('#refineSearch').on('shown', function () {
  $(".locations-wrapper").animate({
    top: th 
  }, 175);
});

  $('#refineSearch').on('hidden', function () {
    $(".locations-wrapper").animate({
      top: 0
    }, 0);
  });

});