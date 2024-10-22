const jwt = require("jsonwebtoken");
const User = require("../models/user.model.js");
require("dotenv").config();

const requireAuth = (req, res, next) => {
  const token = req.cookies.jwt;
  // Check if JWT exists & is verified
  if (!token) {
    return res.redirect("login");
  }
  jwt.verify(token, process.env.JWT_SECRET, (err, decodedToken) => {
    if (err) {
      console.log(err.message);
      return res.redirect("login");
    }
    next();
  });
};

// check current user
const checkUser = (req, res, next) => {
  const token = req.cookies.jwt;
  if (token) {
    jwt.verify(token, process.env.JWT_SECRET, async (err, decodedToken) => {
      if (err) {
        res.locals.user = null;
        next();
      } else {
        let user = await User.findById(decodedToken.id);
        req.userId = user._id;
        res.locals.user = user;
        next();
      }
    });
  } else {
    res.locals.user = null;
    next();
  }
};

module.exports = { requireAuth, checkUser };
