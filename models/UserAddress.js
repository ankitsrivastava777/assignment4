var mongoose = require("mongoose");
var { conn } = require("../config/db");
var { user } = require("../models/User")
var user_address = mongoose.Schema(
    {
      user_id: {
        type: mongoose.Schema.Types.ObjectId,
      },
      address: {
        type: String,
      },
      city: {
        type: String,
      },
      state: {
        type: String,
      },
      pin_code: {
        type: String,
      },
      phone_no: {
        type: String,
      },
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user"
     },
    },
    {
      strict: true,
      collection: "user_address",
    }
  );

  var user_address = conn.model("User_address", user_address);

  exports.user_address = user_address;