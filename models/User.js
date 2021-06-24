var mongoose = require("mongoose");
var { conn } = require("../config/db");

var usersprofile_schema = mongoose.Schema(
  {
    username: {
        type: String,
        required: true,
    },
    firstname: {
        type: String
    },
    lastname: {
        type: String
    },
    password: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
    },
},
  {
    strict: true,
    collection: "userdetails",
  }
);

var user = conn.model("userdetails", usersprofile_schema);

exports.user = user;
