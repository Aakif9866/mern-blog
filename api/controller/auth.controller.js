import User from "../models/user.model.js";
import pkg from "bcryptjs";
import jwt from "jsonwebtoken";
import { errorHandler } from "../utils/error.js";
import bcryptjs from "bcryptjs";
const { hashSync } = pkg;
// const { compareSync } = pkg;

// we mainly use our User model here

// here add next so that it can be used when needed
// the fn is added from index.js from .use

// used in auth.route.js 👇 for signup

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

// used in auth.route.js 👇 for signin

export const signin = async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password || email === "" || password === "") {
    next(errorHandler(400, "All fields are required"));
  }

  try {
    const validUser = await User.findOne({ email }); // search email
    if (!validUser) {
      return next(errorHandler(404, "User not found"));
    }
    const validPassword = bcryptjs.compareSync(password, validUser.password);
    // compare given password and password in DB
    if (!validPassword) {
      return next(errorHandler(400, "Invalid password"));
    }
    const token = jwt.sign(
      { id: validUser._id, isAdmin: validUser.isAdmin },
      process.env.JWT_SECRET
    );

    //  it is mandatory to create a JWT_SECRET to handle authentication and other requests related to the current user
    // _id is unique for each user

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

// used in auth.route.js 👇 for google  (ie authentication)

export const google = async (req, res, next) => {
  const { email, name, googlePhotoUrl } = req.body;
  try {
    const user = await User.findOne({ email });
    if (user) {
      const token = jwt.sign(
        { id: user._id, isAdmin: user.isAdmin },
        process.env.JWT_SECRET
      );
      const { password, ...rest } = user._doc;
      res
        .status(200)
        .cookie("access_token", token, {
          httpOnly: true,
        })
        .json(rest);
    } else {
      const generatedPassword =
        Math.random().toString(36).slice(-8) +
        Math.random().toString(36).slice(-8);
      const hashedPassword = bcryptjs.hashSync(generatedPassword, 10);
      const newUser = new User({
        username:
          name.toLowerCase().split(" ").join("") +
          Math.random().toString(9).slice(-4),
        email,
        password: hashedPassword,
        profilePicture: googlePhotoUrl,
      });
      await newUser.save();
      const token = jwt.sign(
        { id: newUser._id, isAdmin: newUser.isAdmin },
        process.env.JWT_SECRET
      );
      const { password, ...rest } = newUser._doc;
      //It takes the newUser._doc object, which contains all the data of the newly created user document.
      // It extracts the password property from that object and assigns it to a variable named password.
      // The rest of the properties are gathered into a new object using the rest syntax (...rest). This object contains all properties of newUser._doc except for password.
      res
        .status(200)
        .cookie("access_token", token, {
          httpOnly: true,
        })
        .json(rest);
    }
  } catch (error) {
    next(error);
  }
};

// what all things sign in function performs
