/* global _, $, google, moment */
"use strict";

var API_ENDPOINT = 'https://comp680team4.herokuapp.com/api/';
var DEBUG = false;

// If running locally, use the local API endpoint
if (window.location.href === 'http://localhost:8888/') {
  API_ENDPOINT = 'http://localhost:8888/api/';
}

if (DEBUG) {
  API_ENDPOINT += 'test/';
}

// var WINDOW_START = new Date(Date.now() + 0); // current time
// WINDOW_START.setHours(WINDOW_START.getHours() + 1); // Set to the next hour
// WINDOW_START.setMinutes(0); // Set the minutes to 0
// WINDOW_START.setSeconds(0); // Set the seconds to 0
// WINDOW_START.setMilliseconds(0);  // Set the milliseconds to 0
// var WINDOW_END = new Date(WINDOW_START.valueOf() + (60 * 60 * 1000 * 72)); // 72 hours from now
// var WINDOW_INCREMENT = 60 * 60 * 1000; // 1 hour in milliseconds
var DATETIME_FORMAT = 'dddd, MMMM Do [at] h:mm a';
var HOUR_START = 6; // earliest time to start trip
var HOUR_END = 20; // latest time to start trip

/**
 * Get the duration (with traffic) from a DirectionsResult object
 *
 * @param  {Object} response DirectionsResult object
 * @return {string}          Duration in traffic
 */
function getDuration(response) {
  return response.routes[0].legs[0].duration_in_traffic;
}

/**
 * Get the estimated travel time between two locations at a given date and time
 *
 * @param  {DirectionsService} directionsService DirectionsService object
 * @param  {string} startLocation     Start location
 * @param  {string} endLocation       End location
 * @param  {Date} dateTime            Departure time
 * @return {Object}                   Result object
 */
function getEstimatedTravelTime(directionsService, startLocation, endLocation, dateTime) {
  console.log('Getting estimated travel time for a ' + moment(dateTime).format(DATETIME_FORMAT) + ' departure');
  return new Promise(function (resolve, reject) {
    directionsService.route({
      origin: startLocation,
      destination: endLocation,
      travelMode: 'DRIVING',
      provideRouteAlternatives: false,
      drivingOptions: {
        departureTime: dateTime,
        trafficModel: 'bestguess'
      }
    }, function (response, status) {
      if (status === 'OK') {
        console.log('Got the estimated travel time for a ' + moment(dateTime).format(DATETIME_FORMAT) + ' departure');

        // upon successful request, resolve response
        resolve({
          dateTime: dateTime,
          response: response,
          duration: getDuration(response).value,
          durationText: getDuration(response).text
        });
        // resolve(response);
      } else if (status === 'OVER_QUERY_LIMIT') {
        console.error('Over query limit');
        // Temporarily resolve the promise so that Promise.all doesn't fail
        resolve({
          dateTime: dateTime,
          response: {},
          duration: Infinity,
          durationText: 'Infinity'
        });
      } else {
        // else reject with status
        reject(status);
      }
    });
  });
}

function showDebugTable(results) {
  console.log('Departure time\t\t\t\t\t\t\tDuration');
  var table = '<table id="debugTable" class="table table-sm table-bordered table-striped table-hover"><thead class="thead-dark"><tr><th scope="col">Departure time</th><th scope="col">Duration</th></tr></thead><tbody>';
  results.forEach(function (result) {
    console.log(moment(result.dateTime).format(DATETIME_FORMAT) + '\t\t\t\t' + result.durationText);
    table += '<tr><td>' + moment(result.dateTime).format('L - LT') + '</td><td>' + result.durationText + '</td></tr>';
  });
  table += '</tbody></table>';
  $('#output').after(table);
}

/**
 * Run the algorithm to determine the time of day / day of week that will give
 * you the shortest estimated travel time with traffic for a given trip
 *
 * @param  {DirectionsService} directionsService DirectionsService object
 * @param  {DirectionsDisplay} directionsDisplay DirectionsDisplay object
 */
