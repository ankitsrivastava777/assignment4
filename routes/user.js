var express = require("express");
var app = express();
const bcrypt = require("bcrypt");
var { auth, jwtAuth } = require("../config/auth");
var { user } = require("../models/User");
var { AccessToken } = require("../models/AccessToken");
var { user_address } = require("../models/UserAddress");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
const path = require("path");
app.use(express.json());
const multer = require("multer");
var cloudinary = require("cloudinary").v2;
cloudinary.config({
  cloud_name: 'etech',
  api_key: '962958745652244',
  api_secret: '7x4iL4otjHE-CYJdGHs36WeWZB8'
})
const storage = multer.diskStorage({
  destination: "../upload/images",
  filename: (req, file, callback) => {
    return callback(
      null,
      `${file.fieldname}_${Date.now()}${path.extname(file.originalname)}`
    );
  },
});

const upload = multer({
  storage: storage,
});
// get config vars
dotenv.config();

const Mail = require("@sendgrid/mail");
Mail.setApiKey(process.env.SENDGRID_API_KEY);

//passport
const passport = require("passport");
const flash = require("connect-flash");
const session = require("express-session");
// Passport Config
require("../config/passport-config")(passport);
// Express body parser
app.use(express.urlencoded({ extended: true }));
// Express session
app.use(
  session({
    secret: "secret",
    resave: true,
    saveUninitialized: true,
  })
);

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Connect flash
app.use(flash());

// Global variables
app.use(function (req, res, next) {
  res.locals.success_msg = req.flash("success_msg");
  res.locals.error_msg = req.flash("error_msg");
  res.locals.error = req.flash("error");
  next();
});

//end passport

function generateAccessToken(username) {
  return jwt.sign(username, process.env.TOKEN_SECRET);
}

app.post("/user/register", async (req, res) => {
  const salt = await bcrypt.genSalt();
  const userPassword = await bcrypt.hash(req.body.password, salt);
  const user_post = new user({
    username: req.body.username,
    password: userPassword,
    email: req.body.email,
  });

  if (req.body.password !== req.body.confirmpassword) {
    // var err = new Error('Passwords do not match.');
    res.send("password not match");
  } else {
    user_post.save(function (err, row) {
      if (err) {
        console.log(err);
      } else {
        const msg = {
          to: `${req.body.email}`, // Change to your recipient
          from: "ankit@excellencetechnologies.info", // Change to your verified sender
          subject: "Sending with SendGrid is Fun",
          text: "and easy to do anywhere, even with Node.js",
          html: `<strong>${req.body.username}  has been registered</strong>`,
        };
        Mail.send(msg)
          .then(() => {
            console.log("Email sent");
          })
          .catch((error) => {
            console.error(error);
          });
        res.status(200).send("saved succesfully");
      }
    });
  }
});

// app.post("/user/login", forwardAuthenticated, async function (req, res) {
//   user.findOne({ username: req.body.username }, async function (err, userDetails) {
//     var pass = userDetails.password;
//     var userId = userDetails.id;
//     var name = req.body.username;
//     var input_password = pass.toString();
//     var user_password = req.body.password;
//     var tokenId = userId.toString();
//     if (await bcrypt.compare(user_password, input_password)) {
//       const pwd = passwordHash.generate(req.body.password);
//       const token = generateAccessToken({ username: req.body.username });
//       AccessToken.findOne({ user_id: userId }, function (err, userDetails) {
//         if (userDetails && userDetails._id) {
//           res.send("already login");
//         } else {
//           var token_post = new AccessToken({
//             user_id: userId,
//             access_token: pwd,
//           });
//           token_post.save(function (err) {
//             if (err) {
//               console.log(err);
//               process.exit();
//             }
//             console.log("Token Saved");
//             res.header("token", tokenId);
//             res.status(200).json({ token: token });
//           });
//         }
//       });
//     } else {
//       res.status(500).send("no user found");
//     }
//   });
// });

app.post("/user/login", passport.authenticate("local"), function (req, res) {
  var username = req.user.name;
  const token = generateAccessToken({ username: req.body.username });
  res.json({
    token: token,
  });
});

app.get("/user/get", jwtAuth, async function (req, res) {
  console.log(req.user.id);
  user
    .findOne({ _id: req.user._id })
    .populate("userdata")
    .then((user) => {
      res.json(user);
    });
});

