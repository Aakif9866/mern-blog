// backend
import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import userRoutes from "./routes/user.route.js";
import authRoutes from "./routes/auth.route.js";

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

app.listen(3000, () => {
  console.log("server running on port 3000");
});

// app.get("/api/user", userRoutes); -> wrong use "use" here
app.use("/api/user", userRoutes);
app.use("/api/auth", authRoutes);
