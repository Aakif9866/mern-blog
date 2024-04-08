import express from "express";
import { verifyToken } from "../utils/verifyUser.js";
import {
  createComment,
  deleteComment,
  editComment,
  getPostComments,
  getcomments,
  likeComment,
} from "../controller/comment.controller.js";

const router = express.Router();

router.post("/create", verifyToken, createComment); // only admins can create
router.get("/getPostComments/:postId", getPostComments); // anyone can access this
router.put("/likeComment/:commentId", verifyToken, likeComment); // for liking a post verificaion is important
router.put("/editComment/:commentId", verifyToken, editComment); // for editing a post verificaion is important
router.delete("/deleteComment/:commentId", verifyToken, deleteComment); // for deleting a post verificaion is important
// only the user who did the comment can delete it
router.get("/getcomments", verifyToken, getcomments);

export default router;