app.put("/user/delete",jwtAuth, async function (req, res) {
  var user_id = req.user.user_id;
  await user.deleteOne({ _id: user_id }, function (err, results) {
    if (err) {
      res.status(501).send("no user mathch");
    } else {
      console.log(results);
      res.status(200).send("user deleted");
    }
  });
});

app.get("/user/list/:users/:page", function (req, res) {
  pages_number = Number(req.params.page);
  if (req.params.users == 1) {
    skip = 0;
  } else {
    var skip_user_list = req.params.users * 10 - 10;
  }
  user
    .find()
    .skip(skip_user_list)
    .limit(pages_number)
    .exec(function (err, userData) {
      if (err) {
        res.status(500).json({
          message: 'no data found',
        });
      }
      res.send(result);
    });
});

app.post("/user/address", auth, async function (req, res) {
  var userId = req.user.user_id;
  var address = req.body.address;
  var city = req.body.city;
  var state = req.body.state;
  var pin_code = req.body.pin_code;
  var phone_no = req.body.phone_no;
  console.log(req.body.address);
  var address_post = new user_address({
    user_id: userId,
    city: city,
    state: state,
    pin_code: pin_code,
    phone_no: phone_no,
  });
  address_post.save(function (err) {
    if (err) {
      console.log(err);
      process.exit();
    }
    console.log("address Saved");
    res.status(200).json({
      message: "Address Saved",
    });
  });
});

app.post(
  "/user/forgot-password",
  async function (req, res) {
    console.log("ddd");
    var username = req.body.username;
    user.findOne({ username: username }, async function (err, userDetails) {
      if (userDetails && userDetails._id) {
        const token = jwt.sign({ username }, process.env.TOKEN_SECRET);
        var token_post = new AccessToken({
          user_id: userDetails._id,
          access_token: token,
        });
        token_post.save(function (err) {
          if (err) {
            console.log(err);
            process.exit();
          }
          console.log(token);
          console.log(userDetails.email);
          const msg = {
            to: `${userDetails.email}`, // Change to your recipient
            from: "ankit@excellencetechnologies.info", // Change to your verified sender
            subject: "Sending with SendGrid is Fun",
            text: "and easy to do anywhere, even with Node.js",
            html: `<a href="http://localhost:4000/user/verify-reset-password/${token}">Click to Reset Password</a>`,
          };
          Mail.send(msg)
            .then(() => {
              console.log("Email sent");
            })
            .catch((error) => {
              console.error(error);
            });
          res.status(200).send({ token: token });
        });
      } else {
        res.status(500).json({
          message: "user not found",
        });
      }
    });
  }
);

app.post(
  "/user/verify-reset-password/:token",
  async function (req, res, next) {
    var forgetToken = req.params.token;
    if (forgetToken == null) return res.sendStatus(401);

    AccessToken.findOne(
      { access_token: forgetToken },
      async function (err, tokenDetail) {
        if (tokenDetail && tokenDetail._id) {
          jwt.verify(
            forgetToken,
            process.env.TOKEN_SECRET,
            (err, verifiedJwt) => {
              if (err) {
                res.send(err.message);
              } else {
                console.log(verifiedJwt);
                user.findOne(
                  { username: verifiedJwt.username },
                  async function (err, userDetails) {
                    console.log(userDetails._id);
                    if (userDetails && userDetails._id) {
                      var newPassword = req.body.password;
                      const salt = await bcrypt.genSalt();
                      const userPassword = await bcrypt.hash(newPassword, salt);
                      await user.updateOne(
                        { _id: userDetails._id },
                        { $set: { password: userPassword } },
                        { new: true }
                      );
                      res.status(200).json({
                        message: "password reset successfully",
                      });
                      next();
                    } else {
                      res.status(500).json({
                        message: "user not found",
                      });
                    }
                  }
                );
              }
            }
          );
        } else {
          res.status(500).json({
            message: "token not matched or expired",
          });
        }
      }
    );
  }
);

app.post(
  "/user/profile-image",
  upload.single("image"),
  async function (req, res, next) {
    cloudinary.uploader.upload(req.file.path, function(err, result)
    {
      res.status(200).json({
        img_url : result.url
      });
    });
  }
);

module.exports = app;
