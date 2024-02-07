import User from "../models/user.model.js";
import pkg from "bcryptjs";
import { errorHandler } from "../utils/utils.js";
const { hashSync } = pkg;

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
// used in auth.signup
