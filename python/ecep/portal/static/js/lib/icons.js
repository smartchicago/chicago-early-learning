/********************************************************
 * Copyright (c) 2013 Azavea, Inc.
 * See LICENSE in the project root for copying permission
 * Loads Icons and other things for leaflet
 ********************************************************/

'use strict';

define(['./Leaflet'], function(L) {
    // Return Icons for Leaflet maps
    return {
        schoolIcon: L.icon({
            iconUrl: '/static/img/leaflet-icons/marker-school.png',
            shadowUrl: '/static/img/leaflet-icons/marker-shadow.png',

            iconSize:     [35, 45], // size of the icon
            shadowSize:   [41, 41], // size of the shadow
            iconAnchor:   [10, 60], // point of the icon which will correspond to marker's location
            shadowAnchor: [4, 62],  // the same for the shadow
            popupAnchor:  [10, -60] // point from which the popup should open relative to the iconAnchor
        }),
        homeIcon: L.icon({
            iconUrl: '/static/img/leaflet-icons/marker-home.png',
            shadowUrl: '/static/img/leaflet-icons/marker-shadow.png',

            iconSize:     [35, 45], // size of the icon
            shadowSize:   [41, 41], // size of the shadow
            iconAnchor:   [10, 60], // point of the icon which will correspond to marker's location
            shadowAnchor: [4, 62],  // the same for the shadow
            popupAnchor:  [10, -60] // point from which the popup should open relative to the iconAnchor
        }),
        highlightIcon: L.icon({
            iconUrl: '/static/img/leaflet-icons/marker-highlight.png',
            shadowUrl: '/static/img/leaflet-icons/marker-shadow.png',

            iconSize:     [35, 45], // size of the icon
            shadowSize:   [41, 41], // size of the shadow
            iconAnchor:   [10, 60], // point of the icon which will correspond to marker's location
            shadowAnchor: [4, 62],  // the same for the shadow
            popupAnchor:  [10, -60] // point from which the popup should open relative to the iconAnchor
        })
    };
});

