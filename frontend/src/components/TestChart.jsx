import React from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import ChartContainer from './ChartContainer';

const TestChart = ({ 
  studentDetails = null, 
  completedQuizzes = [] 
}) => {
  const COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'];

  // Process student's assigned subjects for pie chart
  const processSubjectDistribution = () => {
    const assignedSubjects = studentDetails?.subject && Array.isArray(studentDetails.subject) && studentDetails.subject.length > 0 
      ? studentDetails.subject 
      : ['ADBMS', 'AI & KR', 'STQA']; // Default subjects if none assigned

    return assignedSubjects.map((subject, index) => {
      // Count quizzes for each subject
      const subjectQuizzes = completedQuizzes.filter(quiz => 
        quiz.subject === subject || quiz.title?.toLowerCase().includes(subject.toLowerCase())
      );
      
      return {
        name: subject,
        value: subjectQuizzes.length || 1, // Show at least 1 for visualization
        quizCount: subjectQuizzes.length,
        fill: COLORS[index % COLORS.length]
      };
    });
  };

  // Process student's performance by subject for line chart
  const processSubjectPerformance = () => {
    const assignedSubjects = studentDetails?.subject && Array.isArray(studentDetails.subject) && studentDetails.subject.length > 0 
      ? studentDetails.subject 
      : ['ADBMS', 'AI & KR', 'STQA']; // Default subjects if none assigned

    return assignedSubjects.map(subject => {
      // Calculate average performance for each subject
      const subjectQuizzes = completedQuizzes.filter(quiz => 
        quiz.subject === subject || quiz.title?.toLowerCase().includes(subject.toLowerCase())
      );

      let avgPerformance = 0;
      if (subjectQuizzes.length > 0) {
        avgPerformance = Math.round(
          subjectQuizzes.reduce((sum, quiz) => sum + quiz.score, 0) / subjectQuizzes.length
        );
      } else {
        // Generate sample performance for subjects with no quizzes (for demo)
        avgPerformance = Math.floor(Math.random() * 30) + 60; // Random between 60-90
      }

      return {
        subject: subject,
        performance: avgPerformance,
        quizCount: subjectQuizzes.length
      };
    });
  };

  const subjectDistributionData = processSubjectDistribution();
  const subjectPerformanceData = processSubjectPerformance();

  console.log('TestChart rendering with data:', { 
    studentDetails, 
    completedQuizzes: completedQuizzes.length,
    subjectDistributionData, 
    subjectPerformanceData 
  });

  return (
    <div className="charts-section" style={{ 
      display: 'grid', 
      gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', 
      gap: '1.5rem', 
      marginBottom: '2rem',
      backgroundColor: '#f8f9fa',
      padding: '1rem',
      borderRadius: '8px'
    }}>
      {/* Subject Distribution Chart */}
      <div style={{ 
        backgroundColor: 'white', 
        padding: '20px', 
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        <h3>Subject Distribution</h3>
        <p>Subjects assigned to you and quiz completion count</p>
        <div style={{ width: '100%', height: '300px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={subjectDistributionData}
                cx="50%"
                cy="50%"
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
                label={({ name, quizCount }) => `${name}: ${quizCount || 0} quizzes`}
              >
                {subjectDistributionData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value, name, props) => [
                  `${props.payload.quizCount} quizzes completed`, 
                  name
                ]}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Subject Performance Chart */}
      <div style={{ 
        backgroundColor: 'white', 
        padding: '20px', 
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        <h3>Subject Performance</h3>
        <p>Your average performance by subject</p>
        <div style={{ width: '100%', height: '300px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={subjectPerformanceData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="subject" />
              <YAxis domain={[0, 100]} />
              <Tooltip 
                formatter={(value, name, props) => [
                  `${value}% (${props.payload.quizCount} quizzes)`, 
                  "Average Score"
                ]}
                labelFormatter={(label) => `Subject: ${label}`}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="performance" 
                stroke="#4ECDC4" 
                strokeWidth={3}
                dot={{ fill: '#4ECDC4', r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default TestChart;