const LocalStrategy = require("passport-local").Strategy;
const bcrypt = require("bcryptjs");

// Load User model
var { user } = require("../models/User");

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
              return done(null, false, {
                message: "That username is not registered",
              });
            }

            // Match password
            bcrypt.compare(password, user.password, (err, isMatch) => {
              if (err)
                res.status(500).json({
                  error: 1,
                  message: err.message,
                  data: null,
                });
              if (isMatch) {
                console.log(user);
                return done(null, user);
              } else {
                res.status(500).json({
                  error: 1,
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
