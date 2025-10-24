import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();

// Middleware
app.use(express.json());
app.use(cors());


// Routes
import authRoutes from "./routes/auth.js";
app.use("/api/auth", authRoutes);

// Subject-route
import subjectRoutes from "./routes/subject.js";
app.use("/api/subjects", subjectRoutes);

// Dashboard-route
import dashboardRoutes from "./routes/dashboard.js";
app.use("/api/dashboard", dashboardRoutes);

//Quiz Routes
import quizRoutes from "./routes/quiz.js";
app.use("/api/quiz", quizRoutes);

//Feedback Routes
import feedbackRoutes from "./routes/feedback.js";
app.use("/api/feedback", feedbackRoutes);

//Quiz Answer Routes
import quizAnswerRoutes from "./routes/quizAnswer.js";
app.use("/api/quiz-answer", quizAnswerRoutes);

// AI analytics routes
import aiRoutes from "./routes/ai.js";
app.use("/api/ai", aiRoutes);


// Connect MongoDB
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.error("❌ MongoDB Error:", err));

// Start server
const PORT = process.env.PORT;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
