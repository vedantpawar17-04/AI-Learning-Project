import express from "express";
import User from "../models/User.js";

const router = express.Router();

// Create a simple feedback model using User schema
// We'll store feedback in a separate collection or add it to User model
// For now, let's create a simple feedback system

// Send feedback from teacher to student
router.post("/send", async (req, res) => {
  try {
    const { studentId, teacherId, message, subject } = req.body;

    console.log("Feedback request:", { studentId, teacherId, message, subject });

    // Validate that message has actual content
    if (!message || message.trim().length === 0) {
      return res.status(400).json({ error: "Feedback message cannot be empty" });
    }

    // Verify student exists
    const student = await User.findById(studentId);
    if (!student || student.role !== "student") {
      return res.status(404).json({ error: "Student not found" });
    }

    // Handle teacher - check if teacherId is a valid ObjectId
    let teacherName = "System Teacher";
    let validTeacherId = null;
    
    if (teacherId && teacherId !== "teacher123") {
      try {
        // Check if it's a valid ObjectId format
        if (teacherId.match(/^[0-9a-fA-F]{24}$/)) {
          const teacher = await User.findById(teacherId);
          if (teacher && teacher.role === "teacher") {
            teacherName = teacher.username;
            validTeacherId = teacherId;
          }
        }
      } catch (teacherError) {
        console.log("Teacher lookup failed, using default:", teacherError.message);
      }
    }

    // For now, we'll store feedback in the student's document
    // In a real app, you'd want a separate Feedback model
    if (!student.feedback) {
      student.feedback = [];
    }

    student.feedback.push({
      teacherId: validTeacherId,
      teacherName: teacherName,
      message: message.trim(),
      subject: subject || "General Feedback",
      createdAt: new Date()
    });

    await student.save();

    res.status(201).json({ 
      message: "Feedback sent successfully",
      feedback: {
        teacherName: teacherName,
        message: message.trim(),
        subject: subject || "General Feedback",
        createdAt: new Date()
      }
    });
  } catch (err) {
    console.error("Send feedback error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Get feedback for a student
router.get("/student/:studentId", async (req, res) => {
  try {
    const { studentId } = req.params;

    const student = await User.findById(studentId).select("feedback");
    if (!student) {
      return res.status(404).json({ error: "Student not found" });
    }

    // Sort feedback by date (newest first)
    const feedback = (student.feedback || []).sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );

    res.json(feedback);
  } catch (err) {
    console.error("Get feedback error:", err);
    res.status(400).json({ error: err.message });
  }
});

// Send feedback from student to teacher (for student feedback modal)
router.post("/student-to-teacher", async (req, res) => {
  try {
    const { studentId, teacherId, message, subject, studentName } = req.body;

    console.log("Student to teacher feedback:", { studentId, teacherId, message, subject, studentName });

    // Validate that message has actual content
    if (!message || message.trim().length === 0) {
      return res.status(400).json({ error: "Feedback message cannot be empty" });
    }

    // Verify teacher exists
    const teacher = await User.findById(teacherId);
    if (!teacher || teacher.role !== "teacher") {
      return res.status(404).json({ error: "Teacher not found" });
    }

    // Verify student exists
    const student = await User.findById(studentId);
    if (!student || student.role !== "student") {
      return res.status(404).json({ error: "Student not found" });
    }

    // For now, we'll store this feedback in the teacher's document
    // In a real app, you'd want a separate Feedback model
    if (!teacher.receivedFeedback) {
      teacher.receivedFeedback = [];
    }

    teacher.receivedFeedback.push({
      studentId: studentId,
      studentName: studentName || student.username,
      message: message.trim(),
      subject: subject || "General Feedback",
      createdAt: new Date()
    });

    await teacher.save();

    res.status(201).json({ 
      message: "Feedback sent to teacher successfully",
      feedback: {
        studentName: studentName || student.username,
        message: message.trim(),
        subject: subject || "General Feedback",
        createdAt: new Date()
      }
    });
  } catch (err) {
    console.error("Student to teacher feedback error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Create sample feedback (for testing)
router.post("/create-sample", async (req, res) => {
  try {
    const { studentId } = req.body;

    const student = await User.findById(studentId);
    if (!student || student.role !== "student") {
      return res.status(404).json({ error: "Student not found" });
    }

    // Create sample feedback from different teachers
    const sampleFeedbacks = [
      {
        teacherId: null,
        teacherName: "Prof. ADBMS",
        message: "Great progress in database concepts! Your understanding of normalization is excellent. Keep practicing complex queries.",
        subject: "ADBMS",
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) // 2 days ago
      },
      {
        teacherId: null,
        teacherName: "Prof. STQA",
        message: "Your test case design skills are improving. Focus more on edge cases and boundary value analysis.",
        subject: "STQA", 
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) // 1 day ago
      },
      {
        teacherId: null,
        teacherName: "Prof. DevOps",
        message: "Excellent work on CI/CD pipeline setup! Your Docker containerization approach is very clean.",
        subject: "DevOps",
        createdAt: new Date() // Today
      }
    ];

    // Initialize feedback array if it doesn't exist
    if (!student.feedback) {
      student.feedback = [];
    }

    // Add sample feedbacks
    student.feedback.push(...sampleFeedbacks);
    await student.save();

    res.status(201).json({ 
      message: "Sample feedback created successfully",
      feedbacks: sampleFeedbacks
    });
  } catch (err) {
    console.error("Create sample feedback error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Get feedback received by teacher from students
router.get("/teacher/:teacherId", async (req, res) => {
  try {
    const { teacherId } = req.params;

    const teacher = await User.findById(teacherId).select("receivedFeedback");
    if (!teacher) {
      return res.status(404).json({ error: "Teacher not found" });
    }

    // Filter out empty feedback and sort by date (newest first)
    const feedback = (teacher.receivedFeedback || [])
      .filter(fb => fb.message && fb.message.trim().length > 0) // Only show feedback with actual content
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json(feedback);
  } catch (err) {
    console.error("Get teacher feedback error:", err);
    res.status(400).json({ error: err.message });
  }
});

export default router;