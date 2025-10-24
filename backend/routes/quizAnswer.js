import express from "express";
import QuizAnswer from "../models/QuizAnswer.js";
import Quiz from "../models/Quiz.js";
import User from "../models/User.js";
import Subject from "../models/Subject.js";

const router = express.Router();

// Submit quiz answers
router.post("/submit", async (req, res) => {
    try {
        const { quizId, studentId, answers, score } = req.body;

        console.log("Quiz answer submission:", { quizId, studentId, answers, score });

        // Fetch quiz to get correct answers
        const quiz = await Quiz.findById(quizId);
        if (!quiz) {
            return res.status(404).json({ error: "Quiz not found" });
        }

        // Verify student exists
        const student = await User.findById(studentId);
        if (!student) {
            return res.status(404).json({ error: "Student not found" });
        }

        // Process answers and calculate correctness
        const processedAnswers = [];
        let correctCount = 0;

        for (let i = 0; i < quiz.questions.length; i++) {
            const studentAnswer = answers[i.toString()]; // Get from object format
            const correctAnswer = quiz.questions[i].correctAnswer;
            const isCorrect = studentAnswer === correctAnswer;

            if (isCorrect) correctCount++;

            processedAnswers.push({
                questionIndex: i,
                selectedOption: studentAnswer,
                isCorrect: isCorrect
            });
        }

        // Check if student already submitted
        const existingAnswer = await QuizAnswer.findOne({ quizId, studentId });

        if (existingAnswer) {
            // Update existing submission
            existingAnswer.answers = processedAnswers;
            existingAnswer.score = score;
            existingAnswer.correctAnswers = correctCount;
            existingAnswer.completedAt = new Date();
            await existingAnswer.save();

            console.log("Updated existing quiz answer");
        } else {
            // Create new submission
            const newQuizAnswer = new QuizAnswer({
                quizId,
                studentId,
                answers: processedAnswers,
                score,
                totalQuestions: quiz.questions.length,
                correctAnswers: correctCount
            });

            await newQuizAnswer.save();
            console.log("Created new quiz answer");
        }

        // Also update the original Quiz model for backward compatibility
        const existingResult = quiz.results.find(
            result => result.studentId.toString() === studentId
        );

        if (existingResult) {
            existingResult.score = score;
            existingResult.answers = Object.values(answers);
            existingResult.completedAt = new Date();
        } else {
            quiz.results.push({
                studentId,
                score,
                answers: Object.values(answers),
                completedAt: new Date()
            });
        }

        await quiz.save();

        // Note: Automatic feedback generation can be added here if needed

        res.json({
            message: "Quiz answers submitted successfully",
            score,
            correctAnswers: correctCount,
            totalQuestions: quiz.questions.length
        });

    } catch (err) {
        console.error("Quiz answer submission error:", err);
        res.status(500).json({ error: err.message });
    }
});

// Get quiz answers for review
router.get("/:quizId/:studentId", async (req, res) => {
    try {
        const { quizId, studentId } = req.params;

        const quizAnswer = await QuizAnswer.findOne({ quizId, studentId })
            .populate("quizId", "title questions")
            .populate("studentId", "username email");

        if (!quizAnswer) {
            return res.status(404).json({ error: "Quiz answers not found" });
        }

        res.json(quizAnswer);
    } catch (err) {
        console.error("Get quiz answers error:", err);
        res.status(500).json({ error: err.message });
    }
});

// Get all quiz answers for a student
router.get("/student/:studentId", async (req, res) => {
    try {
        const { studentId } = req.params;

        const quizAnswers = await QuizAnswer.find({ studentId })
            .populate("quizId", "title subjectId")
            .populate({
                path: "quizId",
                populate: {
                    path: "subjectId",
                    select: "name"
                }
            })
            .sort({ completedAt: -1 });

        res.json(quizAnswers);
    } catch (err) {
        console.error("Get student quiz answers error:", err);
        res.status(500).json({ error: err.message });
    }
});

// Get quiz results for teacher
router.get("/quiz/:quizId/results", async (req, res) => {
    try {
        const { quizId } = req.params;

        const results = await QuizAnswer.find({ quizId })
            .populate("studentId", "username email")
            .populate("quizId", "title")
            .sort({ completedAt: -1 });

        res.json(results);
    } catch (err) {
        console.error("Get quiz results error:", err);
        res.status(500).json({ error: err.message });
    }
});

