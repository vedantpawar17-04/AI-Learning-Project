import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { ArrowLeft, Clock, CheckCircle, AlertCircle, Play } from "lucide-react";
import "./QuizList.css";

function QuizList() {
  const navigate = useNavigate();
  const location = useLocation();
  const { studentId, username } = location.state || {};

  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('upcoming');

  useEffect(() => {
    const fetchQuizzes = async () => {
      try {
        const response = await axios.get(`http://localhost:5000/api/quiz/student/${studentId}/results`);
        setQuizzes(response.data || []);
      } catch (error) {
        console.error("Error fetching quizzes:", error);
      } finally {
        setLoading(false);
      }
    };

    if (studentId) {
      fetchQuizzes();
    }
  }, [studentId]);

  const upcomingQuizzes = quizzes.filter(quiz => !quiz.completed);
  const completedQuizzes = quizzes.filter(quiz => quiz.completed);

  const handleStartQuiz = (quizId) => {
    navigate(`/quiz/${quizId}`, { 
      state: { studentId, username } 
    });
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'excellent';
    if (score >= 60) return 'good';
    if (score >= 40) return 'average';
    return 'poor';
  };

  if (loading) {
    return (
      <div className="quiz-list-page">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading quizzes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="quiz-list-page">
      {/* Header */}
      <div className="page-header">
        <button onClick={() => navigate('/student-dashboard')} className="back-btn">
          <ArrowLeft size={20} />
          Back to Dashboard
        </button>
        <div className="header-content">
          <h1>My Quizzes</h1>
          <p>Track your quiz progress and scores</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="quiz-tabs">
        <button 
          className={`tab-btn ${activeTab === 'upcoming' ? 'active' : ''}`}
          onClick={() => setActiveTab('upcoming')}
        >
          <Clock size={18} />
          Upcoming ({upcomingQuizzes.length})
        </button>
        <button 
          className={`tab-btn ${activeTab === 'completed' ? 'active' : ''}`}
          onClick={() => setActiveTab('completed')}
        >
          <CheckCircle size={18} />
          Completed ({completedQuizzes.length})
        </button>
      </div>

      {/* Quiz Content */}
      <div className="quiz-content">
        {activeTab === 'upcoming' && (
          <div className="quiz-section">
            {upcomingQuizzes.length > 0 ? (
              <div className="quiz-grid">
                {upcomingQuizzes.map((quiz) => (
                  <div key={quiz._id} className="quiz-card upcoming-quiz">
                    <div className="quiz-header">
                      <h3>{quiz.title}</h3>
                      <div className="quiz-meta">
                        <span className="subject">{quiz.subject}</span>
                        <span className="teacher">by {quiz.teacher}</span>
                      </div>
                    </div>
                    
                    <div className="quiz-details">
                      <div className="detail-item">
                        <Clock size={16} />
                        <span>Due: {new Date(quiz.dueDate).toLocaleDateString()}</span>
                      </div>
                      <div className="detail-item">
                        <AlertCircle size={16} />
                        <span className="status pending">Pending</span>
                      </div>
                    </div>

                    <div className="quiz-actions">
                      <button 
                        onClick={() => handleStartQuiz(quiz._id)}
                        className="start-quiz-btn"
                      >
                        <Play size={18} />
                        Start Quiz
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <Clock size={48} />
                <h3>No Upcoming Quizzes</h3>
                <p>Your teacher will assign quizzes soon. Check back later!</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'completed' && (
          <div className="quiz-section">
            {completedQuizzes.length > 0 ? (
              <div className="quiz-grid">
                {completedQuizzes.map((quiz) => (
                  <div key={quiz._id} className="quiz-card completed-quiz">
                    <div className="quiz-header">
                      <h3>{quiz.title}</h3>
                      <div className="quiz-meta">
                        <span className="subject">{quiz.subject}</span>
                        <span className="teacher">by {quiz.teacher}</span>
                      </div>
                    </div>
                    
                    <div className="quiz-details">
                      <div className="detail-item">
                        <CheckCircle size={16} />
                        <span>Completed: {new Date(quiz.completedAt).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <div className="quiz-score">
                      <div className={`score-badge ${getScoreColor(quiz.score)}`}>
                        {quiz.score}%
                      </div>
                      <span className="score-label">Your Score</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <CheckCircle size={48} />
                <h3>No Completed Quizzes</h3>
                <p>Complete your first quiz to see results here!</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Summary Stats */}
      {completedQuizzes.length > 0 && (
        <div className="quiz-stats">
          <div className="stat-card">
            <div className="stat-number">{completedQuizzes.length}</div>
            <div className="stat-label">Completed</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">
              {Math.round(completedQuizzes.reduce((sum, quiz) => sum + quiz.score, 0) / completedQuizzes.length)}%
            </div>
            <div className="stat-label">Average Score</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">
              {Math.max(...completedQuizzes.map(quiz => quiz.score))}%
            </div>
            <div className="stat-label">Best Score</div>
          </div>
        </div>
      )}
    </div>
  );
}

export default QuizList;