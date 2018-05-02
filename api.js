const _ = require('underscore');
const googleMapsClient = require('@google/maps').createClient({
  key: 'AIzaSyBIv0R2ZOjdLN1KHIvS310h6hu4bZ277gs',
  Promise: Promise
});

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
 * @param  {string} startLocation     Start location
 * @param  {string} endLocation       End location
 * @param  {Date} dateTime            Departure time
 * @return {Object}                   Result object
 */
function getEstimatedTravelTime(startLocation, endLocation, dateTime) {
  console.log('Getting estimated travel time from %s to %s for a %s departure', startLocation, endLocation, dateTime);

  return googleMapsClient.directions({
    origin: startLocation,
    destination: endLocation,
    departure_time: dateTime,
    alternatives: false,
    traffic_model: 'best_guess'
  })
    .asPromise()
    .then((response) => {
      if (response.json.status === 'OK') {
        console.log('Got estimated travel time from %s to %s for a %s departure', startLocation, endLocation, dateTime);
        return {
          dateTime: dateTime,
          // response: response.json,
          duration: getDuration(response.json).value,
          durationText: getDuration(response.json).text
        };
      } else if (response.json.status === 'OVER_QUERY_LIMIT') {
        console.error('Over query limit');
        // TODO: Remove next lines
        // Temporarily resolve the promise so that Promise.all doesn't fail
        return {
          dateTime: dateTime,
          // response: {},
          duration: Infinity,
          durationText: 'Infinity'
        };
      } else {
        console.log('Rejected');
      }
    })
    .catch((err) => {
      console.log('CATCH Error');
      console.log(err);
    });
}

/**
 * Round a datetime object to the next hour
 *
 * @param  {Date} datetime Date
 * @return {Date} Date rounded to the next hour
 */
function roundToNextHour(datetime) {
  var dt = new Date(datetime);
  dt.setHours(dt.getHours() + 1); // Set to the next hour
  dt.setMinutes(0); // Set the minutes to 0
  dt.setSeconds(0); // Set the seconds to 0
  dt.setMilliseconds(0); // Set the milliseconds to 0
  return dt;
}

/**
 * Get the shortest travel time between two locations
 *
 * @param  {string} startLocation Start location
 * @param  {string} endLocation   End location
 * @param  {object} timeWindow    Time window
 * @return {object}               [description]
 */
function getShortestTravelTime(startLocation, endLocation, timeWindow) {
  // timeWindowStart, timeWindowEnd, timeWindowIncrement, timeWindowFilterHour,
  // timeWindowFilterHourStart, timeWindowFilterHourEnd

  var defaultTimeWindow = {
    start: roundToNextHour(Date.now()), // current time
    end: new Date(roundToNextHour(Date.now()).valueOf() + (60 * 60 * 1000 * 24 * 3)), // 3 days from now
    increment: 60 * 60 * 1000, // 1 hour
    hourFilter: false,
    hourStart: 6, // earliest time to start trip
    hourEnd: 20 // latest time to start trip
  };

  timeWindow = _.extend({}, timeWindow, defaultTimeWindow);

  return new Promise(function (resolve, reject) {
    var currentDateTime = timeWindow.start;

    var sequence = []; // Sequence of getEstimatedTravelTime promises

    while (currentDateTime <= timeWindow.end) {
      if (!timeWindow.hourFilter || currentDateTime.getHours() >= timeWindow.hourStart && currentDateTime.getHours() <= timeWindow.hourEnd) {
        sequence.push(getEstimatedTravelTime(startLocation, endLocation, currentDateTime));
      }
      currentDateTime = new Date(currentDateTime.getTime() + timeWindow.increment);
    }

    // Promise that resolves when all requests have completed
    Promise.all(sequence).then(function (results) {
      // console.log('Results');
      // console.log(JSON.stringify(results));

      // Print a table
      console.log('Departure time\t\tDuration');
      results.forEach(function (result) {
        console.log(result.dateTime.toISOString() + '\t\t' + result.duration);
      });

      console.log('Finding the shortest duration');
      var bestTravelTime = _.min(results, 'duration');
      console.log(bestTravelTime);
      // resolve(bestTravelTime);
      resolve(results);
    }).catch(function (err) {
      // catch any error that happened along the way
      console.error('ERROR: %s', err.message);
      console.error(err);
      reject(err);
    });
  });
}

module.exports = getShortestTravelTime;