// Get student dashboard data (completed + upcoming quizzes)
router.get("/student/:studentId/dashboard", async (req, res) => {
    try {
        const { studentId } = req.params;

        console.log("Fetching dashboard data for student:", studentId);

        // Get student info to check their subjects and teachers
        const student = await User.findById(studentId);
        if (!student) {
            return res.status(404).json({ error: "Student not found" });
        }

        console.log("Student subjects:", student.subject);
        console.log("Student teachers:", student.teacherId);

        // Get completed quizzes from QuizAnswer
        const completedQuizzes = await QuizAnswer.find({ studentId })
            .populate("quizId", "title subjectId teacherId")
            .populate({
                path: "quizId",
                populate: [
                    { path: "subjectId", select: "name" },
                    { path: "teacherId", select: "username" }
                ]
            })
            .sort({ completedAt: -1 });

        console.log("Completed quizzes found:", completedQuizzes.length);

        // Get ALL available quizzes (remove date restriction for now)
        const allQuizzes = await Quiz.find({})
            .populate("subjectId", "name")
            .populate("teacherId", "username");

        console.log("All quizzes in database:", allQuizzes.length);

        // Debug: Log first quiz details
        if (allQuizzes.length > 0) {
            const firstQuiz = allQuizzes[0];
            console.log("Sample quiz structure:", {
                title: firstQuiz.title,
                subjectId: firstQuiz.subjectId,
                teacherId: firstQuiz.teacherId,
                subjectName: firstQuiz.subjectId?.name,
                teacherName: firstQuiz.teacherId?.username
            });
        }

        // Get completed quiz IDs
        const completedQuizIds = completedQuizzes.map(cq => cq.quizId?._id?.toString()).filter(Boolean);

        console.log("Completed quiz IDs:", completedQuizIds);

        // Filter quizzes that are relevant to this student
        // Only show quizzes for subjects the student is assigned to AND not completed
        const studentSubjects = Array.isArray(student.subject) ? student.subject : [];
        const studentTeachers = Array.isArray(student.teacherId) ? student.teacherId : [];

        console.log("Student assigned subjects:", studentSubjects);
        console.log("Student assigned teachers:", studentTeachers);

        const upcomingQuizzes = allQuizzes.filter(quiz => {
            const isNotCompleted = !completedQuizIds.includes(quiz._id.toString());

            // Check if quiz subject matches student's assigned subjects
            const quizSubject = quiz.subjectId?.name;
            const quizSubjectId = quiz.subjectId?._id?.toString();

            // More flexible subject matching - check both name and ID
            const isAssignedSubject = studentSubjects.includes(quizSubject) ||
                studentSubjects.includes(quizSubjectId);

            // Check if quiz teacher matches student's assigned teachers
            const quizTeacherId = quiz.teacherId?._id?.toString();
            const studentTeachersStr = Array.isArray(student.teacherId) ? student.teacherId.map(id => id.toString()) : [];
            const isAssignedTeacher = studentTeachersStr.includes(quizTeacherId);

            // For debugging: temporarily remove ALL validation to see if quizzes show up
            // Show quiz if:
            // 1. Student hasn't completed it
            const shouldShow = isNotCompleted; // Removed ALL validation temporarily for debugging

            console.log(`Quiz "${quiz.title}": 
                - subject="${quizSubject}" (ID: ${quizSubjectId})
                - teacher="${quiz.teacherId?.username}" (ID: ${quizTeacherId})
                - completed=${!isNotCompleted}
                - assignedSubject=${isAssignedSubject}
                - assignedTeacher=${isAssignedTeacher}
                - studentSubjects=${JSON.stringify(studentSubjects)}
                - studentTeachers=${JSON.stringify(studentTeachersStr)}
                - shouldShow=${shouldShow}`);

            return shouldShow;
        });

        console.log("Upcoming quizzes found (after subject/teacher validation):", upcomingQuizzes.length);

        // Log which quizzes were filtered out for debugging
        const filteredOutQuizzes = allQuizzes.filter(quiz => {
            const isNotCompleted = !completedQuizIds.includes(quiz._id.toString());
            const quizSubject = quiz.subjectId?.name;
            const isAssignedSubject = studentSubjects.includes(quizSubject);
            const quizTeacherId = quiz.teacherId?._id?.toString();
            const isAssignedTeacher = studentTeachers.includes(quizTeacherId);
            const shouldShow = isNotCompleted && isAssignedSubject && isAssignedTeacher;
            return !shouldShow && isNotCompleted; // Quizzes that are not completed but filtered out
        });

        console.log("Quizzes filtered out due to subject/teacher mismatch:", filteredOutQuizzes.length);
        filteredOutQuizzes.forEach(quiz => {
            console.log(`- Filtered: "${quiz.title}" (Subject: ${quiz.subjectId?.name}, Teacher: ${quiz.teacherId?.username})`);
        });

        // Format completed quizzes
        const formattedCompleted = completedQuizzes.map(cq => ({
            _id: cq.quizId?._id,
            title: cq.quizId?.title || "Unknown Quiz",
            subject: cq.quizId?.subjectId?.name || "Unknown Subject",
            teacher: cq.quizId?.teacherId?.username || "Unknown Teacher",
            score: cq.score,
            completedAt: cq.completedAt,
            completed: true
        })).filter(quiz => quiz._id); // Remove any invalid entries

        // Format upcoming quizzes
        const formattedUpcoming = upcomingQuizzes.map(quiz => ({
            _id: quiz._id,
            title: quiz.title,
            subject: quiz.subjectId?.name || "Unknown Subject",
            teacher: quiz.teacherId?.username || "Unknown Teacher",
            dueDate: quiz.date || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Default to 7 days from now
            completed: false
        }));

        console.log("Formatted completed:", formattedCompleted.length);
        console.log("Formatted upcoming:", formattedUpcoming.length);

        res.json({
            completed: formattedCompleted,
            upcoming: formattedUpcoming,
            totalCompleted: formattedCompleted.length,
            totalUpcoming: formattedUpcoming.length,
            averageScore: formattedCompleted.length > 0 ?
                Math.round(formattedCompleted.reduce((sum, q) => sum + q.score, 0) / formattedCompleted.length) : 0
        });

    } catch (err) {
        console.error("Get student dashboard data error:", err);
        res.status(500).json({ error: err.message });
    }
});
// Debug endpoint to check subjects and their relationships
router.get("/debug/subjects", async (req, res) => {
    try {
        const subjects = await Subject.find({});
        const quizzes = await Quiz.find({}).populate("subjectId", "name");

        res.json({
            subjects: subjects,
            quizzes: quizzes.map(q => ({
                title: q.title,
                subjectId: q.subjectId,
                subjectName: q.subjectId?.name
            }))
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;