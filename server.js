const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const getShortestTravelTime = require('./api');

const app = express();
var port = process.env.PORT || 8888;

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cors());

app.disable('x-powered-by');

var router = express.Router();

router.get('/getShortestTravelTime', function (req, res) {
  if (!req.query.startLocation || !req.query.endLocation) {
    res.status(404);
    res.json({message: 'Missing startLocation or startLocation parameter'});
  }
  getShortestTravelTime(req.query.startLocation, req.query.endLocation, {}).then(function (response) {
    res.json(response);
  });
});

app.use('/api', router);

// Serve static assets
app.use('/js', express.static('js', { index: false }));
app.use('/css', express.static('css', { index: false }));
app.get('/', function (req, res) {
  res.sendFile('index.html', { root: __dirname });
});

app.listen(port, () => console.log('Application listening on port ' + port + '!'));
