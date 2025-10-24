import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Login from "./screen/Login";
import SignUp from "./screen/SignUp";
import ForgotPassword from "./screen/ForgotPassword";
import StudentDashboard from "./screen/StudentDashboard";
import TeacherDashboard from "./screen/TeacherDashboard";
import QuizList from "./screen/QuizList";
import QuizPage from "./screen/QuizPage";
import QuizReview from "./screen/QuizReview";

function App() {
  return (
    <Router>
      <Routes>
        {/* Sign-up Route */}
        <Route path="/" element={<SignUp />} />

        {/* Login Route */}
        <Route path="/login" element={<Login />} />

        {/* Forgot-password Route */}
        <Route path="/forgot-password" element={<ForgotPassword />} />

        {/* Student Dashboard Route */}
        <Route path="/student-dashboard" element={<StudentDashboard />} />

        {/* Teacher Dashboard Route */}
        <Route path="/teacher-dashboard" element={<TeacherDashboard />} />

        {/* Quiz Routes */}
        <Route path="/quiz" element={<QuizList />} />
        <Route path="/quiz/:quizId" element={<QuizPage />} />
        <Route path="/quiz-review/:quizId" element={<QuizReview />} />
     
      </Routes>
    </Router>
  );
}

export default App;
