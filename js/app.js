"use strict";

var WINDOW_START = new Date(Date.now() + 0); // current time
WINDOW_START.setMinutes(0); // Set the minutes to 0
WINDOW_START.setSeconds(0); // Set the seconds to 0
var WINDOW_END = new Date(WINDOW_START.valueOf() + (60 * 60 * 1000 * 72)); // 72 hours from now
var WINDOW_INCREMENT = 60 * 60 * 1000; // 1 hour in milliseconds
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
  return new Promise(function(resolve, reject) {
    directionsService.route({
      origin: startLocation,
      destination: endLocation,
      travelMode: 'DRIVING',
      provideRouteAlternatives: false,
      drivingOptions: {
        departureTime: dateTime,
        trafficModel: 'bestguess'
      }
    }, function(response, status) {
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

  console.log("Running algorithm");
  console.log("Start location:\t" + startLocation);
  console.log("End location:\t" + endLocation);

  var promiseThrottle = new PromiseThrottle({
    requestsPerSecond: 1,           // up to 1 request per second
    promiseImplementation: Promise  // the Promise library you are using
  });

  var currentDateTime = WINDOW_START;
  var results = [];

  var sequence = [];

  while (currentDateTime <= WINDOW_END) {
    if (currentDateTime.getHours() >= HOUR_START && currentDateTime.getHours() <= HOUR_END) {
      sequence.push(promiseThrottle.add(getEstimatedTravelTime.bind(this, directionsService, startLocation, endLocation, currentDateTime)));
    }
    currentDateTime = new Date(currentDateTime.getTime() + WINDOW_INCREMENT);
  }

  // Promise that resolves when all requests have completed
  Promise.all(sequence).then(function(results) {
    console.log('Results');
    console.log(results);

    console.log('Departure time\t\t\t\t\t\t\tDuration');
    var table = '<table id="debugTable" class="table table-sm table-bordered table-striped table-hover"><thead class="thead-dark"><tr><th scope="col">Departure time</th><th scope="col">Duration</th></tr></thead><tbody>';
    results.forEach(function(result) {
      console.log(moment(result.dateTime).format(DATETIME_FORMAT) + '\t\t\t\t' + result.durationText);
      table += '<tr><td>' + moment(result.dateTime).format('L - LT') + '</td><td>' + result.durationText + '</td></tr>';
    });
    table += '</tbody></table>';
    $('#output').after(table);


    console.log('Finding the shortest duration');
    var bestTravelTime = _.min(results, 'duration');
    console.log(bestTravelTime);

    directionsDisplay.setDirections(bestTravelTime.response);
    $('#output').html('<div class="alert alert-success">The best time to leave is <strong>' + moment(bestTravelTime.dateTime).format(DATETIME_FORMAT) + '</strong>. Your travel time will be ' + bestTravelTime.durationText + ' with traffic.</div>');

  }).catch(function(err) {
    // catch any error that happened along the way
    console.error("ERROR: " + err.message);
    console.error(err);
    $('#output').html('<div class="alert alert-danger">Uh oh: ' + err.message + '</div>');
  })
}

var map;

/**
 * Initialize the Google Map
 *
 * Based on https://developers.google.com/maps/documentation/javascript/examples/directions-simple
 */
function initMap() {
  var directionsService = new google.maps.DirectionsService;
  var directionsDisplay = new google.maps.DirectionsRenderer;
  var map = new google.maps.Map(document.getElementById('map'), {
    center: {lat: 34.2409701, lng: -118.5277711},
    zoom: 17
  });
  directionsDisplay.setMap(map);

  var runAlgorithmHandler = function() {
    runAlgorithm(directionsService, directionsDisplay);
  }

  document.getElementById('runButton').addEventListener('click', runAlgorithmHandler);

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
