var express = require("express");
var app = express();
var bodyParser = require("body-parser");
var urlencodedParser = bodyParser.urlencoded({ extended: false })
app.use(express.json());
app.use(urlencodedParser);
app.use(express.json());
const passport = require("passport");
const flash = require("connect-flash");
const session = require("express-session");
require("./config/passport-config")(passport);
app.use(express.urlencoded({ extended: true }));
const dotenv = require("dotenv");
dotenv.config();
app.use(
  session({
    secret: "secret",
    resave: true,
    saveUninitialized: true,
  })
);
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());

app.use(function (req, res, next) {
  res.locals.success_msg = req.flash("success_msg");
  res.locals.error_msg = req.flash("error_msg");
  res.locals.error = req.flash("error");
  next();
});

app.use('/user', require('./routes/user'));

var server = app.listen(6300, function () {
  var host = server.address().address;
  var port = server.address().port;
  console.log("Example app listening at http://%s:%s", host, port);
});
