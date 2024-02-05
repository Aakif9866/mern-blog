import express from "express";
import { test } from "../controller/user.controller.js"; // .js very very important

const router = express.Router();

router.get("/test", test);

export default router;
