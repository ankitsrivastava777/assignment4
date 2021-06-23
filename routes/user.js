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
  cloud_name: "etech",
  api_key: "962958745652244",
  api_secret: "7x4iL4otjHE-CYJdGHs36WeWZB8",
});
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

  if (req.body.password !== req.body.confirmpassword) {
    res.status(500).json({
      message: "password not matched",
    });
  } else {
    const user_details = new user({
      username: req.body.username,
      password: userPassword,
      email: req.body.email,
    });
    user_details.save(function (err, row) {
      if (err) {
        res.status(500).json({
          message: "user not saved",
        });
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
          res.status(200).json({
            message: "saved successfully",
          });      }
    });
  }
});

app.post("/user/login", passport.authenticate("local"), function (req, res) {
  var username = req.user.name;
  const token = generateAccessToken({ username: req.body.username });
  res.json({
    token: token,
  });
});

app.get("/user/get", jwtAuth, async function (req, res) {
  user
    .findOne({ _id: req.user._id })
    .populate("userdata")
    .then((user) => {
      res.json(user);
    });
});

app.put("/user/delete", jwtAuth, async function (req, res) {
  var user_id = req.user.user_id;
  await user.deleteOne({ _id: user_id }, function (err, results) {
    if (err) {
      res.status(501).send("no user mathch");
    } else {
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
          message: "no data found",
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
  var address_post = new user_address({
    user_id: userId,
    city: city,
    state: state,
    pin_code: pin_code,
    phone_no: phone_no,
  });
  address_post.save(function (err) {
    if (err) {
      res.status(500).json({
        message: "address not saved",
      });      
    }
    res.status(200).json({
      message: "Address Saved",
    });
  });
});

app.post("/user/forgot-password", async function (req, res) {
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
          res.status(500).json({
            message: "token not saved",
          });        
        }
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
});

app.post("/user/verify-reset-password/:token", async function (req, res, next) {
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
              user.findOne(
                { username: verifiedJwt.username },
                async function (err, userDetails) {
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
});

app.post(
  "/user/profile-image",
  upload.single("image"),
  async function (req, res, next) {
    cloudinary.uploader.upload(req.file.path, function (err, result) {
      res.status(200).json({
        img_url: result.url,
      });
    });
  }
);

module.exports = app;
