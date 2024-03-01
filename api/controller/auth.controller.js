import User from "../models/user.model.js";
import pkg from "bcryptjs";
import jwt from "jsonwebtoken";
import { errorHandler } from "../utils/error.js";
import bcryptjs from "bcryptjs";
const { hashSync } = pkg;
const { compareSync } = pkg;

// we mainly use our User model here

// here add next so that it can be used when needed
// the fn is added from index.js from .use
export const signup = async (req, res, next) => {
  const { username, email, password } = req.body; // get this from backend and save it
  if (
    !username ||
    !email ||
    !password ||
    username === "" ||
    email === "" ||
    password === ""
  ) {
    next(errorHandler(400, "All feilds are required"));
    // we created this error handler from utils
  } // extra testing

  const hashedpassword = hashSync(password, 10);

  const newUser = new User({ username, email, password: hashedpassword });

  // atlast save it

  try {
    await newUser.save();
    res.json("sign up successful"); // this will show the message
  } catch (error) {
    next(error);
  }
};
// used in auth.route.js 👆 for signup

// used in auth.route.js 👇 for signin

export const signin = async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password || email === "" || password === "") {
    next(errorHandler(400, "All fields are required"));
  }

  try {
    const validUser = await User.findOne({ email }); // serach email
    if (!validUser) {
      return next(errorHandler(404, "User not found"));
    }
    const validPassword = bcryptjs.compareSync(password, validUser.password);
    if (!validPassword) {
      return next(errorHandler(400, "Invalid password"));
    }
    const token = jwt.sign(
      { id: validUser._id, isAdmin: validUser.isAdmin },
      process.env.JWT_SECRET
    );
    //  it is mandatory to create a JWT_SECRET to handleg authentication
    // id is unique for each user

    const { password: pass, ...rest } = validUser._doc;
    // above step is done to avoid sending password to the sign in page while validating it
    // after removing pw we send the rest easily

    res
      .status(200)
      .cookie("access_token", token, {
        httpOnly: true,
      })
      .json(rest);
  } catch (error) {
    next(error);
  }
};
