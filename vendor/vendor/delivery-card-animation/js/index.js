'use strict'

$(document).ready(function () {
  var animating = false
  var step1 = 500
  var step2 = 500
  var step3 = 500
  var reqStep1 = 600
  var reqStep2 = 800
  var reqClosingStep1 = 500
  var reqClosingStep2 = 500
  var $scrollCont = $('.phone__scroll-cont')

  function initMap ($card) {
    // my first experience with google maps api, so I have no idea what I'm doing
    var latLngFrom = {lat: 40.7878581, lng: -73.9671309}
    var latLngTo = {lat: 40.746433, lng: -73.9503613}
    var latLngCenter = {
      lat: (latLngFrom.lat + latLngTo.lat) / 2,
      lng: (latLngFrom.lng + latLngTo.lng) / 2
    }
    var themeColor = $card.data('color')

    var map = new google.maps.Map($('.card__map__inner', $card)[0], {
      zoom: 12,
      center: latLngCenter,
      mapTypeId: google.maps.MapTypeId.ROADMAP,
      disableDefaultUI: true
    })

    map.set('styles', [
      {
        'featureType': 'landscape',
        'elementType': 'geometry',
        'stylers': [
          { 'hue': '#00ffdd' },
          { 'gamma': 1 },
          { 'lightness': 100 }
        ]
      }, {
        'featureType': 'road',
        'stylers': [
          { 'lightness': 60 },
          { 'hue': '#006eff' }
        ]
      }
    ])

    var pinImage = new google.maps.MarkerImage(
      'http://chart.apis.google.com/chart?chst=d_map_pin_letter&chld=%E2%80%A2|' + themeColor.slice(1),
      new google.maps.Size(21, 34),
      new google.maps.Point(0, 0),
      new google.maps.Point(10, 34)
    )

    var marker = new google.maps.Marker({
      position: latLngFrom,
      map: map,
      title: 'From',
      icon: pinImage
    })

    var marker = new google.maps.Marker({
      position: latLngTo,
      map: map,
      title: 'To',
      icon: pinImage
    })

    var polylineOpts = new google.maps.Polyline({
      strokeColor: themeColor,
      strokeWeight: 3
    })
    var rendererOptions = {map: map, polylineOptions: polylineOpts, suppressMarkers: true}
    var directionsDisplay = new google.maps.DirectionsRenderer(rendererOptions)

    var request = {
      origin: latLngFrom,
      destination: latLngTo,
      travelMode: google.maps.DirectionsTravelMode.DRIVING
    }

    var directionsService = new google.maps.DirectionsService()
    directionsService.route(request, function (response, status) {
      if (status == google.maps.DirectionsStatus.OK) {
        directionsDisplay.setDirections(response)
      } else {
        console.log('wtf')
      }
    })
  };

  initMap($('.card'))

  $(document).on('click', '.card:not(.active)', function () {
    if (animating) return
    animating = true

    var $card = $(this)
    var cardTop = $card.position().top
    var scrollTopVal = cardTop - 30
    $card.addClass('flip-step1 active')

    $scrollCont.animate({scrollTop: scrollTopVal}, step1)

    setTimeout(function () {
      $scrollCont.animate({scrollTop: scrollTopVal}, step2)
      $card.addClass('flip-step2')

      setTimeout(function () {
        $scrollCont.animate({scrollTop: scrollTopVal}, step3)
        $card.addClass('flip-step3')

        setTimeout(function () {
          animating = false
        }, step3)
      }, step2 * 0.5)
    }, step1 * 0.65)
  })

  $(document).on('click', '.card:not(.req-active1) .card__header__close-btn', function () {
    if (animating) return
    animating = true

    var $card = $(this).parents('.card')
    $card.removeClass('flip-step3 active')

    setTimeout(function () {
      $card.removeClass('flip-step2')

      setTimeout(function () {
        $card.removeClass('flip-step1')

        setTimeout(function () {
          animating = false
        }, step1)
      }, step2 * 0.65)
    }, step3 / 2)
  })

  $(document).on('click', '.card:not(.req-active1) .card__request-btn', function (e) {
    if (animating) return
    animating = true

    var $card = $(this).parents('.card')
    var cardTop = $card.position().top
    var scrollTopVal = cardTop - 30

    $card.addClass('req-active1 map-active')

    initMap($card)

    setTimeout(function () {
      $card.addClass('req-active2')
      $scrollCont.animate({scrollTop: scrollTopVal}, reqStep2)

      setTimeout(function () {
        animating = false
      }, reqStep2)
    }, reqStep1)
  })

  $(document).on('click',
    '.card.req-active1 .card__header__close-btn, .card.req-active1 .card__request-btn',
    function () {
      if (animating) return
      animating = true

      var $card = $(this).parents('.card')

      $card.addClass('req-closing1')

      setTimeout(function () {
        $card.addClass('req-closing2')

        setTimeout(function () {
          $card.addClass('no-transition hidden-hack')
          $card.css('top')
          $card.removeClass('req-closing2 req-closing1 req-active2 req-active1 map-active flip-step3 flip-step2 flip-step1 active')
          $card.css('top')
          $card.removeClass('no-transition hidden-hack')
          animating = false
        }, reqClosingStep2)
      }, reqClosingStep1)
    })
})

