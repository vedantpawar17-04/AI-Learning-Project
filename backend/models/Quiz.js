import mongoose from "mongoose";

const questionSchema = new mongoose.Schema({
  questionText: String,
  options: [String],
  correctAnswer: Number,
});

const resultSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  score: Number,
  answers: [mongoose.Schema.Types.Mixed], // Store student's answers
  completedAt: { type: Date, default: Date.now },
});

const quizSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    subjectId: { type: mongoose.Schema.Types.ObjectId, ref: "Subject" },
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    date: Date,
    questions: [questionSchema],
    results: [resultSchema],
  },
  { timestamps: true }
);

export default mongoose.model("Quiz", quizSchema);
