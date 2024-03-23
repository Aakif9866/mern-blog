import express from "express";
import {
  deleteUser,
  signout,
  test,
  getUser,
  getUsers,
} from "../controller/user.controller.js"; // .js very very important
import { updateUser } from "../controller/user.controller.js";
import { verifyToken } from "../utils/verifyUser.js";

const router = express.Router();

router.get("/test", test);
router.put("/update/:userId", verifyToken, updateUser); // update data
router.delete("/delete/:userId", verifyToken, deleteUser); // delete user
router.post("/signout", signout); // anybody can signout So no need of verifyToken
router.get("/getusers", verifyToken, getUsers); // only can be done by admin
router.get("/:userId", getUser);
export default router;

// Express is a web application framework for Node.js, and Express Router is a part of it. Express Router is used to create modular, mountable route handlers. It allows you to define routes in separate files and then use them in your main application.

// This line defines a route that listens for HTTP PUT requests on the path /update/:userId. :userId is a parameter in the route path, which can be accessed inside the updateUser function. verifyToken is a middleware function that runs before the updateUser function. Middleware functions in Express have access to the request and response objects and can execute code, modify request, or short-circuit the request-response cycle. updateUser is the controller function responsible for handling the PUT request.