function runAlgorithm(directionsService, directionsDisplay) {
  var startLocation = document.getElementById('start').value;
  var endLocation = document.getElementById('end').value;

  $('#output').html('<div class="alert alert-secondary">Running...</div>');
  $('body').addClass('running');

  console.log("Running algorithm");
  console.log("Start location:\t" + startLocation);
  console.log("End location:\t" + endLocation);

  $.ajax({
    url: API_ENDPOINT + "getShortestTravelTime",
    method: "GET",
    data: {
      "startLocation": startLocation,
      "endLocation": endLocation,
    }
  })
    .done(function (results) {
      console.log('Results');
      console.log(results);

      console.log('Finding the shortest duration');
      var bestTravelTime = _.min(results, 'duration');
      console.log(bestTravelTime);

      var startTime = new Date(bestTravelTime.dateTime);

      if (DEBUG) {
        // Ensure startTime is a future value 
        startTime = new Date(Date.now());
      }

      // Note: Can't use directionsDisplay.setDirections(bestTravelTime.response)
      // since the Google Maps Web API response is not compatible with DirectionsDisplay
      getEstimatedTravelTime(directionsService, startLocation, endLocation, startTime)
        .then(function (output) {
          $('body').addClass('results').removeClass('running');
          // $('#map').addClass('small');
          console.log(output);

          // Remove manually added start and end location markers
          if (markerStartLocation) {
            markerStartLocation.setMap(null);
          }
          if (markerEndLocation) {
            markerEndLocation.setMap(null);
          }

          directionsDisplay.setDirections(output.response);

          // showDebugTable(_.first(_.sortBy(results, 'duration'),5));
          // showDebugTable(results);
          drawChart(results);

          $('#output').html('<div class="alert alert-success">The best time to leave is <strong>' + moment(bestTravelTime.dateTime).format(DATETIME_FORMAT) + '</strong>.<br>Your travel time will be ' + bestTravelTime.durationText + ' with traffic.</div>');


        }, function (err) {
          $('#output').html('<div class="alert alert-danger">Uh oh: ' + err + '</div>');
        });
    })
    .fail(function (jqXHR, textStatus, o) {
      // catch any error that happened along the way
      console.error("ERROR: " + textStatus);
      console.log(jqXHR);
      $('#output').html('<div class="alert alert-danger">Uh oh: ' + textStatus + '</div>');
    });
}

var map;
var markerStartLocation;
var markerEndLocation;

/**
 * Update a marker
 *
 * @param {google.maps.Marker} marker
 * @param {google.maps.Place} place
 * @param {string} label
 * @returns {google.maps.Marker} marker
 */
function updateMarker(marker, place, label) {
  if (marker) {
    marker.setMap(null);
  }
  return new google.maps.Marker({
    map: map,
    position: place.geometry.location,
    label: label
  });
}

/**
 * Listener for autocomplete place_changed event
 *
 * Based on https://developers.google.com/maps/documentation/javascript/examples/places-autocomplete
 */
function autocompletePlaceChangedListener(autocomplete, map, label) {
  var place = autocomplete.getPlace();
  var selector = '';

  if (label === 'A') {
    selector = '#start';
  } else {
    selector = '#end';
  }

  if (!place.geometry) {
    // User entered the name of a Place that was not suggested and
    // pressed the Enter key, or the Place Details request failed.
    // window.alert("No details available for input: '" + place.name + "'");
    $('.invalid-feedback', $(selector).parent()).remove();
    $(selector).addClass('is-invalid').after('<div class="invalid-feedback">Unknown location. Please choose a suggestion from the autocomplete.</div>');
    return;
  }

  var bounds = map.getBounds();
  bounds = bounds.extend(place.geometry.location);
  map.fitBounds(bounds);

  if (label === 'A') {
    markerStartLocation = updateMarker(markerStartLocation, place, label);
  } else {
    markerEndLocation = updateMarker(markerEndLocation, place, label);
  }
  $(selector).removeClass('is-invalid').addClass('is-valid');
}

/**
 * Draw a chart of the trip durations
 *
 * @param {object} data
 */
