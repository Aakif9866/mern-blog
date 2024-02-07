import User from "../models/user.model.js";
import pkg from "bcryptjs";
const { hashSync } = pkg;

// we mainly use our User model here

export const signup = async (req, res) => {
  const { username, email, password } = req.body; // get this from backend and save it
  if (
    !username ||
    !email ||
    !password ||
    username === "" ||
    email === "" ||
    password === ""
  ) {
    return res.status(400).json({ message: "All feilds are required" });
  } // extra testing

  const hashedpassword = hashSync(password, 10);

  const newUser = new User({ username, email, password: hashedpassword });

  // atlast save it

  try {
    await newUser.save();
    res.json("sign up successful"); // this will show the message
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
// used in auth.signup
