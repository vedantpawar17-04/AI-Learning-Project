import express from "express";
import bcrypt from "bcryptjs";
import User from "../models/User.js";

const router = express.Router();

// ===========================
// User Signup
// ===========================
// routes/auth.js (signup)
router.post("/signup", async (req, res) => {
  try {
    const { username, email, password, role, subject, teacherId, teacherSubject } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ msg: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      username,
      email,
      password: hashedPassword,
      role,
      subject: role === "student" ? (Array.isArray(subject) ? subject : [subject]) : [],
      teacherId: role === "student" ? (Array.isArray(teacherId) ? teacherId : [teacherId]) : [],
      teacherSubject: role === "teacher" ? (Array.isArray(teacherSubject) ? teacherSubject : [teacherSubject]) : [],
    });

    await newUser.save();

    res.status(201).json({ msg: "User registered successfully", user: newUser });
  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).json({ msg: "Server error" });
  }
});

// ===========================
// User Login
// ===========================

router.post("/login", async (req, res) => {
  try {
    const { email, password, role, subject, teacherId, teacherSubject } = req.body;

    // 1️⃣ Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ msg: "❌ Invalid credentials" });
    }

    // 2️⃣ Check role
    if (user.role !== role) {
      return res.status(400).json({ msg: "❌ Role mismatch" });
    }

    // 3️⃣ Verify password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ msg: "❌ Invalid credentials" });
    }

    // 4️⃣ For students, validate subjects and teachers (optional validation)
    if (role === "student" && subject && teacherId) {
      const userSubjects = Array.isArray(user.subject) ? user.subject : [];
      const userTeachers = Array.isArray(user.teacherId) ? user.teacherId : [];
      const loginSubjects = Array.isArray(subject) ? subject : [];
      const loginTeachers = Array.isArray(teacherId) ? teacherId : [];

      // Check if at least one subject matches
      const hasMatchingSubject = loginSubjects.some(s => userSubjects.includes(s));
      const hasMatchingTeacher = loginTeachers.some(t => userTeachers.includes(t));

      if (!hasMatchingSubject || !hasMatchingTeacher) {
        return res.status(400).json({ 
          msg: "❌ Selected subjects or teachers don't match your registration" 
        });
      }
    }

    // 5️⃣ For teachers, validate teaching subjects (optional validation)
    if (role === "teacher" && teacherSubject) {
      const userTeacherSubjects = Array.isArray(user.teacherSubject) ? user.teacherSubject : [];
      const loginTeacherSubjects = Array.isArray(teacherSubject) ? teacherSubject : [];

      // Check if at least one teaching subject matches
      const hasMatchingTeacherSubject = loginTeacherSubjects.some(s => userTeacherSubjects.includes(s));

      if (userTeacherSubjects.length > 0 && !hasMatchingTeacherSubject) {
        return res.status(400).json({ 
          msg: "❌ Selected teaching subjects don't match your registration" 
        });
      }
    }

    // 6️⃣ Success response (no JWT)
    res.status(200).json({
      msg: "✅ Login successful",
      user: {
        _id: user._id,
        username: user.username,
        role: user.role,
        subject: user.subject || [],
        teacherId: user.teacherId || [],
        teacherSubjects: user.teacherSubject || [],
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ msg: "Server error" });
  }
});

// ===========================
// Get User Data for Auto-population
// ===========================
router.post("/getUserData", async (req, res) => {
  try {
    const { email, username, role } = req.body;

    if (!username || !role) {
      return res.status(400).json({ 
        success: false, 
        msg: "❌ Username and role are required" 
      });
    }

    // Build query based on role
    let query = {
      username: { $regex: new RegExp(`^${username}$`, 'i') }, // Case-insensitive username match
      role 
    };

    // For students, also require email for additional security
    if (role === "student" && email) {
      query.email = email.toLowerCase();
    } else if (role === "student" && !email) {
      return res.status(400).json({ 
        success: false, 
        msg: "❌ Email is required for student accounts" 
      });
    }

    // For teachers, username alone is sufficient
    const user = await User.findOne(query);

    if (!user) {
      return res.status(404).json({ 
        success: false, 
        msg: "❌ User not found with provided credentials" 
      });
    }

    let responseData = {
      _id: user._id,
      username: user.username,
      email: user.email,
      role: user.role
    };

    if (role === "student") {
      // For students, get their assigned subjects and teacher details
      const teacherIds = Array.isArray(user.teacherId) ? user.teacherId : [];
      let teacherDetails = [];

      if (teacherIds.length > 0) {
        teacherDetails = await User.find({ 
          _id: { $in: teacherIds }, 
          role: "teacher" 
        }).select("username email teacherSubject");
      }

      responseData = {
        ...responseData,
        subject: user.subject || [],
        teacherId: user.teacherId || [],
        teacherDetails: teacherDetails.map(teacher => ({
          _id: teacher._id,
          username: teacher.username,
          email: teacher.email,
          teacherSubjects: teacher.teacherSubject || []
        }))
      };
    } else if (role === "teacher") {
      // For teachers, get their teaching subjects
      responseData = {
        ...responseData,
        teacherSubjects: user.teacherSubject || []
      };
    }

    res.status(200).json({ 
      success: true, 
      user: responseData 
    });
  } catch (err) {
    console.error("Get user data error:", err);
    res.status(500).json({ 
      success: false, 
      msg: "Server error" 
    });
  }
});

