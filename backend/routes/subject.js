// routes/subject.js
import express from "express";
import Subject from "../models/Subject.js";
import User from "../models/User.js";

const router = express.Router();

/* ===========================
   Create a new subject
   =========================== */
router.post("/create", async (req, res) => {
  try {
    const { name, teacher } = req.body;

    // Validate input
    if (!name || !teacher) {
      return res.status(400).json({ msg: "Name and teacherId are required" });
    }

    // Check if subject already exists
    const existingSubject = await Subject.findOne({ name });
    if (existingSubject) {
      return res.status(200).json(existingSubject);
    }

    // Create and save new subject
    const newSubject = new Subject({ name, teacher });
    await newSubject.save();

    // Respond with created subject
    res.status(201).json(newSubject);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});
/* ===========================
   Get all subjects (with teacher info)
   =========================== */
router.get("/", async (req, res) => {
  try {
    const subjects = await Subject.find().populate("teacher", "username email");
    res.status(200).json(subjects);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});
// Get teachers by subject name
router.get("/teachers/:subjectName", async (req, res) => {
  try {
    const { subjectName } = req.params;

    const teachers = await User.find({
      role: "teacher",
      teacherSubject: { $in: [subjectName] }, // now searches in array
    }).select("_id username email teacherSubject");

    res.json(teachers);
  } catch (err) {
    console.error("Error fetching teachers:", err);
    res.status(500).json({ msg: "Server error" });
  }
});
export default router;
