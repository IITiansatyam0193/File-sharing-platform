const User = require("../models/user.model.js");
const jwt = require("jsonwebtoken");
require("dotenv").config();

// Handle errors
const handleErrors = (err) => {
  if (err.message === "incorrect email") {
    return "That email is not registered";
  }
  if (err.message === "incorrect password") {
    return "That password is incorrect";
  }
  if (err.code === 11000) {
    return "That email is already registered";
  }
};

// Create JWT
const maxAge = 3 * 24 * 60 * 60;
const createToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: maxAge,
  });
};

// Controller actions
module.exports.home_get = (req, res) => {
  res.render("home");
};

module.exports.signup_get = (req, res) => {
  const message = "";
  res.render("signup", { message });
};

module.exports.signup_post = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.create({ email, password });
    const token = createToken(user._id);
    res.cookie("jwt", token, { httpOnly: true, maxAge: maxAge * 1000 });
    res.status(201).redirect("/");
  } catch (err) {
    const message = handleErrors(err);
    res.status(400).render("signup", { message });
  }
};

module.exports.login_get = (req, res) => {
  const message = "";
  res.render("login", { message });
};

module.exports.login_post = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.login(email, password);
    const token = createToken(user._id);
    res.cookie("jwt", token, { httpOnly: true, maxAge: maxAge * 1000 });
    res.status(200).redirect("/");
  } catch (err) {
    const message = handleErrors(err);
    res.status(400).render("login", { message });
  }
};

module.exports.logout_get = (req, res) => {
  res.cookie("jwt", "", { maxAge: 1 });
  res.redirect("/");
};
