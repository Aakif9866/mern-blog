// backend

import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import userRoutes from "./routes/user.route.js";
import authRoutes from "./routes/auth.route.js";
import cookieParser from "cookie-parser";

dotenv.config();

// connect db to backend
mongoose
  .connect(process.env.MONGO)
  .then(() => {
    console.log("mongo db is connected");
  })
  .catch((err) => {
    console.log(err);
  });

const app = express();

app.use(express.json());
app.use(cookieParser()); // used to extrack cookie from browser

app.listen(3000, () => {
  console.log("server running on port 3000");
});

// app.get("/api/user", userRoutes); -> wrong use "use" here
app.use("/api/user", userRoutes);
app.use("/api/auth", authRoutes);

// check below how this middleware works
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal Server Error ";
  res.status(statusCode).json({
    success: false,
    statusCode,
    message,
  });
});

/**. In Express, middleware functions are functions that have access to the request object (req), the response object (res), and the next function in the application’s request-response cycle. These functions can execute any code, make changes to the request and response objects, and end the request-response cycle by sending a response or passing control to another middleware function using the next function. */
