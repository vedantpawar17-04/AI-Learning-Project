import { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { ArrowLeft, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import "./QuizReview.css";

function QuizReview() {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { studentId, username } = location.state || {};

  const [quiz, setQuiz] = useState(null);
  const [studentResult, setStudentResult] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchQuizReview = async () => {
      try {

        // Fetch quiz answers from new API
        const answerResponse = await axios.get(`http://localhost:5000/api/quiz-answer/${quizId}/${studentId}`);
        const answerData = answerResponse.data;

        if (!answerData) {
          setError("No results found for this quiz.");
          return;
        }

        // Set quiz data from populated field
        setQuiz(answerData.quizId);

        // Transform answer data to match expected format
        const transformedResult = {
          score: answerData.score,
          completedAt: answerData.completedAt,
          correctAnswers: answerData.correctAnswers,
          totalQuestions: answerData.totalQuestions,
          answerDetails: answerData.answers, // Keep the detailed answer array
          answers: answerData.answers.reduce((acc, answer) => {
            acc[answer.questionIndex] = answer.selectedOption;
            return acc;
          }, {})
        };

        setStudentResult(transformedResult);

        // Debug logging
        console.log("QuizAnswer API Response:", answerData);
        console.log("Transformed Result:", transformedResult);
        console.log("Correct Answers Count:", answerData.correctAnswers);
      } catch (err) {
        console.error("Error fetching quiz review:", err);
        setError("Failed to load quiz review.");
      }
    };

    if (quizId && studentId) {
      fetchQuizReview();
    }
  }, [quizId, studentId]);

  const getOptionLetter = (index) => String.fromCharCode(65 + index);

  const isCorrectAnswer = (questionIndex, selectedAnswer) => {
    if (!quiz || !quiz.questions || !quiz.questions[questionIndex]) {
      return false;
    }
    return selectedAnswer === quiz.questions[questionIndex].correctAnswer;
  };
  console.log(isCorrectAnswer);

  if (error || !quiz || !studentResult) {
    return (
      <div className="quiz-review-page">
        <div className="error-state">
          <AlertCircle size={48} />
          <h2>{error || "Quiz review not found"}</h2>
          <button
            onClick={() => navigate('/student-dashboard', {
              state: {
                studentId: studentId,
                username: username,
                refreshData: true
              }
            })}
            className="btn-primary"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Calculate correct answers from QuizAnswer data
  const correctAnswers = studentResult.correctAnswers ||
    (studentResult.answerDetails ?
      studentResult.answerDetails.filter(answer => answer.isCorrect).length : 0);

  return (
    <div className="quiz-review-page">
      {/* Header */}
      <div className="review-header">
        <button
          onClick={() => navigate('/student-dashboard', {
            state: {
              studentId: studentId,
              username: username,
              refreshData: true
            }
          })}
          className="back-btn"
        >
          <ArrowLeft size={20} />
          Back to Dashboard
        </button>

        <div className="review-info">
          <h1>{quiz.title} - Review</h1>
          <div className="review-stats">
            <span className="stat">
              Score: <strong>{studentResult.score}%</strong>
            </span>
            <span className="stat">
              Correct: <strong>{correctAnswers}/{quiz.questions.length}</strong>
            </span>
            <span className="stat">
              Completed: <strong>{new Date(studentResult.completedAt).toLocaleDateString()}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Questions Review */}
      <div className="review-content">
        <div className="review-summary">
          <h2>Answer Review</h2>
          <p>Review your answers compared to the correct solutions</p>
        </div>

        <div className="questions-review">
          {quiz.questions.map((question, questionIndex) => {
            // Get answer details from QuizAnswer data
            const answerDetail = studentResult.answerDetails ?
              studentResult.answerDetails.find(ans => ans.questionIndex === questionIndex) : null;

            const studentAnswer = answerDetail ? answerDetail.selectedOption :
              (studentResult.answers ? studentResult.answers[questionIndex.toString()] : undefined);
            const correctAnswer = question.correctAnswer;

            // Use isCorrect from QuizAnswer data if available, otherwise calculate
            const isCorrect = answerDetail ? answerDetail.isCorrect :
              (studentAnswer !== undefined && studentAnswer === correctAnswer);

            return (
              <div key={questionIndex} className={`question-review-card ${isCorrect ? 'correct' : 'incorrect'}`}>
                <div className="question-header">
                  <div className="question-status">
                    {isCorrect ? (
                      <CheckCircle className="correct-icon" size={24} />
                    ) : (
                      <XCircle className="incorrect-icon" size={24} />
                    )}
                  </div>
                </div>

                <div className="question-content">
                  <h3 className="question-text">{question.questionText}</h3>

                  <div className="answers-comparison">
                    <div className="options-list">
                      {question.options.map((option, optionIndex) => {
                        const isStudentChoice = studentAnswer === optionIndex;
                        const isCorrectChoice = correctAnswer === optionIndex;

                        let optionClass = 'option-item';
                        if (isCorrectChoice) {
                          optionClass += ' correct-option';
                        }
                        if (isStudentChoice && !isCorrectChoice) {
                          optionClass += ' student-wrong';
                        }
                        if (isStudentChoice && isCorrectChoice) {
                          optionClass += ' student-correct';
                        }

                        return (
                          <div key={optionIndex} className={optionClass}>
                            <div className="option-letter">
                              {getOptionLetter(optionIndex)}
                            </div>
                            <div className="option-text">{option}</div>
                            <div className="option-indicators">
                              {isStudentChoice && (
                                <span className="student-indicator">
                                  Your Answer
                                </span>
                              )}
                              {isCorrectChoice && (
                                <span className="correct-indicator">
                                  Correct Answer
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="answer-explanation">
                    {isCorrect ? (
                      <div className="explanation correct-explanation">
                        <CheckCircle size={16} />
                        <span>Correct! You selected the right answer.</span>
                      </div>
                    ) : (
                      <div className="explanation incorrect-explanation">
                        <XCircle size={16} />
                        <span>
                          You selected <strong>{getOptionLetter(studentAnswer)}</strong>,
                          but the correct answer was <strong>{getOptionLetter(correctAnswer)}</strong>.
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default QuizReview;