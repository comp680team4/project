var map;

// Based on https://developers.google.com/maps/documentation/javascript/examples/directions-simple
function initMap() {
  var directionsService = new google.maps.DirectionsService;
  var directionsDisplay = new google.maps.DirectionsRenderer;
  var map = new google.maps.Map(document.getElementById('map'), {
    center: {lat: 34.2409701, lng: -118.5277711},
    zoom: 17
  });
  directionsDisplay.setMap(map);

  // Show traffic layer
  // var trafficLayer = new google.maps.TrafficLayer();
  // trafficLayer.setMap(map);

  var onChangeHandler = function() {
    console.log('Start or end location changed');
    calculateAndDisplayRoute(directionsService, directionsDisplay);
  };

  // Automatically get estimated travel time when text fields are changed
  // document.getElementById('start').addEventListener('change', onChangeHandler); // alternatively use "input" event
  // document.getElementById('end').addEventListener('change', onChangeHandler);

  document.getElementById('buttonGetEstimatedTravelTime').addEventListener('click', onChangeHandler);
}

// Based on https://developers.google.com/maps/documentation/javascript/examples/directions-simple
function calculateAndDisplayRoute(directionsService, directionsDisplay) {
  directionsService.route({
    origin: document.getElementById('start').value,
    destination: document.getElementById('end').value,
    travelMode: 'DRIVING',
    drivingOptions: {
      departureTime: new Date(Date.now() + 0),  // for the time N milliseconds from now.
      trafficModel: 'bestguess'
    }

  }, function(response, status) {
    if (status === 'OK') {
      console.log(response);
      var duration = response.routes[0].legs[0].duration.text;
      var duration_in_traffic = response.routes[0].legs[0].duration_in_traffic.text;
      directionsDisplay.setDirections(response);
      $('#output').html('<br><div class="alert alert-info">' + duration_in_traffic + ' with traffic</div>');
    } else {
      window.alert('Directions request failed due to ' + status);
    }
  });
}
