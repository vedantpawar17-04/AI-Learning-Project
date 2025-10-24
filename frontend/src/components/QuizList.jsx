import { Clock, CheckCircle, Play, Eye } from "lucide-react";
import "./QuizList.css";

function QuizList({ 
  quizzes, 
  type = "upcoming", // "upcoming", "completed", "recent"
  onQuizAction,
  showActions = true,
  maxItems = null,
  emptyMessage = "No quizzes available"
}) {
  const displayQuizzes = maxItems ? quizzes.slice(0, maxItems) : quizzes;

  const getScoreColor = (score) => {
    if (score >= 80) return 'excellent';
    if (score >= 60) return 'good';
    if (score >= 40) return 'average';
    return 'poor';
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (!quizzes || quizzes.length === 0) {
    return (
      <div className="quiz-list-empty">
        <div className="empty-icon">
          {type === "upcoming" ? <Clock size={48} /> : <CheckCircle size={48} />}
        </div>
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className={`quiz-list ${type}`}>
      {displayQuizzes.map((quiz, index) => (
        <div key={quiz._id || index} className={`quiz-item ${type}`}>
          <div className="quiz-info">
            <h5 className="quiz-title">{quiz.title}</h5>
            
            {quiz.subject && (
              <span className="quiz-subject">
                Subject: {quiz.subject}
              </span>
            )}
            
            {quiz.teacher && (
              <span className="quiz-teacher">
                Teacher: {quiz.teacher}
              </span>
            )}
            
            <div className="quiz-meta">
              {type === "upcoming" && quiz.dueDate && (
                <span className="quiz-date">
                  <Clock size={14} />
                  Due: {formatDate(quiz.dueDate)}
                </span>
              )}
              
              {type === "completed" && quiz.completedAt && (
                <span className="quiz-date">
                  <CheckCircle size={14} />
                  Completed: {formatDate(quiz.completedAt)}
                </span>
              )}
              
              {type === "recent" && quiz.completedAt && (
                <span className="quiz-date">
                  {formatDate(quiz.completedAt)}
                </span>
              )}
            </div>
          </div>

          {showActions && (
            <div className="quiz-actions">
              {type === "completed" && quiz.score !== undefined && (
                <div className={`quiz-score ${getScoreColor(quiz.score)}`}>
                  {quiz.score}%
                </div>
              )}
              
              {type === "upcoming" && (
                <button
                  className="quiz-action-btn primary"
                  onClick={() => onQuizAction && onQuizAction('start', quiz)}
                >
                  <Play size={16} />
                  Start Quiz
                </button>
              )}
              
              {type === "completed" && (
                <button
                  className="quiz-action-btn secondary"
                  onClick={() => onQuizAction && onQuizAction('review', quiz)}
                >
                  <Eye size={16} />
                  Review
                </button>
              )}
              
              {type === "recent" && quiz.score !== undefined && (
                <>
                  <div className={`quiz-score ${getScoreColor(quiz.score)}`}>
                    {quiz.score}%
                  </div>
                  <button
                    className="quiz-action-btn secondary"
                    onClick={() => onQuizAction && onQuizAction('review', quiz)}
                  >
                    Review
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default QuizList;