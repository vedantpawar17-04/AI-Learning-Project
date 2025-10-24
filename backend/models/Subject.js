import mongoose from "mongoose";

const subjectSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    teacher: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

// Use existing model if it exists (avoids OverwriteModelError)
const Subject =
  mongoose.models.Subject || mongoose.model("Subject", subjectSchema);

export default Subject;