function drawChart(data) {
  var dataTable = new google.visualization.DataTable();
  dataTable.addColumn('datetime', 'Departure Time');
  dataTable.addColumn('number', 'Duration (minutes)');
  dataTable.addColumn({ type: 'string', role: 'style' });

  var bestTravelTime = _.min(data, 'duration');
  var apiDataTable = [];
  data.forEach(response => {
    var style = '';
    var responseDateTime = new Date(response.dateTime);
    if (responseDateTime.getHours() < HOUR_START || responseDateTime.getHours() > HOUR_END) {
      style = 'fill-color: gray';
    }
    if (response.dateTime === bestTravelTime.dateTime) {
      style = 'red';
    }
    apiDataTable.push([responseDateTime, round(response.duration / 60.0, 1), style]);
  });

  var minDuration = round(bestTravelTime.duration / 60.0, 1);
  var maxDuration = round(_.max(data, 'duration').duration / 60.0, 1);

  dataTable.addRows(apiDataTable);
  // var dataTable = new google.visualization.arrayToDataTable(apiDataTable);


  var options = {
    // title: 'Departure Time',
    explorer: {},
    animation: {
      duration: 1000,
      easing: 'out',
      startup: true
    },
    chartArea: {
      width: '85%',
      top: '5%',
      left: '5%',
      right: '1%',
      bottom: '15%',
    },
    hAxis: {
      title: 'Departure Day/Time',
      format: 'MMM d ha',
      gridlines: {
        count: -1,
        units: {
          days: { format: ['MMM d'] },
          hours: { format: ['HH:mm', 'ha'] },
        }
      },
      minorGridlines: {
        units: {
          hours: { format: ['ha'] },
          minutes: { format: ['HH:mm a Z', ':mm'] }
        }
      }
    },
    vAxis: {
      title: 'Travel Time (minutes)',
      viewWindow: {
        min: minDuration - (minDuration * 0.1),
        max: maxDuration + (maxDuration * 0.05)
      },
    },
    bar: {
      groupWidth: "85%"
    },
    legend: { position: 'none' }
  };

  $('#graph').removeClass('d-none');

  // var chart = new google.charts.Bar(document.getElementById('graph'));
  // chart.draw(dataTable, google.charts.Bar.convertOptions(options));

  var chart = new google.visualization.ColumnChart(
    document.getElementById('graph'));

  chart.draw(dataTable, options);

}

/**
 * Improved rounding function
 * Source: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/round#A_better_solution
 *
 * @param {number} number 
 * @param {number} precision 
 * @returns Rounded number
 */
function round(number, precision) {
  var shift = function (number, precision, reverseShift) {
    if (reverseShift) {
      precision = -precision;
    }
    var numArray = ("" + number).split("e");
    return +(numArray[0] + "e" + (numArray[1] ? (+numArray[1] + precision) : precision));
  };
  return shift(Math.round(shift(number, precision, false)), precision, true);
}

/**
 * Initialize the Google Map
 *
 * Based on https://developers.google.com/maps/documentation/javascript/examples/directions-simple
 */
function initMap() {
  var directionsService = new google.maps.DirectionsService;
  var directionsDisplay = new google.maps.DirectionsRenderer;

  map = new google.maps.Map(document.getElementById('map'), {
    center: { lat: 34.2409701, lng: -118.5277711 },
    zoom: 17
  });
  directionsDisplay.setMap(map);

  var runAlgorithmHandler = function () {
    runAlgorithm(directionsService, directionsDisplay);
  };

  document.getElementById('runButton').addEventListener('click', runAlgorithmHandler);

  var autocompleteStartLocation = new google.maps.places.Autocomplete(
    (document.getElementById('start')), {});
  var autocompleteEndLocation = new google.maps.places.Autocomplete(
    (document.getElementById('end')), {});

  autocompleteStartLocation.addListener('place_changed', function () {
    autocompletePlaceChangedListener(autocompleteStartLocation, map, 'A');
  });

  autocompleteEndLocation.addListener('place_changed', function () {
    autocompletePlaceChangedListener(autocompleteEndLocation, map, 'B');
  });

  google.charts.load('current', { packages: ['corechart', 'bar'] });

  //   // Show traffic layer
  //   // var trafficLayer = new google.maps.TrafficLayer();
  //   // trafficLayer.setMap(map);
  //
  //   var onChangeHandler = function() {
  //     console.log('Start or end location changed');
  //     calculateAndDisplayRoute(directionsService, directionsDisplay);
  //   };
  //
  //   // Automatically get estimated travel time when text fields are changed
  //   // document.getElementById('start').addEventListener('change', onChangeHandler); // alternatively use "input" event
  //   // document.getElementById('end').addEventListener('change', onChangeHandler);
  //
  //   document.getElementById('runButton').addEventListener('click', onChangeHandler);
}
