import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ["student", "teacher", "parent"],
      required: true,
    },
    // ✅ Only for students - now supports multiple subjects
    subject: {
      type: [String], // Array of subjects
      default: []
    },
    teacherId: {
      type: [mongoose.Schema.Types.ObjectId], // Array of teacher IDs
      ref: "User",
      default: []
    },
    // ✅ Only for teachers - now supports multiple subjects
    teacherSubject: {
      type: [String], // Array of subjects
      default: []
    },
    // ✅ Feedback for students (from teachers)
    feedback: [{
      teacherId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
      },
      teacherName: String,
      message: String,
      subject: String,
      createdAt: {
        type: Date,
        default: Date.now
      }
    }],
  },
  { timestamps: true }
);

const User = mongoose.models.User || mongoose.model("User", userSchema);
export default User;
