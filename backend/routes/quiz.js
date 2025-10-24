import express from "express";
import Quiz from "../models/Quiz.js";
import User from "../models/User.js";
const router = express.Router();

// Create quiz (teacher)
router.post("/create", async (req, res) => {
  try {
    const quiz = new Quiz(req.body);
    await quiz.save();
    
    // Populate the quiz with teacher and subject info for immediate use
    const populatedQuiz = await Quiz.findById(quiz._id)
      .populate("subjectId", "name")
      .populate("teacherId", "username");
    
    res.status(201).json(populatedQuiz);
  } catch (err) {
    console.error("Create quiz error:", err);
    res.status(400).json({ error: err.message });
  }
});

// Get single quiz by ID
router.get("/:quizId", async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.quizId)
      .populate("subjectId teacherId", "name username");
    
    if (!quiz) {
      return res.status(404).json({ error: "Quiz not found" });
    }
    
    res.json(quiz);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get quizzes for student
router.get("/student/:studentId", async (req, res) => {
  try {
    const quizzes = await Quiz.find({
      date: { $gte: new Date() },
    }).populate("subjectId teacherId", "name username");
    res.json(quizzes);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get quiz results for student (completed quizzes with scores)
router.get("/student/:studentId/results", async (req, res) => {
  try {
    const { studentId } = req.params;
    
    // Find all quizzes where this student has results
    const quizzesWithResults = await Quiz.find({
      "results.studentId": studentId
    }).populate("subjectId teacherId", "name username");

    // Extract student's specific results
    const studentResults = quizzesWithResults.map(quiz => {
      const studentResult = quiz.results.find(
        result => result.studentId.toString() === studentId
      );
      
      return {
        _id: quiz._id,
        title: quiz.title,
        subject: quiz.subjectId?.name || "Unknown",
        teacher: quiz.teacherId?.username || "Unknown",
        score: studentResult?.score || 0,
        completedAt: studentResult?.completedAt || quiz.createdAt,
        completed: true
      };
    });

    // Also get upcoming quizzes (not completed by this student)
    const upcomingQuizzes = await Quiz.find({
      date: { $gte: new Date() },
      "results.studentId": { $ne: studentId }
    }).populate("subjectId teacherId", "name username");

    const upcoming = upcomingQuizzes.map(quiz => ({
      _id: quiz._id,
      title: quiz.title,
      subject: quiz.subjectId?.name || "Unknown",
      teacher: quiz.teacherId?.username || "Unknown",
      dueDate: quiz.date,
      completed: false
    }));

    res.json([...studentResults, ...upcoming]);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Submit quiz score
router.post("/:quizId/submit", async (req, res) => {
  try {
    const { quizId } = req.params;
    const { studentId, score, answers, completedAt } = req.body;

    console.log("Quiz submission received:", { studentId, score, answers });

    const quiz = await Quiz.findById(quizId);
    if (!quiz) {
      return res.status(404).json({ error: "Quiz not found" });
    }

    // Convert answers object to array format for consistent storage
    const answersArray = [];
    if (answers && typeof answers === 'object') {
      // Convert object {0: 1, 1: 2} to array [1, 2]
      for (let i = 0; i < quiz.questions.length; i++) {
        answersArray[i] = answers[i.toString()] !== undefined ? answers[i.toString()] : null;
      }
    }

    console.log("Processed answers array:", answersArray);

    // Check if student already submitted
    const existingResult = quiz.results.find(
      result => result.studentId.toString() === studentId
    );

    if (existingResult) {
      // Update existing result
      existingResult.score = score;
      existingResult.answers = answersArray;
      existingResult.completedAt = completedAt || new Date();
      console.log("Updated existing result");
    } else {
      // Add new result
      quiz.results.push({
        studentId,
        score,
        answers: answersArray,
        completedAt: completedAt || new Date()
      });
      console.log("Added new result");
    }

    await quiz.save();
    console.log("Quiz saved successfully");
    
    res.json({ 
      message: "Quiz submitted successfully", 
      score,
      answers: answersArray
    });
  } catch (err) {
    console.error("Quiz submission error:", err);
    res.status(400).json({ error: err.message });
  }
});

// Get student analytics
router.get("/student/:studentId/analytics", async (req, res) => {
  try {
    const { studentId } = req.params;
    
    const quizzes = await Quiz.find({
      "results.studentId": studentId
    });

    const results = [];
    quizzes.forEach(quiz => {
      const studentResult = quiz.results.find(
        result => result.studentId.toString() === studentId
      );
      if (studentResult) {
        results.push({
          score: studentResult.score,
          date: studentResult.completedAt || quiz.createdAt,
          subject: quiz.subjectId
        });
      }
    });

    // Calculate analytics
    const totalQuizzes = results.length;
    const averageScore = totalQuizzes > 0 
      ? results.reduce((sum, r) => sum + r.score, 0) / totalQuizzes 
      : 0;
    
    const highestScore = totalQuizzes > 0 ? Math.max(...results.map(r => r.score)) : 0;
    const lowestScore = totalQuizzes > 0 ? Math.min(...results.map(r => r.score)) : 0;
    res.json({
      totalQuizzes,
      averageScore: Math.round(averageScore * 100) / 100,
      highestScore,
      lowestScore,
      results: results.sort((a, b) => new Date(a.date) - new Date(b.date))
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
// Get all quiz results for teachers
router.get("/results/all", async (req, res) => {
  try {
    const quizzes = await Quiz.find({
      "results.0": { $exists: true } // Only quizzes with results
    }).populate("subjectId teacherId", "name username teacherSubject");
    const allResults = [];
    for (const quiz of quizzes) {
      for (const result of quiz.results) {
        // Get student details
        const student = await User.findById(result.studentId).select("username email subject");
        
        if (student) {
          // Try to get subject from multiple sources
          let subjectName = "Unknown Subject";
          
          if (quiz.subjectId?.name) {
            subjectName = quiz.subjectId.name;
          } else if (quiz.teacherId?.teacherSubject) {
            subjectName = quiz.teacherId.teacherSubject;
          } else if (student.subject) {
            subjectName = student.subject;
          }
          
          allResults.push({
            studentId: result.studentId,
            studentName: student.username,
            studentEmail: student.email,
            quizId: quiz._id,
            quizTitle: quiz.title,
            subject: subjectName,
            score: result.score,
            completedAt: result.completedAt,
            teacherId: quiz.teacherId?._id,
            teacherName: quiz.teacherId?.username || "Unknown Teacher"
          });
        }
      }
    }
    // Sort by completion date (newest first)
    allResults.sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));

    res.json(allResults);
  } catch (err) {
    console.error("Get all results error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Get recent quizzes created by teacher (for Recent Quiz Activity)
router.get("/teacher/:teacherId/recent", async (req, res) => {
  try {
    const { teacherId } = req.params;
    
    // Get recent quizzes created by this teacher (last 10)
    const recentQuizzes = await Quiz.find({ teacherId })
      .populate("subjectId", "name")
      .populate("teacherId", "username")
      .sort({ createdAt: -1 })
      .limit(10);
    
    // Format the response to include quiz creation info and any results
    const formattedQuizzes = await Promise.all(
      recentQuizzes.map(async (quiz) => {
        const resultCount = quiz.results.length;
        const avgScore = resultCount > 0 
          ? Math.round(quiz.results.reduce((sum, r) => sum + r.score, 0) / resultCount)
          : 0;
        
        return {
          _id: quiz._id,
          title: quiz.title,
          subject: quiz.subjectId?.name || "Unknown Subject",
          createdAt: quiz.createdAt,
          resultCount,
          avgScore,
          status: resultCount > 0 ? "completed" : "pending"
        };
      })
    );
    
    res.json(formattedQuizzes);
  } catch (err) {
    console.error("Get teacher recent quizzes error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Get quiz results for specific teacher only
router.get("/results/teacher/:teacherId", async (req, res) => {
  try {
    const { teacherId } = req.params;
    
    // Find only quizzes created by this teacher that have results
    const quizzes = await Quiz.find({
      teacherId: teacherId,
      "results.0": { $exists: true } // Only quizzes with results
    }).populate("subjectId teacherId", "name username teacherSubject");
    
    const teacherResults = [];
    for (const quiz of quizzes) {
      for (const result of quiz.results) {
        // Get student details
        const student = await User.findById(result.studentId).select("username email subject");
        
        if (student) {
          // Try to get subject from multiple sources
          let subjectName = "Unknown Subject";
          
          if (quiz.subjectId?.name) {
            subjectName = quiz.subjectId.name;
          } else if (quiz.teacherId?.teacherSubject) {
            subjectName = quiz.teacherId.teacherSubject;
          } else if (student.subject) {
            subjectName = student.subject;
          }
          
          teacherResults.push({
            studentId: result.studentId,
            studentName: student.username,
            studentEmail: student.email,
            quizId: quiz._id,
            quizTitle: quiz.title,
            subject: subjectName,
            score: result.score,
            completedAt: result.completedAt,
            teacherId: quiz.teacherId?._id,
            teacherName: quiz.teacherId?.username || "Unknown Teacher"
          });
        }
      }
    }
    
    // Sort by completion date (newest first)
    teacherResults.sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));

    res.json(teacherResults);
  } catch (err) {
    console.error("Get teacher results error:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;