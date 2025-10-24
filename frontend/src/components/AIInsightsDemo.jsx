// Demo component showing TensorFlow.js AI features
import { useState, useEffect } from 'react';
import { TensorFlowUtils } from '../utils/Tensorflow';
import './AIInsightsDemo.css';

function AIInsightsDemo() {
  const [isLoading, setIsLoading] = useState(false);
  const [aiReady, setAiReady] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [studyTips, setStudyTips] = useState([]);

  // Sample quiz data for demonstration
  const sampleQuizData = [
    { subject: 'Math', score: 85, completedAt: '2024-01-15' },
    { subject: 'Science', score: 72, completedAt: '2024-01-16' },
    { subject: 'Math', score: 90, completedAt: '2024-01-17' },
    { subject: 'English', score: 65, completedAt: '2024-01-18' },
    { subject: 'Science', score: 78, completedAt: '2024-01-19' },
  ];

  useEffect(() => {
    initializeAI();
    return () => {
      TensorFlowUtils.cleanup();
    };
  }, []);

  const initializeAI = async () => {
    setIsLoading(true);
    try {
      const initialized = await TensorFlowUtils.initialize();
      setAiReady(initialized);
      
      if (initialized) {
        console.log('TensorFlow.js initialized successfully!');
      }
    } catch (error) {
      console.error('Failed to initialize AI:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const runAIAnalysis = async () => {
    if (!aiReady) {
      alert('AI is not ready yet. Please wait for initialization.');
      return;
    }

    setIsLoading(true);
    try {
      // Run AI analysis on sample data
      const analysisResult = await TensorFlowUtils.analyzePerformance(sampleQuizData);
      setAnalysis(analysisResult);

      // Generate study tips
      const tips = TensorFlowUtils.generateStudyTips(analysisResult);
      setStudyTips(tips);

      console.log('AI Analysis Result:', analysisResult);
    } catch (error) {
      console.error('Error running AI analysis:', error);
      alert('Error running AI analysis. Check console for details.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="ai-insights-demo">
      <div className="demo-header">
        <h2>🤖 TensorFlow.js AI Insights Demo</h2>
        <p>This demo shows how TensorFlow.js is integrated for AI-powered student analytics</p>
      </div>

      <div className="demo-status">
        <div className={`status-indicator ${aiReady ? 'ready' : 'loading'}`}>
          <span className="status-dot"></span>
          <span className="status-text">
            {isLoading ? 'Initializing AI...' : aiReady ? 'AI Ready' : 'AI Not Ready'}
          </span>
        </div>
      </div>

      <div className="demo-actions">
        <button 
          onClick={runAIAnalysis} 
          disabled={!aiReady || isLoading}
          className="analyze-btn"
        >
          {isLoading ? 'Analyzing...' : 'Run AI Analysis'}
        </button>
      </div>

      {analysis && (
        <div className="analysis-results">
          <h3>📊 AI Analysis Results</h3>
          
          <div className="results-grid">
            <div className="result-card">
              <h4>Overall Performance</h4>
              <div className="metric-value">{analysis.overallAverage}%</div>
              <div className="metric-label">Average Score</div>
            </div>

            <div className="result-card">
              <h4>Performance Trend</h4>
              <div className="metric-value">{analysis.performanceTrend || 'Stable'}</div>
              <div className="metric-label">Trend Direction</div>
            </div>

            <div className="result-card">
              <h4>Recommended Difficulty</h4>
              <div className="metric-value">{analysis.recommendedDifficulty}</div>
              <div className="metric-label">Next Quiz Level</div>
            </div>

            {analysis.predictedSuccess && (
              <div className="result-card">
                <h4>Success Prediction</h4>
                <div className="metric-value">{analysis.predictedSuccess}%</div>
                <div className="metric-label">AI Confidence</div>
              </div>
            )}
          </div>

          {analysis.weakSubjects && analysis.weakSubjects.length > 0 && (
            <div className="weak-subjects">
              <h4>⚠️ Areas for Improvement</h4>
              <div className="subject-tags">
                {analysis.weakSubjects.map((subject, index) => (
                  <span key={index} className="subject-tag weak">
                    {subject}
                  </span>
                ))}
              </div>
            </div>
          )}

          {analysis.recommendations && analysis.recommendations.length > 0 && (
            <div className="recommendations">
              <h4>💡 AI Recommendations</h4>
              <ul>
                {analysis.recommendations.map((rec, index) => (
                  <li key={index}>{rec}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {studyTips.length > 0 && (
        <div className="study-tips">
          <h3>📚 Personalized Study Tips</h3>
          <div className="tips-list">
            {studyTips.map((tip, index) => (
              <div key={index} className="tip-item">
                <span className="tip-number">{index + 1}</span>
                <span className="tip-text">{tip}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="demo-info">
        <h4>🔧 Technical Details</h4>
        <ul>
          <li>Uses TensorFlow.js for client-side machine learning</li>
          <li>Analyzes quiz performance patterns using neural networks</li>
          <li>Generates personalized recommendations based on AI predictions</li>
          <li>Runs entirely in the browser - no server-side ML required</li>
          <li>Automatically falls back to heuristic analysis if TensorFlow.js fails</li>
        </ul>
      </div>
    </div>
  );
}

export default AIInsightsDemo;