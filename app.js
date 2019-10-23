var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var GithubWebHook = require('express-github-webhook');
var bodyParser = require('body-parser');
var request = require('request');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');

var webhookHandler = GithubWebHook({
    path: '/webhook',
    secret: 'secret'
});

var app = express();
app.use(bodyParser.json());
app.use(webhookHandler);

//Setup Github Webhook Handler
webhookHandler.on('check_suite', function(repo, data) {
    var action = data['action'];
    var status = data['check_suite']['status'];
    var conclusion = data['check_suite']['conclusion'];

    console.log('check_suite', action, status, conclusion);
    if (action === 'completed' && status === 'completed' && conclusion === 'success') {
        var releaseUrl = data['repository']['url'] + '/releases/latest'
        console.log('Fetching latest release from ' + releaseUrl);

        request({
            url: 'https://api.github.com/repos/luminositylab/zero-to-sixty/releases/latest',
            headers: {
                'User-Agent': 'request'
            },
            json: true
        }, function(error, response, body) {
            if (!error && response.statusCode === 200) {
                console.log('Updating to sha: ' + body['target_commitish']);
                console.log('Version ' + body['tag_name']);
                console.log(body['assets'][0]['browser_download_url']);
            }
        });
        // process.kill(process.pid, 'SIGTERM')
    }
});

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({
    extended: false
}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/users', usersRouter);

app.use(function(req, res, next) {
    next(createError(404));
});

app.use(function(err, req, res, next) {
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};
    res.status(err.status || 500);
    res.render('error');
});

module.exports = app;
