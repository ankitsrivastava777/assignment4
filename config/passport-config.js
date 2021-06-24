const LocalStrategy = require("passport-local").Strategy;
const bcrypt = require("bcryptjs");

// Load User model
var { conn, user, AccessToken, user_address } = require("../models/User");

module.exports = function (passport) {
  passport.use(
    new LocalStrategy(
      { usernameField: "username" },
      (username, password, done) => {
        // Match user
        user
          .findOne({
            username: username,
          })
          .then((user) => {
            if (!user) {
              res.status(500).json({
                error: 0,
                message: "username not found",
                data: null,
              });
            }

            // Match password
            bcrypt.compare(password, user.password, (err, isMatch) => {
              if (err) throw err;
              if (isMatch) {
                return done(null, user);
              } else {
                res.status(200).json({
                  error: 0,
                  message: "password not matched",
                  data: null,
                });
              }
            });
          });
      }
    )
  );

  passport.serializeUser(function (user, done) {
    return done(null, user.id);
  });

  passport.deserializeUser(function (id, done) {
    user.findById(id, function (err, user) {
      done(err, user);
    });
  });
};
