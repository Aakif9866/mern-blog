import express from "express";
import { verifyToken } from "../utils/verifyUser.js";
import {
  create,
  deletepost,
  getposts,
  updatepost,
} from "../controller/post.controller.js";

const router = express.Router();

router.post("/create", verifyToken, create);
router.get("/getposts", getposts); // -> no need to verify
// this is very very important route we use it in searh bar everytime
// and we also use it in
router.delete("/deletepost/:postId/:userId", verifyToken, deletepost);
// update is the final function created inordre Post route
router.put("/updatepost/:postId/:userId", verifyToken, updatepost);

export default router;
