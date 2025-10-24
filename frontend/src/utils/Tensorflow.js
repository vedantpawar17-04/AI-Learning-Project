// TensorFlow.js utilities for AI-powered features
// This file contains all AI/ML related functionality using TensorFlow.js

import * as tf from '@tensorflow/tfjs';

class AIAnalytics {
  constructor() {
    this.model = null;
    this.isModelLoaded = false;
  }

  // Initialize TensorFlow.js and load pre-trained model
  async initializeModel() {
    try {
      console.log('Initializing TensorFlow.js...');
      
      // Set backend (webgl for better performance, cpu as fallback)
      await tf.setBackend('webgl');
      await tf.ready();
      
      // For now, we'll create a simple model for demonstration
      // In production, you would load a pre-trained model
      this.model = this.createPerformancePredictionModel();
      
      this.isModelLoaded = true;
      console.log('TensorFlow.js model loaded successfully');
      
      return true;
    } catch (error) {
      console.error('Error initializing TensorFlow.js:', error);
      // Fallback to CPU backend
      try {
        await tf.setBackend('cpu');
        await tf.ready();
        this.model = this.createPerformancePredictionModel();
        this.isModelLoaded = true;
        return true;
      } catch (fallbackError) {
        console.error('Failed to initialize TensorFlow.js with CPU backend:', fallbackError);
        return false;
      }
    }
  }

  // Create a simple neural network for performance prediction
  createPerformancePredictionModel() {
    const model = tf.sequential({
      layers: [
        tf.layers.dense({ inputShape: [4], units: 8, activation: 'relu' }),
        tf.layers.dense({ units: 4, activation: 'relu' }),
        tf.layers.dense({ units: 1, activation: 'sigmoid' })
      ]
    });

    model.compile({
      optimizer: 'adam',
      loss: 'meanSquaredError',
      metrics: ['mae']
    });

    return model;
  }

  // Analyze student performance using AI
  async analyzeStudentPerformance(completedQuizzes) {
    try {
      if (!this.isModelLoaded) {
        await this.initializeModel();
      }

      if (!completedQuizzes || completedQuizzes.length === 0) {
        return this.getDefaultAnalysis();
      }

      // Extract features from quiz data
      const features = this.extractFeatures(completedQuizzes);
      
      // Perform AI analysis
      const predictions = await this.predictPerformance(features);
      
      // Generate insights based on analysis
      const insights = this.generateInsights(completedQuizzes, predictions);
      
      return insights;
    } catch (error) {
      console.error('Error in AI analysis:', error);
      return this.getFallbackAnalysis(completedQuizzes);
    }
  }

  // Extract numerical features from quiz data for ML model
  extractFeatures(quizzes) {
    const scores = quizzes.map(q => q.score);
    const avgScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    const scoreVariance = this.calculateVariance(scores);
    const trendSlope = this.calculateTrend(scores);
    const completionRate = quizzes.length; // Could be normalized based on time period

    return [avgScore / 100, scoreVariance / 10000, trendSlope, completionRate / 10];
  }

  // Predict future performance using the ML model
  async predictPerformance(features) {
    if (!this.model) return 0.5; // Default prediction

    try {
      const tensor = tf.tensor2d([features]);
      const prediction = await this.model.predict(tensor);
      const result = await prediction.data();
      
      tensor.dispose();
      prediction.dispose();
      
      return result[0];
    } catch (error) {
      console.error('Error in prediction:', error);
      return 0.5;
    }
  }

  // Generate AI-powered insights and recommendations
  generateInsights(quizzes, prediction) {
    const scores = quizzes.map(q => q.score);
    const avgScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    const trend = this.calculateTrend(scores);
    
    // Subject performance analysis
    const subjectPerformance = {};
    quizzes.forEach(quiz => {
      const subject = quiz.subject || 'General';
      if (!subjectPerformance[subject]) {
        subjectPerformance[subject] = { total: 0, count: 0, scores: [] };
      }
      subjectPerformance[subject].total += quiz.score;
      subjectPerformance[subject].count += 1;
      subjectPerformance[subject].scores.push(quiz.score);
    });

    // Find weak subjects (AI-enhanced)
    const weakSubjects = Object.entries(subjectPerformance)
      .filter(([subject, data]) => {
        const subjectAvg = data.total / data.count;
        const subjectTrend = this.calculateTrend(data.scores);
        return subjectAvg < 70 || subjectTrend < -5; // Declining performance
      })
      .map(([subject]) => subject);

    // AI-powered difficulty recommendation
    let recommendedDifficulty = 'Medium';
    if (prediction > 0.8 && avgScore >= 85) {
      recommendedDifficulty = 'Hard';
    } else if (prediction < 0.4 || avgScore < 60) {
      recommendedDifficulty = 'Easy';
    }

    // Generate personalized recommendations
    const recommendations = this.generateRecommendations(avgScore, trend, weakSubjects, prediction);

    return {
      weakSubjects,
      recommendedDifficulty,
      recommendations,
      overallAverage: Math.round(avgScore),
      performanceTrend: trend > 0 ? 'improving' : trend < 0 ? 'declining' : 'stable',
      predictedSuccess: Math.round(prediction * 100),
      subjectPerformance
    };
  }