// angular used only for templating, I was too tired to find more lightweight solution

var delivcardDefaultData = [
  {id: '2618-3157',
    price: 25,
    requests: 5,
    pledge: 150,
    weight: 50,
    sender: 'Edward Norton',
    senderImg: 'https://s3-us-west-2.amazonaws.com/s.cdpn.io/142996/deliv-sender.jpg',
    themeColor: 'purple',
    themeColorHex: '#BA68C8',
    bgImgUrl: 'https://s3-us-west-2.amazonaws.com/s.cdpn.io/142996/deliv-1.jpg',
    rating: 5,
    ratingCount: 26,
    fromStreet: 'W 90th St',
    fromCity: 'New York, NY 10025',
    toStreet: '46th Ave',
    toCity: 'Woodside, NY 11101',
    delivTime: '06:30 pm',
    delivDate: 'May 16, 2015',
    delivDateNoun: 'Today',
    reqDl: '24 minutes'},
  {id: '2618-3156',
    price: 37,
    requests: 7,
    pledge: 222,
    weight: 66,
    sender: 'Edward Norton',
    senderImg: 'https://s3-us-west-2.amazonaws.com/s.cdpn.io/142996/deliv-sender.jpg',
    themeColor: 'green',
    themeColorHex: '#52A43A',
    bgImgUrl: 'https://s3-us-west-2.amazonaws.com/s.cdpn.io/142996/deliv-2.jpg',
    rating: 4,
    ratingCount: 21,
    fromStreet: 'W 85th St',
    fromCity: 'New York, NY 1025',
    toStreet: 'E 30th Ave',
    toCity: 'New York, NY 1001',
    delivTime: '07:30 am',
    delivDate: 'May 16, 2015',
    delivDateNoun: 'Today',
    reqDl: '33 minutes'},
  {id: '2618-3155',
    price: 12,
    requests: 3,
    pledge: 80,
    weight: 20,
    sender: 'Edward Norton',
    senderImg: 'https://s3-us-west-2.amazonaws.com/s.cdpn.io/142996/deliv-sender.jpg',
    themeColor: 'orange',
    themeColorHex: '#F7AA17',
    bgImgUrl: 'https://s3-us-west-2.amazonaws.com/s.cdpn.io/142996/deliv-3.jpg',
    rating: 5,
    ratingCount: 15,
    fromStreet: 'W 79th St',
    fromCity: 'New York, NY 1024',
    toStreet: 'W 139th Ave',
    toCity: 'New York, NY 1030',
    delivTime: '09:22 pm',
    delivDate: 'May 16, 2015',
    delivDateNoun: 'Today',
    reqDl: '15 minutes'},
  {id: '2618-3154',
    price: 80,
    requests: 25,
    pledge: 550,
    weight: 250,
    sender: 'Edward Norton',
    senderImg: 'https://s3-us-west-2.amazonaws.com/s.cdpn.io/142996/deliv-sender.jpg',
    themeColor: 'red',
    themeColorHex: '#EF5350',
    bgImgUrl: 'https://s3-us-west-2.amazonaws.com/s.cdpn.io/142996/deliv-4.jpg',
    rating: 5,
    ratingCount: 66,
    fromStreet: 'W 90th St',
    fromCity: 'New York, NY 125',
    toStreet: '46th Ave',
    toCity: 'Woodside, NY 11',
    delivTime: '06:30 pm',
    delivDate: 'May 16, 2015',
    delivDateNoun: 'Today',
    reqDl: '24 minutes'},
  {id: '2618-3153',
    price: 49,
    requests: 17,
    pledge: 299,
    weight: 149,
    sender: 'Edward Norton',
    senderImg: 'https://s3-us-west-2.amazonaws.com/s.cdpn.io/142996/deliv-sender.jpg',
    themeColor: 'purple',
    themeColorHex: '#BA68C8',
    bgImgUrl: 'https://s3-us-west-2.amazonaws.com/s.cdpn.io/142996/deliv-5.jpg',
    rating: 5,
    ratingCount: 26,
    fromStreet: 'W 90th St',
    fromCity: 'New York, NY 1025',
    toStreet: '46th Ave',
    toCity: 'Woodside, NY 11101',
    delivTime: '06:30 pm',
    delivDate: 'May 16, 2015',
    delivDateNoun: 'Today',
    reqDl: '24 minutes'},
  {id: '2618-3152',
    price: 99,
    requests: 33,
    pledge: 611,
    weight: 432,
    sender: 'Edward Norton',
    senderImg: 'https://s3-us-west-2.amazonaws.com/s.cdpn.io/142996/deliv-sender.jpg',
    themeColor: 'green',
    themeColorHex: '#52A43A',
    bgImgUrl: 'https://s3-us-west-2.amazonaws.com/s.cdpn.io/142996/deliv-6.jpg',
    rating: 2,
    ratingCount: 26,
    fromStreet: 'W 90th St',
    fromCity: 'New York, NY 1025',
    toStreet: '46th Ave',
    toCity: 'Woodside, NY 11101',
    delivTime: '06:30 pm',
    delivDate: 'May 16, 2015',
    delivDateNoun: 'Today',
    reqDl: '24 minutes'},
  {id: '2618-3151',
    price: 61,
    requests: 15,
    pledge: 318,
    weight: 130,
    sender: 'Edward Norton',
    senderImg: 'https://s3-us-west-2.amazonaws.com/s.cdpn.io/142996/deliv-sender.jpg',
    themeColor: 'orange',
    themeColorHex: '#F7AA17',
    bgImgUrl: 'https://s3-us-west-2.amazonaws.com/s.cdpn.io/142996/deliv-7.jpg',
    rating: 3,
    ratingCount: 26,
    fromStreet: 'W 90th St',
    fromCity: 'New York, NY 10025',
    toStreet: '46th Ave',
    toCity: 'Woodside, NY 11101',
    delivTime: '06:30 pm',
    delivDate: 'May 16, 2015',
    delivDateNoun: 'Today',
    reqDl: '24 minutes'},
  {id: '2618-3150',
    price: 13,
    requests: 9,
    pledge: 231,
    weight: 55,
    sender: 'Edward Norton',
    senderImg: 'https://s3-us-west-2.amazonaws.com/s.cdpn.io/142996/deliv-sender.jpg',
    themeColor: 'red',
    themeColorHex: '#EF5350',
    bgImgUrl: 'https://s3-us-west-2.amazonaws.com/s.cdpn.io/142996/deliv-8.jpg',
    rating: 4,
    ratingCount: 26,
    fromStreet: 'W 90th St',
    fromCity: 'New York, NY 10025',
    toStreet: '46th Ave',
    toCity: 'Woodside, NY 11101',
    delivTime: '06:30 pm',
    delivDate: 'May 16, 2015',
    delivDateNoun: 'Today',
    reqDl: '24 minutes'}
]

var app = angular.module('delivcard', [])
app.controller('DelivCtrl', ['$scope', function ($scope) {
  $scope.cards = delivcardDefaultData
}])
