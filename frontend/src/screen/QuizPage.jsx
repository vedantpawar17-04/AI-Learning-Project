import { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { ArrowLeft, Clock, CheckCircle, AlertCircle, BookOpen, Trophy, Target } from "lucide-react";
import "./QuizPage.css";

function QuizPage() {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { studentId } = location.state || {};

  const [quiz, setQuiz] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [score, setScore] = useState(0);

  // Fetch quiz data
  useEffect(() => {
    const fetchQuiz = async () => {
      try {
        const response = await axios.get(`http://localhost:5000/api/quiz/${quizId}`);
        setQuiz(response.data);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching quiz:", error);
        setLoading(false);
      }
    };

    if (quizId) {
      fetchQuiz();
    }
  }, [quizId]);

  // Handle answer selection
  const handleAnswerSelect = (questionIndex, answerIndex) => {
    setAnswers({
      ...answers,
      [questionIndex]: answerIndex
    });
  };

  // Calculate score
  const calculateScore = () => {
    let correct = 0;
    quiz.questions.forEach((question, index) => {
      if (answers[index] === question.correctAnswer) {
        correct++;
      }
    });
    return Math.round((correct / quiz.questions.length) * 100);
  };

  // Submit quiz
  const handleSubmitQuiz = async () => {
    setSubmitting(true);
    try {
      const finalScore = calculateScore();
      setScore(finalScore);

      // Submit to new QuizAnswer API
      await axios.post(`http://localhost:5000/api/quiz-answer/submit`, {
        quizId,
        studentId,
        score: finalScore,
        answers
      });

      setQuizCompleted(true);
    } catch (error) {
      console.error("Error submitting quiz:", error);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="quiz-page">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading quiz...</p>
        </div>
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="quiz-page">
        <div className="error-state">
          <h2>Quiz not found</h2>
          <button onClick={() => navigate(-1)} className="btn-primary">
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (quizCompleted) {
    return (
      <div className="quiz-page">
        <div className="quiz-completed">
          <div className="completion-card">
            <CheckCircle size={64} className="success-icon" />
            <h2>Quiz Completed!</h2>
            <div className="score-display">
              <span className="score-number">{score}%</span>
              <span className="score-label">Your Score</span>
            </div>
            <div className="quiz-summary">
              <p><strong>Quiz:</strong> {quiz.title}</p>
              <p><strong>Questions:</strong> {quiz.questions.length}</p>
              <p><strong>Correct Answers:</strong> {Math.round((score / 100) * quiz.questions.length)}</p>
            </div>
            <button 
              onClick={() => navigate('/student-dashboard', { 
                state: { 
                  studentId: studentId,
                  username: location.state?.username,
                  refreshData: true 
                }
              })} 
              className="btn-primary"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  const currentQ = quiz.questions[currentQuestion];

  return (
    <div className="quiz-page">
      {/* Header */}
      <div className="quiz-header">
        <button onClick={() => navigate(-1)} className="back-btn">
          <ArrowLeft size={20} />
          Back
        </button>
        <div className="quiz-info">
          <h1>{quiz.title}</h1>
          <span className="question-counter">
            Question {currentQuestion + 1} of {quiz.questions.length}
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="progress-bar">
        <div 
          className="progress-fill" 
          style={{ width: `${((currentQuestion + 1) / quiz.questions.length) * 100}%` }}
        ></div>
      </div>

      {/* Question */}
      <div className="quiz-content">
        <div className="question-card">
          <h2 className="question-text">{currentQ.questionText}</h2>
          
          <div className="options-list">
            {currentQ.options.map((option, index) => (
              <button
                key={index}
                className={`option-btn ${answers[currentQuestion] === index ? 'selected' : ''}`}
                onClick={() => handleAnswerSelect(currentQuestion, index)}
              >
                <span className="option-letter">{String.fromCharCode(65 + index)}</span>
                <span className="option-text">{option}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Navigation */}
        <div className="quiz-navigation">
          <button
            onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))}
            disabled={currentQuestion === 0}
            className="btn-secondary"
          >
            Previous
          </button>

          {currentQuestion === quiz.questions.length - 1 ? (
            <button
              onClick={handleSubmitQuiz}
              disabled={submitting}
              className="btn-primary submit-btn"
            >
              {submitting ? 'Submitting...' : 'Submit Quiz'}
            </button>
          ) : (
            <button
              onClick={() => setCurrentQuestion(Math.min(quiz.questions.length - 1, currentQuestion + 1))}
              className="btn-primary"
            >
              Next
            </button>
          )}
        </div>

        {/* Question Navigator */}
        <div className="question-navigator">
          <h4>Questions:</h4>
          <div className="question-dots">
            {quiz.questions.map((_, index) => (
              <button
                key={index}
                className={`question-dot ${index === currentQuestion ? 'current' : ''} ${answers[index] !== undefined ? 'answered' : ''}`}
                onClick={() => setCurrentQuestion(index)}
              >
                {index + 1}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default QuizPage;