// ===========================
// Verify Email
// ===========================
router.post("/verify-email", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ msg: "❌ Email required" });

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ msg: "❌ User not found" });

    res.status(200).json({ msg: "✅ Email verified" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});

// ===========================
// Forgot Password
// ===========================
router.post("/forgot-password", async (req, res) => {
  try {
    const { email, newPassword } = req.body;

    if (!email || !newPassword) {
      return res
        .status(400)
        .json({ msg: "❌ Email and new password required" });
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ msg: "❌ User not found" });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    user.password = hashedPassword;
    await user.save();

    res.status(200).json({ msg: "✅ Password reset successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});
// ===========================
// Get Teacher by ID
// ===========================
router.get("/teacher/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const teacher = await User.findById(id).select("username email role teacherSubject");

    if (!teacher || teacher.role !== "teacher") {
      return res.status(404).json({ msg: "❌ Teacher not found" });
    }

    res.status(200).json({
      username: teacher.username,
      email: teacher.email,
      teacherSubject: teacher.teacherSubject || [],
    });
  } catch (err) {
    console.error("Get teacher error:", err);
    res.status(500).json({ msg: "Server error" });
  }
});

// ===========================
// Update Student Subjects (now supports multiple)
// ===========================
router.put("/student/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { subject, teacherId } = req.body;

    const student = await User.findById(id);
    if (!student || student.role !== "student") {
      return res.status(404).json({ msg: "❌ Student not found" });
    }

    // Handle both single and multiple subjects
    if (subject !== undefined) {
      student.subject = Array.isArray(subject) ? subject : [subject];
    }
    
    // Handle both single and multiple teacher IDs
    if (teacherId !== undefined) {
      student.teacherId = Array.isArray(teacherId) ? teacherId : [teacherId];
    }

    await student.save();

    res.status(200).json({
      msg: "✅ Subjects updated successfully",
      student: {
        _id: student._id,
        username: student.username,
        subject: student.subject,
        teacherId: student.teacherId
      }
    });
  } catch (err) {
    console.error("Update student error:", err);
    res.status(500).json({ msg: "Server error" });
  }
});

// ===========================
// Get Student by ID
// ===========================
router.get("/student/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const student = await User.findById(id).select("username email role subject teacherId");

    if (!student || student.role !== "student") {
      return res.status(404).json({ msg: "❌ Student not found" });
    }

    res.status(200).json({
      _id: student._id,
      username: student.username,
      email: student.email,
      subject: student.subject,
      teacherId: student.teacherId
    });
  } catch (err) {
    console.error("Get student error:", err);
    res.status(500).json({ msg: "Server error" });
  }
});

// ===========================
// Get All Students (for teachers)
// ===========================
router.get("/students", async (req, res) => {
  try {
    const students = await User.find({ role: "student" })
      .select("username email subject teacherId createdAt")
      .sort({ createdAt: -1 });

    // You could add quiz statistics here by aggregating from Quiz model
    const studentsWithStats = students.map(student => ({
      _id: student._id,
      username: student.username,
      email: student.email,
      subject: student.subject && student.subject.length > 0 ? student.subject : ['Not Assigned'],
      teacherId: student.teacherId || [],
      createdAt: student.createdAt,
      completedQuizzes: 0, // This would be calculated from Quiz results
      averageScore: 0 // This would be calculated from Quiz results
    }));

    res.status(200).json(studentsWithStats);
  } catch (err) {
    console.error("Get students error:", err);
    res.status(500).json({ msg: "Server error" });
  }
});

// Get Students by Teacher ID (for specific teacher dashboard)
// ===========================
router.get("/students/teacher/:teacherId", async (req, res) => {
  try {
    const { teacherId } = req.params;
    
    // Find only students assigned to this specific teacher
    const students = await User.find({ 
      role: "student", 
      teacherId: teacherId 
    })
      .select("username email subject teacherId createdAt")
      .sort({ createdAt: -1 });

    const studentsWithStats = students.map(student => ({
      _id: student._id,
      username: student.username,
      email: student.email,
      subject: student.subject && student.subject.length > 0 ? student.subject : ['Not Assigned'],
      teacherId: student.teacherId || [],
      createdAt: student.createdAt,
      completedQuizzes: 0, // This would be calculated from Quiz results
      averageScore: 0 // This would be calculated from Quiz results
    }));

    res.status(200).json(studentsWithStats);
  } catch (err) {
    console.error("Get teacher students error:", err);
    res.status(500).json({ msg: "Server error" });
  }
});
export default router;