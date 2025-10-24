// routes/dashboard.js
import express from "express";
import User from "../models/User.js";
import Subject from "../models/Subject.js";

const router = express.Router();

/* ===========================
   Dashboard Stats (for Admin)
   =========================== */
router.get("/stats", async (req, res) => {
  try {
    const studentsCount = await User.countDocuments({ role: "student" });
    const teachersCount = await User.countDocuments({ role: "teacher" });
    const subjectsCount = await Subject.countDocuments();

    res.json({
      students: studentsCount,
      teachers: teachersCount,
      subjects: subjectsCount,
    });
  } catch (err) {
    console.error("Dashboard stats error:", err);
    res.status(500).json({ msg: "Server error" });
  }
});

/* ===========================
   Students per Subject (Updated for arrays)
   =========================== */
router.get("/students-per-subject", async (req, res) => {
  try {
    const data = await User.aggregate([
      { $match: { role: "student" } },
      { $unwind: "$subject" }, // Unwind the subject array
      {
        $group: {
          _id: "$subject",
          studentCount: { $sum: 1 },
          students: { $push: { _id: "$_id", username: "$username" } }
        },
      },
      {
        $project: {
          name: "$_id",
          studentCount: 1,
          students: 1,
          _id: 0,
        },
      },
    ]);

    res.json(data);
  } catch (err) {
    console.error("Students per subject error:", err);
    res.status(500).json({ msg: "Server error" });
  }
});

/* ===========================
   Teachers per Subject (Updated for arrays)
   =========================== */
router.get("/teachers-per-subject", async (req, res) => {
  try {
    const data = await User.aggregate([
      { $match: { role: "teacher" } },
      { $unwind: "$teacherSubject" }, // Unwind the teacherSubject array
      {
        $group: {
          _id: "$teacherSubject",
          teacherCount: { $sum: 1 },
          teachers: { $push: { _id: "$_id", username: "$username" } }
        },
      },
      {
        $project: {
          subject: "$_id",
          teacherCount: 1,
          teachers: 1,
          _id: 0,
        },
      },
    ]);

    res.json(data);
  } catch (err) {
    console.error("Teachers per subject error:", err);
    res.status(500).json({ msg: "Server error" });
  }
});

/* ===========================
   Student Dashboard - Subject-wise Distribution
   =========================== */
router.get("/student/:studentId/subjects", async (req, res) => {
  try {
    const { studentId } = req.params;
    
    // Get student with populated teacher info
    const student = await User.findById(studentId)
      .populate('teacherId', 'username email teacherSubject')
      .select('username subject teacherId');

    if (!student || student.role !== 'student') {
      return res.status(404).json({ msg: "Student not found" });
    }

    // Create subject-wise distribution
    const subjectDistribution = student.subject.map((subjectName, index) => {
      const teacherId = student.teacherId[index];
      const teacher = Array.isArray(student.teacherId) ? 
        student.teacherId.find(t => t._id.toString() === teacherId?.toString()) : 
        student.teacherId;

      return {
        subject: subjectName,
        teacher: teacher ? {
          _id: teacher._id,
          username: teacher.username,
          email: teacher.email
        } : null,
        // You can add quiz stats here later
        completedQuizzes: 0,
        averageScore: 0,
        totalQuizzes: 0
      };
    });

    res.json({
      student: {
        _id: student._id,
        username: student.username
      },
      subjects: subjectDistribution
    });

  } catch (err) {
    console.error("Student subjects error:", err);
    res.status(500).json({ msg: "Server error" });
  }
});

export default router;
