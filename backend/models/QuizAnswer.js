import mongoose from "mongoose";

const quizAnswerSchema = new mongoose.Schema(
  {
    quizId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Quiz",
      required: true
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    answers: [{
      questionIndex: {
        type: Number,
        required: true
      },
      selectedOption: {
        type: Number,
        required: true
      },
      isCorrect: {
        type: Boolean,
        required: true
      }
    }],
    score: {
      type: Number,
      required: true
    },
    totalQuestions: {
      type: Number,
      required: true
    },
    correctAnswers: {
      type: Number,
      required: true
    },
    completedAt: {
      type: Date,
      default: Date.now
    }
  },
  { timestamps: true }
);

// Create compound index for efficient queries
quizAnswerSchema.index({ quizId: 1, studentId: 1 }, { unique: true });

const QuizAnswer = mongoose.models.QuizAnswer || mongoose.model("QuizAnswer", quizAnswerSchema);

export default QuizAnswer;