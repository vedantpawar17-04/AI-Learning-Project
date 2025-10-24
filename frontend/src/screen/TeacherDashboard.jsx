import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { 
  Plus, 
  Users, 
  FileText, 
  BarChart3, 
  BookOpen, 
  Calendar,
  TrendingUp,
  Award,
  MessageSquare
} from "lucide-react";
import { 
  DashboardNavbar, 
  LoadingState, 
  StatsCards, 
  Modal 
} from "../components";
import "./TeacherDashboard.css";

function TeacherDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { teacherId, username, email } = location.state || {};
  console.log(email);

  const [showCreateQuiz, setShowCreateQuiz] = useState(false);
  const [showViewStudents, setShowViewStudents] = useState(false);
  const [showQuizResults, setShowQuizResults] = useState(false);
  const [students, setStudents] = useState([]);
  const [quizResults, setQuizResults] = useState([]);
  const [aiInsights, setAiInsights] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [feedbackForm, setFeedbackForm] = useState({ studentId: '', message: '' });
  const [loading, setLoading] = useState(false);
  const [teacherSubjects, setTeacherSubjects] = useState([]);
  const [dashboardStats, setDashboardStats] = useState({
    totalStudents: 0,
    totalQuizzes: 0,
    averageScore: 0,
    recentActivity: []
  });

  // Quiz form state
  const [quizForm, setQuizForm] = useState({
    title: "",
    subject: "",
    date: "",
    questions: [
      {
        questionText: "",
        options: ["", "", "", ""],
        correctAnswer: 0
      }
    ]
  });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // First, fetch teacher details to get their subjects
      const teacherRes = await axios.get(`http://localhost:5000/api/auth/teacher/${teacherId}`);
      const teacherData = teacherRes.data;
      const teacherSubjectsList = teacherData.teacherSubject || [];
      console.log("Teacher data:", teacherData);
      console.log("Teacher subjects:", teacherSubjectsList);
      setTeacherSubjects(teacherSubjectsList);
      
      // Fetch only students assigned to this teacher
      const studentsRes = await axios.get(`http://localhost:5000/api/auth/students/teacher/${teacherId}`);
      console.log("Students data:", studentsRes.data);
      setStudents(studentsRes.data);
      
      // Fetch quiz results for this teacher's students
      const resultsRes = await axios.get(`http://localhost:5000/api/quiz/results/teacher/${teacherId}`);
      setQuizResults(resultsRes.data);
      
      // Fetch recent quizzes created by this teacher
      const recentQuizzesRes = await axios.get(`http://localhost:5000/api/quiz/teacher/${teacherId}/recent`);
      
      // Combine recent quiz creations and completed results for activity feed
      const recentActivity = [
        // Recent quiz creations
        ...recentQuizzesRes.data.slice(0, 3).map(quiz => ({
          type: 'quiz_created',
          quizTitle: quiz.title,
          subject: quiz.subject,
          createdAt: quiz.createdAt,
          resultCount: quiz.resultCount,
          status: quiz.status
        })),
        // Recent completions
        ...resultsRes.data.slice(0, 3).map(result => ({
          type: 'quiz_completed',
          studentName: result.studentName,
          quizTitle: result.quizTitle,
          subject: result.subject,
          score: result.score,
          completedAt: result.completedAt
        }))
      ].sort((a, b) => new Date(b.completedAt || b.createdAt) - new Date(a.completedAt || a.createdAt)).slice(0, 5);
      
      // Calculate dashboard statistics
      const stats = {
        totalStudents: studentsRes.data.length,
        totalQuizzes: resultsRes.data.length,
        averageScore: resultsRes.data.length > 0 
          ? Math.round(resultsRes.data.reduce((sum, r) => sum + r.score, 0) / resultsRes.data.length)
          : 0,
        recentActivity: recentActivity
      };
      
      setDashboardStats(stats);
      // Compute AI-style insights (heuristic)
      try {
        const bySubject = {};
        (resultsRes.data || []).forEach(r => {
          const key = r.subject || "Unknown";
          if (!bySubject[key]) bySubject[key] = { total: 0, count: 0 };
          bySubject[key].total += (typeof r.score === "number" ? r.score : 0);
          bySubject[key].count += 1;
        });
        const subjectAverages = Object.entries(bySubject).map(([subject, v]) => ({
          subject,
          average: v.count > 0 ? Math.round(v.total / v.count) : 0
        })).sort((a, b) => a.average - b.average);
        const weakSubjects = subjectAverages.filter(s => s.average < 60).slice(0, 3).map(s => s.subject);
        const recommendation = weakSubjects.length
          ? `Plan a revision quiz for: ${weakSubjects.join(", ")}.`
          : (stats.averageScore >= 80 ? "Increase difficulty for top performers." : "Maintain balanced difficulty and add targeted practice.");
        setAiInsights({ subjectAverages, weakSubjects, recommendation });
      } catch(err) {
        console.log(err);
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  const addQuestion = () => {
    setQuizForm({
      ...quizForm,
      questions: [
        ...quizForm.questions,
        {
          questionText: "",
          options: ["", "", "", ""],
          correctAnswer: 0
        }
      ]
    });
  };

  const updateQuestion = (index, field, value) => {
    const updatedQuestions = [...quizForm.questions];
    updatedQuestions[index][field] = value;
    setQuizForm({ ...quizForm, questions: updatedQuestions });
  };

  const updateOption = (questionIndex, optionIndex, value) => {
    const updatedQuestions = [...quizForm.questions];
    updatedQuestions[questionIndex].options[optionIndex] = value;
    setQuizForm({ ...quizForm, questions: updatedQuestions });
  };

  const removeQuestion = (index) => {
    if (quizForm.questions.length > 1) {
      const updatedQuestions = quizForm.questions.filter((_, i) => i !== index);
      setQuizForm({ ...quizForm, questions: updatedQuestions });
    }
  };

  const handleCreateQuiz = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Create or find subject first
      let subjectId = null;
      if (quizForm.subject) {
        const subjectResponse = await axios.post("http://localhost:5000/api/subjects/create", {
          name: quizForm.subject,
          teacher: teacherId
        });
        subjectId = subjectResponse.data._id;
      }

      await axios.post("http://localhost:5000/api/quiz/create", {
        ...quizForm,
        teacherId: teacherId,
        subjectId: subjectId
      });

      alert("Quiz created successfully!");
      setShowCreateQuiz(false);
      setQuizForm({
        title: "",
        subject: "",
        date: "",
        questions: [
          {
            questionText: "",
            options: ["", "", "", ""],
            correctAnswer: 0
          }
        ]
      });

      fetchDashboardData(); // Refresh data
    } catch (error) {
      console.error("Error creating quiz:", error);
      alert("Error creating quiz. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleViewStudents = () => {
    console.log("Opening View Students modal");
    setShowViewStudents(true);
  };

  const handleViewQuizResults = () => {
    console.log("Opening Quiz Results modal");
    setShowQuizResults(true);
  };

  const handleStudentClick = (student) => {
    setSelectedStudent(student);
  };

  const handleSendFeedback = async (e) => {
    e.preventDefault();
    
    if (!feedbackForm.message.trim()) {
      alert("Please enter a feedback message.");
      return;
    }

    try {
      await axios.post("http://localhost:5000/api/feedback/send", {
        studentId: feedbackForm.studentId,
        teacherId: teacherId,
        message: feedbackForm.message,
        subject: "Feedback"
      });

      alert("Feedback sent successfully!");
      setFeedbackForm({ studentId: '', message: '' });
      setSelectedStudent(null);
    } catch (error) {
      console.error("Error sending feedback:", error);
      alert("Error sending feedback. Please try again.");
    }
  };

  // Filter student subjects to show only those taught by this teacher
  const getStudentSubjectsForTeacher = (studentSubjects) => {
    console.log("Student subjects:", studentSubjects);
    console.log("Teacher subjects:", teacherSubjects);
    
    if (!studentSubjects || !Array.isArray(studentSubjects)) {
      return "No subjects assigned";
    }
    
    // If teacher has no subjects assigned, show all student subjects
    if (!teacherSubjects || teacherSubjects.length === 0) {
      return studentSubjects.length > 0 
        ? studentSubjects.join(", ") 
        : "No subjects assigned";
    }
    
    // Find intersection of student subjects and teacher subjects
    const commonSubjects = studentSubjects.filter(subject => 
      teacherSubjects.includes(subject)
    );
    
    console.log("Common subjects:", commonSubjects);
    
    return commonSubjects.length > 0 
      ? commonSubjects.join(", ") 
      : `Student subjects: ${studentSubjects.join(", ")} (Not taught by you)`;
  };

  // No filters: use all quizResults

  if (loading && !dashboardStats.totalStudents) {
    return (
      <div className="teacher-dashboard">
        <LoadingState message="Loading dashboard..." fullScreen />
      </div>
    );
  }

  return (
    <div className="teacher-dashboard">
      {/* Header */}
      <DashboardNavbar
        brandName="ClassControl"
        username={username}
        onLogout={handleLogout}
        userRole="teacher"
      />

      {/* Main Content */}
      <div className="teacher-content">
        {/* Dashboard Header */}
        <div className="dashboard-header">
          <div className="header-content">
            <h1>Welcome back, {username || "Teacher"}!</h1>
            <p>
              Manage your classes, create quizzes, and track student progress
            </p>
            {teacherSubjects.length > 0 && (
              <div className="teacher-subjects">
                <span className="subjects-label">Your Subjects: </span>
                <span className="subjects-list">
                  {teacherSubjects.join(", ")}
                </span>
              </div>
            )}
          </div>
          <div className="dashboard-row">
            <div className="header-stats">
              <StatsCards 
                variant="teacher"
                stats={[
                  {
                    icon: <Users className="stat-icon" />,
                    value: dashboardStats.totalStudents,
                    label: "Students",
                    description: "Enrolled students"
                  },
                  {
                    icon: <FileText className="stat-icon" />,
                    value: dashboardStats.totalQuizzes,
                    label: "Quiz Results",
                    description: "Completed submissions"
                  },
                  {
                    icon: <TrendingUp className="stat-icon" />,
                    value: dashboardStats.averageScore,
                    suffix: "%",
                    label: "Avg Score",
                    description: "Class performance"
                  }
                ]}
              />
            </div>

            {/* AI Insights - moved here to be beside the cards */}
            <div className="ai-insights">
              <div className="ai-header">
                <h3>Class AI Insights</h3>
              </div>
              {aiInsights ? (
                <div className="ai-body">
                  {aiInsights.weakSubjects &&
                    aiInsights.weakSubjects.length > 0 && (
                      <div className="ai-row">
                        <span className="ai-label">Weak Subjects:</span>
                        <span className="ai-value">
                          {aiInsights.weakSubjects.join(", ")}
                        </span>
                      </div>
                    )}
                  <div className="ai-row">
                    <span className="ai-label">Recommendation:</span>
                    <span className="ai-value">
                      {aiInsights.recommendation}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="ai-body">
                  <div className="ai-row">
                    <span className="ai-value">
                      Insights will appear after results load.
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        {/* Action Cards */}
        <div className="action-cards">
          <div
            className="action-card primary"
            onClick={() => {
              console.log("Opening Create Quiz modal");
              setShowCreateQuiz(true);
            }}
          >
            <div className="card-icon">
              <Plus size={32} />
            </div>
            <div className="card-content">
              <h3>Create Quiz</h3>
              <p>Design new quizzes with custom questions and answers</p>
            </div>
          </div>

          <div className="action-card secondary" onClick={handleViewStudents}>
            <div className="card-icon">
              <Users size={32} />
            </div>
            <div className="card-content">
              <h3>View Students</h3>
              <p>Monitor student progress and send feedback</p>
            </div>
          </div>

          <div className="action-card tertiary" onClick={handleViewQuizResults}>
            <div className="card-icon">
              <BarChart3 size={32} />
            </div>
            <div className="card-content">
              <h3>Quiz Analytics</h3>
              <p>Review quiz submissions and performance analytics</p>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="recent-activity">
          <h3>Recent Quiz Activity</h3>
          <div className="activity-list">
            {dashboardStats.recentActivity.length > 0 ? (
              dashboardStats.recentActivity.map((activity, index) => (
                <div key={index} className="activity-item">
                  <div className="activity-icon">
                    {activity.type === "quiz_created" ? (
                      <Plus size={20} />
                    ) : (
                      <Award size={20} />
                    )}
                  </div>
                  <div className="activity-content">
                    {activity.type === "quiz_created" ? (
                      <p>
                        Created quiz <strong>{activity.quizTitle}</strong> for{" "}
                        <strong>{activity.subject}</strong>
                      </p>
                    ) : (
                      <p>
                        <strong>{activity.studentName}</strong> completed{" "}
                        <strong>{activity.quizTitle}</strong>
                      </p>
                    )}
                    <span className="activity-time">
                      {new Date(
                        activity.completedAt || activity.createdAt
                      ).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="activity-status">
                    {activity.type === "quiz_created" ? (
                      <span className={`status-badge ${activity.status}`}>
                        {activity.status === "completed"
                          ? `${activity.resultCount} completed`
                          : "Pending"}
                      </span>
                    ) : (
                      <div
                        className={`activity-score ${
                          activity.score >= 80
                            ? "excellent"
                            : activity.score >= 60
                            ? "good"
                            : "needs-improvement"
                        }`}
                      >
                        {activity.score}%
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-activity">
                <p>No recent quiz activity</p>
              </div>
            )}
          </div>
        </div>

        {/* Debug info */}
        {console.log("Modal states:", { showCreateQuiz, showViewStudents, showQuizResults })}
        
        {/* Create Quiz Modal */}
        {showCreateQuiz && (
          <div className="modal-overlay">
            <div className="modal-content">
              <div className="modal-header">
                <h2>Create New Quiz</h2>
                <button
                  onClick={() => setShowCreateQuiz(false)}
                  className="close-btn"
                >
                  ×
                </button>
              </div>

              <form onSubmit={handleCreateQuiz} className="quiz-form">
                <div className="form-section">
                  <h3 className="section-title">Quiz Information</h3>
                  <div className="form-grid">
                    <div className="form-group">
                      <label>Quiz Title</label>
                      <input
                        type="text"
                        value={quizForm.title}
                        onChange={(e) =>
                          setQuizForm({ ...quizForm, title: e.target.value })
                        }
                        placeholder="Enter quiz title..."
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Subject</label>
                      <select
                        className="form-select"
                        value={quizForm.subject}
                        onChange={(e) =>
                          setQuizForm({ ...quizForm, subject: e.target.value })
                        }
                        required
                      >
                        <option value="">Select a subject...</option>
                        {teacherSubjects.map((subject, index) => (
                          <option key={index} value={subject}>
                            {subject}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Due Date</label>
                      <input
                        type="datetime-local"
                        value={quizForm.date}
                        onChange={(e) =>
                          setQuizForm({ ...quizForm, date: e.target.value })
                        }
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="form-section">
                  <div className="section-header">
                    <h3 className="section-title">Questions</h3>
                  </div>

                  <div className="questions-container">
                    {quizForm.questions.map((q, qi) => (
                      <div key={qi} className="question-card">
                        <div className="question-header ">
                          <h4>Question {qi + 1}</h4>
                          {quizForm.questions.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeQuestion(qi)}
                              className="remove-question-btn"
                              title="Remove question"
                            >
                              ×
                            </button>
                          )}
                        </div>

                        <div className="question-content">
                          <div className="form-group">
                            <label>Question Text</label>
                            <textarea
                              value={q.questionText}
                              onChange={(e) =>
                                updateQuestion(
                                  qi,
                                  "questionText",
                                  e.target.value
                                )
                              }
                              placeholder="Enter your question here..."
                              required
                              rows="3"
                            />
                          </div>

                          <div className="options-section">
                            <label className="options-label">
                              Answer Options
                            </label>
                            <div className="options-grid">
                              {q.options.map((opt, oi) => (
                                <div
                                  key={oi}
                                  className={`option-group ${
                                    q.correctAnswer === oi
                                      ? "correct-option"
                                      : ""
                                  }`}
                                >
                                  <div className="option-letter">
                                    {String.fromCharCode(65 + oi)}
                                  </div>
                                  <input
                                    type="text"
                                    value={opt}
                                    onChange={(e) =>
                                      updateOption(qi, oi, e.target.value)
                                    }
                                    placeholder={`Option ${String.fromCharCode(
                                      65 + oi
                                    )}`}
                                    required
                                  />
                                  <div className="radio-wrapper">
                                    <input
                                      type="radio"
                                      name={`correct-${qi}`}
                                      checked={q.correctAnswer === oi}
                                      onChange={() =>
                                        updateQuestion(qi, "correctAnswer", oi)
                                      }
                                      id={`correct-${qi}-${oi}`}
                                    />
                                    <label
                                      htmlFor={`correct-${qi}-${oi}`}
                                      className="radio-label"
                                    >
                                      Correct Answer
                                    </label>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={addQuestion}
                    className="add-question-btn"
                  >
                    <Plus size={16} />
                    Add Another Question
                  </button>
                </div>

                <div className="form-actions">
                  <button
                    type="button"
                    onClick={() => setShowCreateQuiz(false)}
                    className="cancel-btn"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="submit-btn"
                  >
                    {loading ? (
                      <>
                        <div className="loading-spinner"></div>
                        Creating Quiz...
                      </>
                    ) : (
                      <>
                        <Plus size={16} />
                        Create Quiz
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* View Students Modal */}
        {showViewStudents && (
          <div className="modal-overlay">
            <div className="modal-content large-modal">
              <div className="modal-header">
                <h2>Student Management</h2>
                <button
                  onClick={() => setShowViewStudents(false)}
                  className="close-btn"
                >
                  ×
                </button>
              </div>

              <div className="students-grid">
                {students.length > 0 ? (
                  students.map((student) => (
                    <div
                      key={student._id}
                      className="student-card"
                      onClick={() => handleStudentClick(student)}
                    >
                      <div className="student-avatar">
                        {student.username.charAt(0).toUpperCase()}
                      </div>
                      <div className="student-info">
                        <h4>{student.username}</h4>
                        <p>{student.email}</p>
                        <span className="subject-tag">
                          {getStudentSubjectsForTeacher(student.subject)}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="empty-state">
                    <p>No students found</p>
                    <span>Students will appear here once they register</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Quiz Results Modal */}
        {showQuizResults && (
          <div className="modal-overlay">
            <div className="modal-content large-modal">
              <div className="modal-header">
                <h2>Quiz Analytics & Results</h2>
                <button
                  onClick={() => setShowQuizResults(false)}
                  className="close-btn"
                >
                  ×
                </button>
              </div>

              <div className="results-container">
                <div className="results-table">
                  <table>
                    <thead>
                      <tr>
                        <th>Student Name</th>
                        <th>Quiz Title</th>
                        <th>Subject</th>
                        <th>Score</th>
                        <th>Completed Date</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {quizResults.length > 0 ? (
                        quizResults.map((result, index) => (
                          <tr key={index}>
                            <td>{result.studentName}</td>
                            <td>{result.quizTitle}</td>
                            <td>{result.subject}</td>
                            <td>
                              <span
                                className={`score-badge ${
                                  result.score >= 80
                                    ? "excellent"
                                    : result.score >= 60
                                    ? "good"
                                    : "needs-improvement"
                                }`}
                              >
                                {result.score}%
                              </span>
                            </td>
                            <td>
                              {new Date(
                                result.completedAt
                              ).toLocaleDateString()}
                            </td>
                            <td>
                              <button
                                className="feedback-btn"
                                onClick={() => {
                                  setFeedbackForm({
                                    studentId: result.studentId,
                                    message: "",
                                  });
                                  setSelectedStudent({
                                    _id: result.studentId,
                                    username: result.studentName,
                                    email: result.studentEmail || "N/A",
                                    subject: result.subject || "Not Assigned",
                                  });
                                }}
                              >
                                Send Feedback
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="6" className="empty-state-row">
                            <div className="empty-state">
                              <p>No quiz results found</p>
                              <span>
                                Results will appear here once students complete
                                quizzes
                              </span>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Student Detail Popup inside Quiz Results */}
              {selectedStudent && (
                <div className="student-detail-popup">
                  <div className="popup-content">
                    <div className="popup-header">
                      <h3>{selectedStudent.username} Details</h3>
                      <button onClick={() => setSelectedStudent(null)}>
                        ×
                      </button>
                    </div>
                    <div className="student-details">
                      <p>
                        <strong>Email:</strong> {selectedStudent.email}
                      </p>
                    </div>
                    <form
                      onSubmit={handleSendFeedback}
                      className="feedback-form"
                    >
                      <p>Send Feedback</p>
                      <textarea
                        value={feedbackForm.message}
                        onChange={(e) =>
                          setFeedbackForm({
                            ...feedbackForm,
                            studentId: selectedStudent._id,
                            message: e.target.value,
                          })
                        }
                        placeholder="Write your feedback here..."
                        rows="4"
                        required
                      />
                      <button type="submit" className="send-feedback-btn">
                        <MessageSquare size={16} />
                        Send Feedback
                      </button>
                    </form>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
export default TeacherDashboard;