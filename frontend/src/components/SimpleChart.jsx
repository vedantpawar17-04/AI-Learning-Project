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

const SimpleChart = () => {
  const data = [
    { name: 'Math', value: 30 },
    { name: 'Science', value: 25 },
    { name: 'English', value: 20 },
    { name: 'History', value: 25 }
  ];

  const lineData = [
    { subject: 'Math', performance: 85 },
    { subject: 'Science', performance: 72 },
    { subject: 'English', performance: 78 },
    { subject: 'History', performance: 90 }
  ];

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

  return (
    <div style={{ 
      display: 'flex', 
      gap: '20px', 
      padding: '20px',
      backgroundColor: 'white',
      border: '2px solid red' // Debug border
    }}>
      {/* Simple Pie Chart */}
      <div style={{ width: '400px', height: '300px', border: '1px solid blue' }}>
        <h3>Simple Pie Chart</h3>
        <PieChart width={400} height={300}>
          <Pie
            data={data}
            cx={200}
            cy={150}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </div>

      {/* Simple Line Chart */}
      <div style={{ width: '400px', height: '300px', border: '1px solid green' }}>
        <h3>Simple Line Chart</h3>
        <LineChart width={400} height={300} data={lineData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="subject" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="performance" stroke="#8884d8" strokeWidth={2} />
        </LineChart>
      </div>
    </div>
  );
};

export default SimpleChart;