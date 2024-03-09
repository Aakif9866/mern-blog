import express from "express";
import { deleteUser, signout, test } from "../controller/user.controller.js"; // .js very very important
import { updateUser } from "../controller/user.controller.js";
import { verifyToken } from "../utils/verifyUser.js";

const router = express.Router();

router.get("/test", test);
router.put("/update/:userId", verifyToken, updateUser); // update data
router.delete("/delete/:userId", verifyToken, deleteUser); // delete user
router.post("/signout", signout); // anybody can signout So no need of verifyToken
export default router;

// Express is a web application framework for Node.js, and Express Router is a part of it. Express Router is used to create modular, mountable route handlers. It allows you to define routes in separate files and then use them in your main application.
