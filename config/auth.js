var {conn} = require("../config/db");
var { user } = require("../models/User");
var { AccessToken } = require("../models/AccessToken");
var { user_address } = require("../models/UserAddress");
const jwt = require('jsonwebtoken');
const dotenv = require("dotenv");
dotenv.config();

var jwtAuth = function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (authHeader == null) return res.sendStatus(401)
  jwt.verify(authHeader, process.env.TOKEN_SECRET, (err, verifiedJwt) => {
    if(err){
        res.status(500).json({
            message: "password not match",
        });    }else{
        user.findOne({ username: verifiedJwt.username }, function (err, userDetails) {
            if (userDetails && userDetails._id) {
                req.user = userDetails;
                next();
            } else {
                res.status(500).json({
                    message: "user not found",
                });
            }
        });
    }
  })
}

var auth = async function authenticateToken(req, res, next) {
    var user_id = req.headers.token;
    AccessToken.findOne({ user_id: user_id }, function (err, userDetails) {
        if (userDetails && userDetails._id) {
            req.user = userDetails;
            next();
        } else {
            res.status(500).json({
                message: "user not found",
            });
        }
    });
}

exports.auth = auth;
exports.jwtAuth = jwtAuth;