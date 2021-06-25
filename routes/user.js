var express = require("express");
var app = express();
const bcrypt = require("bcrypt");
var { auth, jwtAuth } = require("../config/auth");
var { user } = require("../models/User");
var { AccessToken } = require("../models/AccessToken");
var { user_address } = require("../models/UserAddress");
const jwt = require("jsonwebtoken");
const path = require("path");
const multer = require("multer");
var cloudinary = require("cloudinary").v2;
const passport = require("passport");
const Mail = require("@sendgrid/mail");

cloudinary.config({
  cloud_name: process.env.CLOUD_API_NAME,
  api_key: process.env.CLOUD_API_KEY,
  api_secret: process.env.CLOUD_API_SECRET,
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

Mail.setApiKey(process.env.SENDGRID_API_KEY);

function generateAccessToken(userId) {
  return jwt.sign(userId, process.env.TOKEN_SECRET, {expiresIn: '600s'});
}

app.post("/register", async (req, res) => {
  const salt = await bcrypt.genSalt();
  const userPassword = await bcrypt.hash(req.body.password, salt);

  if (req.body.password !== req.body.confirmpassword) {
    res.status(500).json({
      error: 1,
      message: "password not matched",
      data: null,
    });
  } else {
    const user_post = new user({
      username: req.body.username,
      firstname: req.body.firstname,
      lastname: req.body.lastname,
      password: userPassword,
      email: req.body.email,
    });
    user_post.save(function (err, row) {
      if (err) {
        res.status(500).json({
          error: 1,
          message: err.message,
          data: null,
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
          error: 0,
          message: "saved successfully",
          data: null,
        });
      }
    });
  }
});

app.post("/login", passport.authenticate("local"), function (req, res) {
  var username = req.user.name;
  console.log(req.user.id);
  const token = generateAccessToken({ userId: req.user.id });
  res.status(200).json({
    error: 0,
    message: "user list",
    data: {
      token: token,
    },
  });
});

app.get("/get", jwtAuth, async function (req, res) {
  await user
    .findOne({ _id: req.user._id })
    .populate("address")
    .then((user) => {
      res.status(200).json({
        error: 0,
        message: "user list",
        data: user,
      });
    });
});

app.put("/delete", jwtAuth, async function (req, res) {
  var user_id = req.user.user_id;
  await user.deleteOne({ _id: user_id });
  res.status(200).json({
    error: 0,
    message: "user deleted",
    data: null,
  });
});

app.get("/list/:limit/:page", function (req, res) {
  pages_number = Number(req.params.page);
  limit = req.params.limit;
  var skip_user_list = limit * pages_number - pages_number;
  user
    .find()
    .skip(skip_user_list)
    .limit(pages_number)
    .exec(function (err, userData) {
      if (err) {
        res.status(500).json({
          error: 0,
          message: err.message,
          data: null,
        });
      }
      res.status(200).json({
        error: 0,
        message: "user list",
        data: userData,
      });
    });
});

app.post("/address", jwtAuth, async function (req, res) {
  var userId = req.user._id;
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
        error: 1,
        message: err.message,
        data: null,
      });
    } else {
      user.update(
        { _id: userId },
        { $push: { address: address_post._id } },
        function (err, result) {
          if (err) {
            res.status(500).json({
              error: 1,
              message: err.message,
              data: null,
            });
          } else {
            res.status(200).json({
              error: 0,
              message: "address saved",
              data: null,
            });
          }
        }
      );
    }
  });
});

app.post("/forgot-password", async function (req, res) {
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
            error: 0,
            message: err.message,
            data: null,
          });
        }
        const msg = {
          to: `${userDetails.email}`,
          from: "ankit@excellencetechnologies.info",
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
        res.status(200).json({
          error: 0,
          message: "token saved",
          data: null,
        });
      });
    } else {
      res.status(500).json({
        error: 1,
        message: "user not found",
        data: null,
      });
    }
  });
});

app.post("/verify-reset-password/:token", async function (req, res, next) {
  var forgetToken = req.params.token;
  if (forgetToken == null)
    return res.status(401).json({
      error: 0,
      message: "invalid token",
      data: null,
    });
  AccessToken.findOne(
    { access_token: forgetToken },
    async function (err, tokenDetail) {
      if (tokenDetail && tokenDetail._id) {
        jwt.verify(
          forgetToken,
          process.env.TOKEN_SECRET,
          (err, verifiedJwt) => {
            if (err) {
              res.status(500).json({
                error: 0,
                message: err.message,
                data: null,
              });
            } else {
              var newPassword = req.body.password;
              const salt = bcrypt.genSalt();
              const userPassword = bcrypt.hash(newPassword, salt);
              user.updateOne(
                { _id: userDetails._id },
                { $set: { password: userPassword } },
                { new: true }
              );
              jwt.destroy(forgetToken);
              res.status(200).json({
                error: 0,
                message: "password reset successfully",
                data: null,
              });
              next();
            }
          }
        );
      } else {
        res.status(500).json({
          error: 1,
          message: "token not matched or expired",
          data: null,
        });
      }
    }
  );
});

app.post(
  "/profile-image", jwtAuth,
  upload.single("image"),
  async function (req, res, next) {
    cloudinary.uploader.upload(req.file.path, function (err, result) {
      res.status(200).json({
        error: 0,
        message: "image upload successfully",
        data: result.url,
      });
    });
  }
);

module.exports = app;
