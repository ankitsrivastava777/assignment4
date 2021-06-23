var mongoose = require("mongoose");
var { conn } = require("../config/db");

var access_token = mongoose.Schema(
    {
      user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
        unique: true,
      },
      access_token: {
        type: String,
      },
      expiry: {
        type: Date,
        expires: "60s",
        default: Date.now,
      },
    },
    {
      strict: true,
      collection: "access_token",
    }
  );

  var AccessToken = conn.model("access_roken", access_token);

  exports.AccessToken = AccessToken;