  // Generate personalized study recommendations
  generateRecommendations(avgScore, trend, weakSubjects, prediction) {
    const recommendations = [];

    // Performance-based recommendations
    if (avgScore >= 85 && trend >= 0) {
      recommendations.push('Excellent work! Consider mentoring other students to reinforce your knowledge.');
      recommendations.push('Challenge yourself with advanced topics and real-world applications.');
    } else if (avgScore >= 70 && trend >= 0) {
      recommendations.push('Good progress! Focus on consistency and aim for higher scores.');
      recommendations.push('Review incorrect answers to identify knowledge gaps.');
    } else if (avgScore < 60 || trend < -5) {
      recommendations.push('Consider scheduling regular study sessions with focused review.');
      recommendations.push('Seek help from teachers or tutors for challenging concepts.');
    }

    // Subject-specific recommendations
    if (weakSubjects.length > 0) {
      recommendations.push(`Prioritize studying ${weakSubjects.join(', ')} - these subjects need attention.`);
      recommendations.push('Create concept maps and flashcards for weak subject areas.');
    }

    // AI prediction-based recommendations
    if (prediction < 0.5) {
      recommendations.push('AI suggests increasing study time and using active learning techniques.');
      recommendations.push('Consider forming study groups or finding a study partner.');
    } else if (prediction > 0.8) {
      recommendations.push('AI predicts strong performance - maintain your current study habits.');
    }

    return recommendations;
  }

  // Generate study tips using AI analysis
  generateStudyTips(analysisData) {
    const tips = [];
    
    if (!analysisData || !analysisData.overallAverage) {
      return [
        'Start with easier topics to build confidence',
        'Create a consistent study schedule',
        'Take regular breaks during study sessions',
        'Use active recall techniques like flashcards'
      ];
    }

    const { overallAverage, performanceTrend, weakSubjects } = analysisData;

    // Performance-based tips
    if (overallAverage >= 80) {
      tips.push('Teach concepts to others to deepen understanding');
      tips.push('Explore advanced applications of the topics you know well');
      tips.push('Set challenging goals to maintain motivation');
    } else if (overallAverage >= 60) {
      tips.push('Focus on understanding concepts rather than memorization');
      tips.push('Practice with varied question types');
      tips.push('Review mistakes immediately after quizzes');
    } else {
      tips.push('Break down complex topics into smaller, manageable parts');
      tips.push('Use visual aids like diagrams and mind maps');
      tips.push('Practice fundamental concepts daily');
    }

    // Trend-based tips
    if (performanceTrend === 'declining') {
      tips.push('Identify what changed in your study routine and adjust');
      tips.push('Consider if external factors are affecting your performance');
    } else if (performanceTrend === 'improving') {
      tips.push('Continue your current study methods - they\'re working!');
    }

    // Subject-specific tips
    if (weakSubjects && weakSubjects.length > 0) {
      tips.push(`Allocate extra time for ${weakSubjects[0]} - use spaced repetition`);
      tips.push('Find alternative learning resources for challenging subjects');
    }

    return tips.slice(0, 5); // Return top 5 tips
  }

  // Utility functions
  calculateVariance(scores) {
    const mean = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    const variance = scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length;
    return variance;
  }

  calculateTrend(scores) {
    if (scores.length < 2) return 0;
    
    const n = scores.length;
    const x = Array.from({ length: n }, (_, i) => i);
    const sumX = x.reduce((sum, val) => sum + val, 0);
    const sumY = scores.reduce((sum, val) => sum + val, 0);
    const sumXY = x.reduce((sum, val, i) => sum + val * scores[i], 0);
    const sumXX = x.reduce((sum, val) => sum + val * val, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    return slope;
  }

  // Fallback analysis when AI is not available
  getFallbackAnalysis(quizzes) {
    if (!quizzes || quizzes.length === 0) {
      return this.getDefaultAnalysis();
    }

    const scores = quizzes.map(q => q.score);
    const avgScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    
    const subjectPerformance = {};
    quizzes.forEach(quiz => {
      const subject = quiz.subject || 'General';
      if (!subjectPerformance[subject]) {
        subjectPerformance[subject] = { total: 0, count: 0 };
      }
      subjectPerformance[subject].total += quiz.score;
      subjectPerformance[subject].count += 1;
    });

    const weakSubjects = Object.entries(subjectPerformance)
      .filter(([subject, data]) => (data.total / data.count) < 70)
      .map(([subject]) => subject);

    let recommendedDifficulty = 'Medium';
    if (avgScore >= 85) recommendedDifficulty = 'Hard';
    else if (avgScore < 60) recommendedDifficulty = 'Easy';

    const recommendations = [];
    if (weakSubjects.length > 0) {
      recommendations.push(`Focus more on ${weakSubjects.join(', ')} - performance is below average.`);
    }
    if (avgScore >= 80) {
      recommendations.push('Great job! Consider taking more challenging quizzes.');
    } else if (avgScore < 60) {
      recommendations.push('Review fundamental concepts and practice more regularly.');
    }

    return {
      weakSubjects,
      recommendedDifficulty,
      recommendations,
      overallAverage: Math.round(avgScore),
      subjectPerformance
    };
  }

  getDefaultAnalysis() {
    return {
      weakSubjects: [],
      recommendedDifficulty: 'Medium',
      recommendations: ['Complete more quizzes to get personalized insights'],
      overallAverage: 0,
      subjectPerformance: {}
    };
  }

  // Clean up TensorFlow.js resources
  dispose() {
    if (this.model) {
      this.model.dispose();
    }
    // Clean up any remaining tensors
    tf.disposeVariables();
  }
}

// Export singleton instance
export const aiAnalytics = new AIAnalytics();

// Export utility functions for direct use
export const TensorFlowUtils = {
  // Initialize TensorFlow.js for the application
  async initialize() {
    return await aiAnalytics.initializeModel();
  },

  // Analyze student performance data
  async analyzePerformance(quizData) {
    return await aiAnalytics.analyzeStudentPerformance(quizData);
  },

  // Generate study tips based on performance
  generateStudyTips(analysisData) {
    return aiAnalytics.generateStudyTips(analysisData);
  },

  // Clean up resources
  cleanup() {
    aiAnalytics.dispose();
  }
};

export default aiAnalytics;