import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
// Recharts imports removed - now using TestChart component
// import { TensorFlowUtils } from "../utils/Tensorflow";
import { 
  DashboardNavbar, 
  LoadingState, 
  StatsCards, 
  QuizList,
  TestChart 
} from "../components";
import "./StudentDashboard.css";

function StudentDashboard() {
  const location = useLocation();
  const navigate = useNavigate();
  const { username, subject, teacherId, studentId } = location.state || {};

  const [studentDetails, setStudentDetails] = useState(null);
  const [teacherName, setTeacherName] = useState("Unknown Teacher");
  const [upcomingQuizzes, setUpcomingQuizzes] = useState([]);
  const [completedQuizzes, setCompletedQuizzes] = useState([]);
  const [feedback, setFeedback] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isNewUser, setIsNewUser] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiAnalytics, setAiAnalytics] = useState(null);
  const [aiTips, setAiTips] = useState([]);

  // Chart data processing
  const processChartData = () => {
    // Get assigned subjects from database or fallback to default
    const assignedSubjects = studentDetails?.subject && studentDetails.subject.length > 0 
      ? studentDetails.subject 
      : ["ADBMS", "AI & KR"]; // Default subjects for demo

    // Dynamic colors for subjects
    const colorPalette = ["#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7", "#DDA0DD", "#98D8C8", "#F7DC6F", "#BB8FCE", "#85C1E9"];
    
    const subjectColors = {};
    assignedSubjects.forEach((subject, index) => {
      subjectColors[subject] = colorPalette[index % colorPalette.length];
    });

    // Subject Distribution - show all assigned subjects with quiz counts
    const subjectDistribution = assignedSubjects.map(subject => {
      const subjectQuizzes = completedQuizzes.filter(quiz =>
        quiz.subject === subject || quiz.title?.toLowerCase().includes(subject.toLowerCase())
      );

      // For demonstration, show at least 1 for each subject if no quizzes exist
      const quizCount = subjectQuizzes.length || 1;

      return {
        name: subject,
        value: quizCount,
        totalScore: subjectQuizzes.reduce((sum, quiz) => sum + quiz.score, 0),
        avgScore: subjectQuizzes.length > 0
          ? Math.round(subjectQuizzes.reduce((sum, quiz) => sum + quiz.score, 0) / subjectQuizzes.length)
          : 0,
        fill: subjectColors[subject]
      };
    });

    // Topic Performance - Subject-based performance chart
    const createSubjectPerformanceData = () => {
      // Only show performance data if student has assigned subjects
      if (assignedSubjects[0] === "No subjects assigned") {
        return [];
      }

      // Create data for each subject with their performance
      const subjectPerformanceData = assignedSubjects.map(subject => {
        const subjectQuizzes = completedQuizzes.filter(quiz =>
          quiz.subject === subject || quiz.title?.toLowerCase().includes(subject.toLowerCase())
        );

        let avgScore = 0;
        if (subjectQuizzes.length > 0) {
          avgScore = Math.round(
            subjectQuizzes.reduce((sum, quiz) => sum + quiz.score, 0) / subjectQuizzes.length
          );
        } else {
          // Show placeholder data for subjects with no quizzes (for demo purposes)
          avgScore = Math.floor(Math.random() * 30) + 50; // Random score between 50-80
        }

        return {
          subject: subject,
          performance: avgScore
        };
      });

      return subjectPerformanceData.filter(item => item.performance > 0);
    };

    const topicPerformanceData = createSubjectPerformanceData();

    // Performance trend over time (existing functionality)
    const performanceTrendData = completedQuizzes
      .sort((a, b) => new Date(a.completedAt) - new Date(b.completedAt))
      .map((quiz, index) => ({
        name: `Quiz ${index + 1}`,
        score: quiz.score,
        date: new Date(quiz.completedAt).toLocaleDateString(),
        fullDate: new Date(quiz.completedAt)
      }));

    // Ensure we always have some data to display with proper colors
    let finalSubjectDistribution;
    if (subjectDistribution.length > 0) {
      // Ensure each item has a fill color
      finalSubjectDistribution = subjectDistribution.map((item, index) => ({
        ...item,
        fill: item.fill || colorPalette[index % colorPalette.length]
      }));
    } else {
      finalSubjectDistribution = [
        { name: "ADBMS", value: 2, fill: "#FF6B6B" },
        { name: "AI & KR", value: 1, fill: "#4ECDC4" }
      ];
    }

    const finalTopicPerformance = topicPerformanceData.length > 0 ? topicPerformanceData : [
      { subject: "ADBMS", performance: 75 },
      { subject: "AI & KR", performance: 68 }
    ];

    return {
      performanceTrend: performanceTrendData,
      subjectDistribution: finalSubjectDistribution,
      topicPerformance: finalTopicPerformance
    };
  };

  const chartData = processChartData();
  
  // Debug: Log chart data
  console.log("Chart Data:", chartData);
  console.log("Student Details:", studentDetails);
  console.log("Completed Quizzes:", completedQuizzes);

  // Fetch fresh data on component mount and page refresh
  useEffect(() => {
    const fetchStudentData = async () => {
      setLoading(true);
      try {
        let studentData = {
          id: studentId,
          username: username || "Student",
          subject: subject || "Not Assigned",
          teacherId: teacherId || null,
        };

        // Check new user
        const isFromSignup =
          location.state &&
          !localStorage.getItem(`student_${studentId}_visited`);
        setIsNewUser(isFromSignup);
        if (studentId && isFromSignup) {
          localStorage.setItem(`student_${studentId}_visited`, "true");
        }

        // Fetch student info
        if (studentId) {
          console.log("Fetching student data for ID:", studentId);
          const studentRes = await axios.get(
            `http://localhost:5000/api/auth/student/${studentId}?timestamp=${Date.now()}`
          );
          console.log("Student response:", studentRes.data);
          if (studentRes.data?.username) {
            studentData = {
              id: studentRes.data._id,
              username: studentRes.data.username,
              subject: studentRes.data.subject || [],
              teacherId: studentRes.data.teacherId || null,
              email: studentRes.data.email,
            };
          }
        }

        setStudentDetails(studentData);

        // Fetch teacher name - handle both single ID and array of IDs
        if (studentData.teacherId) {
          try {
            let teacherId = studentData.teacherId;
            // If teacherId is an array, get the first one
            if (Array.isArray(teacherId) && teacherId.length > 0) {
              teacherId = teacherId[0];
            }
            
            if (teacherId) {
              const teacherRes = await axios.get(
                `http://localhost:5000/api/auth/teacher/${teacherId}?timestamp=${Date.now()}`
              );
              setTeacherName(teacherRes.data?.username || "No Teacher Assigned");
            } else {
              setTeacherName("No Teacher Assigned");
            }
          } catch (error) {
            console.error("Error fetching teacher:", error);
            setTeacherName("No Teacher Assigned");
          }
        } else {
          setTeacherName("No Teacher Assigned");
        }

        // Always fetch fresh quiz data
        if (studentId) {
          console.log("Fetching dashboard data for student:", studentId);
          const dashboardRes = await axios.get(
            `http://localhost:5000/api/quiz-answer/student/${studentId}/dashboard?timestamp=${Date.now()}`
          );
          const dashboardData = dashboardRes.data || {};
          console.log("Dashboard API response:", dashboardData);

          setCompletedQuizzes(dashboardData.completed || []);
          setUpcomingQuizzes(dashboardData.upcoming || []);

          console.log("✅ Fresh dashboard data loaded:", dashboardData);
          console.log("✅ Completed quizzes:", dashboardData.completed);
          console.log("✅ Upcoming quizzes:", dashboardData.upcoming);

          // Fetch feedback
          const feedbackRes = await axios.get(
            `http://localhost:5000/api/feedback/student/${studentId}?timestamp=${Date.now()}`
          );
          setFeedback(feedbackRes.data || []);

          // Simple AI analytics without TensorFlow.js
          try {
            setAiLoading(true);
            
            // Generate AI insights based on completed quizzes
            if (dashboardData.completed && dashboardData.completed.length > 0) {
              const completedQuizzes = dashboardData.completed;
              
              // Simple analysis without TensorFlow.js
              const totalScore = completedQuizzes.reduce((sum, quiz) => sum + quiz.score, 0);
              const avgScore = Math.round(totalScore / completedQuizzes.length);
              
              const aiAnalysisResult = {
                recommendedDifficulty: avgScore >= 80 ? 'Hard' : avgScore >= 60 ? 'Medium' : 'Easy',
                recommendations: [
                  avgScore >= 80 ? 'Great job! Try more challenging quizzes.' : 
                  avgScore >= 60 ? 'Good progress! Focus on weak areas.' : 
                  'Start with easier topics to build confidence.'
                ],
                overallAverage: avgScore,
                weakSubjects: []
              };
              setAiAnalytics(aiAnalysisResult);

              // Generate study tips
              const aiTips = [
                'Review your incorrect answers',
                'Practice regularly to improve retention',
                'Focus on understanding concepts, not memorization',
                'Take breaks between study sessions'
              ];
              setAiTips(aiTips);
              
              console.log('AI Analysis completed:', aiAnalysisResult);
            } else {
              // Default analysis for new students
              const defaultAnalysis = {
                recommendedDifficulty: 'Medium',
                recommendations: ['Complete more quizzes to get AI-powered insights'],
                overallAverage: 0,
                weakSubjects: []
              };
              setAiAnalytics(defaultAnalysis);
              
              // Default tips for new students
              setAiTips([
                'Start with easier quizzes to build confidence',
                'Create a regular study schedule',
                'Take notes while studying',
                'Ask questions when you don\'t understand'
              ]);
            }
          } catch (aiError) {
            console.log("AI features error:", aiError.message);
            // Fallback to basic analysis
            const fallbackAnalysis = {
              recommendedDifficulty: 'Medium',
              recommendations: ['Complete more quizzes to get AI-powered insights'],
              overallAverage: 0,
              weakSubjects: []
            };
            setAiAnalytics(fallbackAnalysis);
            setAiTips(['Complete your first quiz to get personalized study tips']);
          } finally {
            setAiLoading(false);
          }
        }
      } catch (err) {
        console.error("Student Dashboard fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    // Load data on component mount
    fetchStudentData();
  }, [
    studentId,
    username,
    subject,
    teacherId,
    location.state,
  ]);

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      // Cleanup logic if needed
    };
  }, []);



  // Logout
  const handleLogout = () => {
    if (studentId) localStorage.removeItem(`student_${studentId}_visited`);
    localStorage.removeItem("token");
    navigate("/login");
  };

  // Scroll to top when clicking Dashboard tab
  const handleDashboardClick = (e) => {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (loading) {
    return (
      <div className="modern-dashboard">
        <LoadingState message="Loading your dashboard..." fullScreen />
      </div>
    );
  }

  // Debug logging
  console.log("StudentDashboard rendering:", {
    studentDetails,
    completedQuizzes: completedQuizzes.length,
    upcomingQuizzes: upcomingQuizzes.length,
    loading
  });

  try {
    return (
    <div className="modern-dashboard">
      {/* Top Navigation */}
      <DashboardNavbar
        brandName="StudyHub"
        username={studentDetails?.username || username}
        onLogout={handleLogout}
        onBrandClick={handleDashboardClick}
        userRole="student"
      />

      {/* Success Message */}
      {showSuccessMessage && (
        <div className="success-toast">
          <div className="toast-content">
            <span className="toast-icon">✅</span>
            <span className="toast-message">
              Quiz completed successfully! Your results have been updated.
            </span>
            <button
              className="toast-close"
              onClick={() => setShowSuccessMessage(false)}
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="main-content">
        {/* Hero Section */}
        <div className="hero-section">
          <div className="hero-content">
            <h1>
              {isNewUser ? "Welcome to StudyHub" : "Welcome back"},{" "}
              {studentDetails?.username || "Student"}!
            </h1>
            <p>
              {isNewUser
                ? "Your learning journey starts here. Get ready to track your progress and excel in your studies!"
                : "Track your progress and stay on top of your studies"}
            </p>
            {isNewUser && <div className="welcome-badge">🎉 New Student</div>}
          </div>
        </div>

        {/* Dashboard Layout */}
        <div className="dashboard-layout">
          {/* Subject-wise Summary Cards */}
          <div className="card subject-summary-card">
            <div className="card-header">
              <h3>Subject-wise Summary</h3>
            </div>
            <div className="subject-summary-grid">
              {(() => {
                try {
                  const assignedSubjects = studentDetails?.subject && Array.isArray(studentDetails.subject) && studentDetails.subject.length > 0 
                    ? studentDetails.subject 
                    : ['ADBMS', 'AI & KR']; // Default subjects

                  return assignedSubjects.map(subject => {
                    const subjectQuizzes = completedQuizzes.filter(quiz => 
                      quiz.subject === subject || quiz.title?.toLowerCase().includes(subject.toLowerCase())
                    );
                    
                    const upcomingSubjectQuizzes = upcomingQuizzes.filter(quiz => 
                      quiz.subject === subject || quiz.title?.toLowerCase().includes(subject.toLowerCase())
                    );

                    const avgScore = subjectQuizzes.length > 0
                      ? Math.round(subjectQuizzes.reduce((sum, quiz) => sum + quiz.score, 0) / subjectQuizzes.length)
                      : 0;

                    return (
                      <div key={subject} className="subject-card">
                        <h4 className="subject-name">{subject}</h4>
                        <div className="subject-stats">
                          <div className="subject-stat">
                            <span className="stat-value">{subjectQuizzes.length}</span>
                            <span className="stat-label">✅ Completed</span>
                          </div>
                          <div className="subject-stat">
                            <span className="stat-value">{upcomingSubjectQuizzes.length}</span>
                            <span className="stat-label">🕒 Upcoming</span>
                          </div>
                          <div className="subject-stat">
                            <span className="stat-value">{avgScore}%</span>
                            <span className="stat-label">📊 Avg Score</span>
                          </div>
                        </div>
                      </div>
                    );
                  });
                } catch (error) {
                  console.error("Error rendering subject cards:", error);
                  return <div>Error loading subject summary</div>;
                }
              })()}
            </div>
          </div>

          {/* Grouped Bar Chart */}
          <div className="card grouped-chart-card">
            <div className="card-header">
              <h3>Subject Comparison</h3>
            </div>
            <div className="grouped-chart-container">
              {(() => {
                const assignedSubjects = studentDetails?.subject && Array.isArray(studentDetails.subject) && studentDetails.subject.length > 0 
                  ? studentDetails.subject 
                  : ['ADBMS', 'AI & KR']; // Default subjects

                const chartData = assignedSubjects.map(subject => {
                  const subjectQuizzes = completedQuizzes.filter(quiz => 
                    quiz.subject === subject || quiz.title?.toLowerCase().includes(subject.toLowerCase())
                  );
                  
                  const upcomingSubjectQuizzes = upcomingQuizzes.filter(quiz => 
                    quiz.subject === subject || quiz.title?.toLowerCase().includes(subject.toLowerCase())
                  );

                  const avgScore = subjectQuizzes.length > 0
                    ? Math.round(subjectQuizzes.reduce((sum, quiz) => sum + quiz.score, 0) / subjectQuizzes.length)
                    : 0;

                  return {
                    subject: subject,
                    completed: subjectQuizzes.length,
                    upcoming: upcomingSubjectQuizzes.length,
                    avgScore: avgScore
                  };
                });

                return (
                  <div className="bar-chart-wrapper">
                    {chartData.map((data, index) => (
                      <div key={data.subject} className="subject-bar-group">
                        <div className="subject-label">{data.subject}</div>
                        <div className="bars-container">
                          <div className="bar-item">
                            <div 
                              className="bar completed-bar" 
                              style={{ height: `${Math.max(data.completed * 20, 10)}px` }}
                            ></div>
                            <span className="bar-value">{data.completed}</span>
                            <span className="bar-label">Completed</span>
                          </div>
                          <div className="bar-item">
                            <div 
                              className="bar upcoming-bar" 
                              style={{ height: `${Math.max(data.upcoming * 20, 10)}px` }}
                            ></div>
                            <span className="bar-value">{data.upcoming}</span>
                            <span className="bar-label">Upcoming</span>
                          </div>
                          <div className="bar-item">
                            <div 
                              className="bar score-bar" 
                              style={{ height: `${Math.max(data.avgScore * 1.5, 10)}px` }}
                            ></div>
                            <span className="bar-value">{data.avgScore}%</span>
                            <span className="bar-label">Avg Score</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Overall Quizzes Report */}
          <div className="card quizzes-report-card">
            <div className="card-header">
              <h3>Overall Quizzes Report</h3>
            </div>
            <div className="quizzes-report">
              {/* Quiz Statistics */}
              <StatsCards 
                variant="student"
                stats={[
                  {
                    value: completedQuizzes.length,
                    label: "Completed",
                    description: "Quizzes finished"
                  },
                  {
                    value: upcomingQuizzes.length,
                    label: "Upcoming",
                    description: "Pending quizzes"
                  },
                  {
                    value: completedQuizzes.length > 0
                      ? Math.round(
                          completedQuizzes.reduce((s, q) => s + q.score, 0) /
                            completedQuizzes.length
                        )
                      : 0,
                    suffix: "%",
                    label: "Avg Score",
                    description: "Overall performance"
                  }
                ]}
              />
              {/* Recent Quizzes - Only show if there are completed quizzes */}
              {completedQuizzes.length > 0 && (
                <div className="recent-quizzes">
                  <h4>Recent Quiz Results</h4>
                  <QuizList
                    quizzes={completedQuizzes}
                    type="recent"
                    maxItems={4}
                    onQuizAction={(action, quiz) => {
                      if (action === 'review') {
                        navigate(`/quiz-review/${quiz._id}`, {
                          state: {
                            studentId: studentDetails?.id,
                            username: studentDetails?.username,
                          },
                        });
                      }
                    }}
                  />
                </div>
              )}

              {/* Upcoming Quizzes Section */}
              <div className="upcoming-quizzes">
                <h4>Upcoming Quizzes</h4>
                <QuizList
                  quizzes={upcomingQuizzes}
                  type="upcoming"
                  maxItems={3}
                  onQuizAction={(action, quiz) => {
                    if (action === 'start') {
                      navigate(`/quiz/${quiz._id}`, {
                        state: {
                          studentId: studentDetails?.id,
                          username: studentDetails?.username,
                        },
                      });
                    }
                  }}
                  emptyMessage={
                    <div>
                      <p>No upcoming quizzes for your assigned subjects.</p>
                      <small>
                        Quizzes will appear here when your teachers create them
                        for subjects you're enrolled in.
                        {studentDetails?.subject &&
                        Array.isArray(studentDetails.subject) &&
                        studentDetails.subject.length > 0 ? (
                          <span>
                            {" "}
                            Your subjects: {studentDetails.subject.join(", ")}
                          </span>
                        ) : (
                          <span>
                            {" "}
                            No subjects assigned yet. Contact your teacher to get
                            enrolled in subjects.
                          </span>
                        )}
                      </small>
                    </div>
                  }
                />
              </div>
            </div>
          </div>

          {/* Performance Charts Section */}
          <TestChart 
            studentDetails={studentDetails}
            completedQuizzes={completedQuizzes}
          />

          {/* Teacher Feedback Sidebar */}
          <div className="card teacher-feedback-sidebar">
            <div className="card-header">
              <h3>Teacher Feedback</h3>
            </div>
            <div className="feedback-list">
              {feedback.length > 0 ? (
                feedback.slice(0, 3).map((fb, index) => (
                  <div key={index} className="teacher-feedback-item">
                    <div className="teacher-details">
                      <h4>{fb.teacherName}</h4>
                      <span className="subject-tag">{fb.subject}</span>
                      <span className="feedback-date">
                        {new Date(fb.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="feedback-preview">{fb.message}</p>
                  </div>
                ))
              ) : (
                <div className="teacher-feedback-item">
                  <p className="feedback-preview">
                    {isNewUser
                      ? "Welcome to the class! Looking forward to seeing your progress."
                      : "No feedback yet. Complete some quizzes to receive feedback from your teacher."}
                  </p>
                </div>
              )}
            </div>
          </div>
          {/* AI Insights + Study Tips side-by-side */}
          <div className="ai-tips-grid">
            <div className="card teacher-feedback-sidebar">
              <div className="card-header">
                <h3>AI Insights</h3>
              </div>
              <div className="feedback-list">
                {aiLoading ? (
                  <div className="teacher-feedback-item">
                    <p className="feedback-preview">
                      Analyzing your performance...
                    </p>
                  </div>
                ) : aiAnalytics ? (
                  <>
                    <div className="teacher-feedback-item">
                      <div className="teacher-details">
                        <h4>Recommended Difficulty</h4>
                        <span className="subject-tag">
                          {aiAnalytics.recommendedDifficulty}
                        </span>
                      </div>
                      <p className="feedback-preview">
                        {aiAnalytics.recommendations?.[0] ||
                          "Complete more quizzes for personalized insights."}
                      </p>
                    </div>
                    {aiAnalytics.overallAverage > 0 && (
                      <div className="teacher-feedback-item">
                        <div className="teacher-details">
                          <h4>Overall Performance</h4>
                          <span className="subject-tag">
                            {aiAnalytics.overallAverage}% Average
                          </span>
                        </div>
                      </div>
                    )}
                    {aiAnalytics.weakSubjects?.length > 0 && (
                      <div className="teacher-feedback-item">
                        <div className="teacher-details">
                          <h4>Focus Areas</h4>
                          <span className="subject-tag">
                            {aiAnalytics.weakSubjects.join(", ")}
                          </span>
                        </div>
                        <p className="feedback-preview">
                          These subjects need more attention.
                        </p>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="teacher-feedback-item">
                    <div className="teacher-details">
                      <h4>Getting Started</h4>
                      <span className="subject-tag">New Student</span>
                    </div>
                    <p className="feedback-preview">
                      Complete your first quiz to unlock AI-powered insights!
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="card teacher-feedback-sidebar">
              <div className="card-header">
                <h3>Study Tips</h3>
              </div>
              <div className="feedback-list">
                {aiLoading ? (
                  <div className="teacher-feedback-item">
                    <p className="feedback-preview">
                      Generating personalized tips...
                    </p>
                  </div>
                ) : aiTips.length > 0 ? (
                  <div className="teacher-feedback-item">
                    <div className="teacher-details">
                      <h4>Personalized Tips</h4>
                      <span className="subject-tag">{aiTips.length} Tips</span>
                    </div>
                    <ul className="study-tips-list">
                      {aiTips.map((tip, i) => (
                        <li key={i}>{tip}</li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <div className="teacher-feedback-item">
                    <div className="teacher-details">
                      <h4>Study Tips</h4>
                      <span className="subject-tag">Coming Soon</span>
                    </div>
                    <p className="feedback-preview">
                      Personalized study tips will appear after your first quiz
                      completion.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
  } catch (error) {
    console.error("StudentDashboard render error:", error);
    return (
      <div className="modern-dashboard">
        <div className="main-content">
          <div className="hero-section">
            <div className="hero-content">
              <h1>Dashboard Error</h1>
              <p>There was an error loading the dashboard. Please refresh the page.</p>
              <button onClick={() => window.location.reload()}>Refresh Page</button>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
export default StudentDashboard;