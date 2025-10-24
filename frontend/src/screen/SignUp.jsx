import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./SignUp.css";

function SignUp() {
  const [formData, setFormData] = useState({
    email: "",
    username: "",
    role: "not-selected",
    subject: [], // ✅ Now supports multiple subjects
    teacherId: [], // ✅ Now supports multiple teachers
    password: "",
    confirmPassword: "",
  });

  const [teachers, setTeachers] = useState([]); // ✅ store teachers list
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [userExists, setUserExists] = useState(false);
  const [fieldsDisabled, setFieldsDisabled] = useState(false);

  const navigate = useNavigate();

  const rules = [
    { test: /.{8,}/, text: "- At least 8 characters long" },
    { test: /[A-Z]/, text: "- At least one uppercase letter" },
    { test: /[a-z]/, text: "- At least one lowercase letter" },
    { test: /[0-9]/, text: "- At least one number" },
    { test: /[@$!%*?&]/, text: "- At least one special character (@$!%*?&)" },
  ];

  const subjectOptions = ["ADBMS", "STQA", "DevOps", "AI & KR", "ML & DL"];

  // Handle input
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Handle multiple subject selection
  const handleSubjectChange = (subject) => {
    setFormData(prev => {
      const currentSubjects = Array.isArray(prev.subject) ? prev.subject : [];
      const isSelected = currentSubjects.includes(subject);
      
      if (isSelected) {
        // Remove subject
        return {
          ...prev,
          subject: currentSubjects.filter(s => s !== subject)
        };
      } else {
        // Add subject
        return {
          ...prev,
          subject: [...currentSubjects, subject]
        };
      }
    });
  };

  // Handle multiple teacher selection
  const handleTeacherChange = (teacherId) => {
    setFormData(prev => {
      const currentTeachers = Array.isArray(prev.teacherId) ? prev.teacherId : [];
      const isSelected = currentTeachers.includes(teacherId);
      
      if (isSelected) {
        // Remove teacher
        return {
          ...prev,
          teacherId: currentTeachers.filter(t => t !== teacherId)
        };
      } else {
        // Add teacher
        return {
          ...prev,
          teacherId: [...currentTeachers, teacherId]
        };
      }
    });
  };

  // Fetch teachers when student picks subjects
  useEffect(() => {
    const fetchTeachers = async () => {
      if (formData.role === "student" && Array.isArray(formData.subject) && formData.subject.length > 0) {
        try {
          // Fetch teachers for all selected subjects
          const teacherPromises = formData.subject.map(subject =>
            axios.get(`http://localhost:5000/api/subjects/teachers/${subject}`)
          );
          
          const responses = await Promise.all(teacherPromises);
          const allTeachers = responses.flatMap(res => res.data || []);
          
          // Remove duplicates based on teacher ID
          const uniqueTeachers = allTeachers.filter((teacher, index, self) =>
            index === self.findIndex(t => t._id === teacher._id)
          );
          
          setTeachers(uniqueTeachers);
        } catch (err) {
          console.error("Error fetching teachers:", err);
        }
      } else {
        setTeachers([]);
      }
    };
    fetchTeachers();
  }, [formData.role, formData.subject]);

  // Submit
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      setError("❌ Passwords do not match.");
      return;
    }

    if (formData.role === "not-selected") {
      setError("⚠️ Please fill in all the required data.");
      setTimeout(() => setError(""), 3000);
      return;
    }

    try {
      const payload = {
        email: formData.email,
        username: formData.username,
        role: formData.role,
        password: formData.password,
        subject: formData.subject,
      };

      if (formData.role === "teacher" && formData.subject) {
        payload.teacherSubject = formData.subject;
      }

      if (formData.role === "student" && formData.teacherId) {
        payload.teacherId = formData.teacherId; // ✅ link student → teacher
      }

      const res = await axios.post(
        "http://localhost:5000/api/auth/signup",
        payload
      );

      alert(res.data.msg || "✅ Signup successful!");
      // ✅ Navigate based on role after successful signup
      if (formData.role === "student") {
        const studentData = {
          studentId: res.data.user._id,
          username: res.data.user.username,
          email: res.data.user.email,
          subject: res.data.user.subject,
          teacherId: res.data.user.teacherId,
          role: 'student'
        };
        navigate("/student-dashboard", { state: studentData });
      } else if (formData.role === "teacher") {
        const teacherData = {
          teacherId: res.data.user._id,
          username: res.data.user.username,
          email: res.data.user.email,
          teacherSubject: res.data.user.teacherSubject || "",
          role: 'teacher'
        };
        navigate("/teacher-dashboard", { state: teacherData });
        console.log("✅ Teacher signup successful:", res.data.user);
      } else {
        const userData = {
          userId: res.data.user._id,
          username: res.data.user.username,
          email: res.data.user.email,
          role: formData.role
        };
        navigate("/dashboard", { state: userData });
      }
    } catch (err) {
      const msg = err.response?.data?.msg || "❌ Signup failed, try again.";
      setError(msg);

      if (msg.toLowerCase().includes("exists")) {
        setUserExists(true);
        setFieldsDisabled(true);
      }
    }
  };

  return (
    <div className="signup-container">
      <form className="signup-card" onSubmit={handleSubmit} noValidate>
        <div className="icon-circle">📝</div>

        <h2>Create Your Account</h2>
        <p>Fill in your details to get started</p>

        {error && !userExists && <div className="error-box">{error}</div>}

        {/* Email */}
        <div className="input-group">
          <label>
            Email Address <span className="required-asterisk">*</span>
          </label>
          <input
            type="email"
            placeholder="Enter your email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            disabled={fieldsDisabled}
          />
        </div>

        {/* Username */}
        <div className="input-group">
          <label>
            Full Name <span className="required-asterisk">*</span>
          </label>
          <input
            type="text"
            placeholder="Enter your full name"
            name="username"
            value={formData.username}
            onChange={handleChange}
            disabled={fieldsDisabled}
          />
        </div>

        {/* Role */}
        <div className="input-group">
          <label>
            Select Role <span className="required-asterisk">*</span>
          </label>
          <select
            name="role"
            value={formData.role}
            onChange={handleChange}
            disabled={fieldsDisabled}
          >
            <option value="not-selected" disabled>
              Select Role
            </option>
            <option value="student">Student</option>
            <option value="teacher">Teacher</option>
            <option value="parent">Parent</option>
          </select>
        </div>

        {/* Subject for Teacher */}
        {formData.role === "teacher" && (
          <div className="input-group">
            <label>
              Subject <span className="required-asterisk">*</span>
            </label>
            <select
              name="subject"
              value={formData.subject}
              onChange={handleChange}
              disabled={fieldsDisabled}
            >
              <option value="">-- Select Subject --</option>
              {subjectOptions.map((sub, i) => (
                <option key={i} value={sub}>
                  {sub}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Multiple Subject Selection for Student */}
        {formData.role === "student" && (
          <div className="input-group">
            <label>
              Subjects <span className="required-asterisk">*</span>
            </label>
            <div className="checkbox-group">
              {subjectOptions.map((subject, i) => (
                <div key={i} className="checkbox-item">
                  <input
                    type="checkbox"
                    checked={Array.isArray(formData.subject) && formData.subject.includes(subject)}
                    onChange={() => handleSubjectChange(subject)}
                    disabled={fieldsDisabled}
                  />
                  <span className="checkbox-label">{subject}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Multiple Teacher Selection (only for Student) */}
        {formData.role === "student" && teachers.length > 0 && (
          <div className="input-group">
            <label>
              Teachers <span className="required-asterisk">*</span>
            </label>
            <div className="checkbox-group">
              {teachers.map((teacher) => (
                <div key={teacher._id} className="checkbox-item">
                  <input
                    type="checkbox"
                    checked={Array.isArray(formData.teacherId) && formData.teacherId.includes(teacher._id)}
                    onChange={() => handleTeacherChange(teacher._id)}
                    disabled={fieldsDisabled}
                  />
                  <span className="checkbox-label">{teacher.username}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Password */}
        <div className="input-group">
          <label>
            Password <span className="required-asterisk">*</span>
          </label>
          <div className="password-field">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Enter your password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              disabled={fieldsDisabled}
            />
            <span
              className="toggle-eye"
              onClick={() => {
                setShowPassword(true);
                setTimeout(() => setShowPassword(false), 2000);
              }}
            >
              Show
            </span>
          </div>
        </div>

        {/* Password Rules */}
        <ul className="rules-list">
          {rules.map((rule, i) => (
            <li
              key={i}
              className={rule.test.test(formData.password) ? "valid" : ""}
            >
              {rule.text}
            </li>
          ))}
        </ul>

        {/* Confirm Password */}
        <div className="input-group">
          <label>
            Confirm Password <span className="required-asterisk">*</span>
          </label>
          <div className="password-field">
            <input
              type={showConfirmPassword ? "text" : "password"}
              placeholder="Confirm your password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              disabled={fieldsDisabled}
            />
            <span
              className="toggle-eye"
              onClick={() => {
                setShowConfirmPassword(true);
                setTimeout(() => setShowConfirmPassword(false), 2000);
              }}
            >
              Show
            </span>
          </div>
        </div>

        {/* Signup Button */}
        <button
          type="submit"
          className="btn signup-btn"
          disabled={fieldsDisabled}
        >
          Sign Up
        </button>

        {userExists && (
          <p className="user-exists-box">
            User already registered –{" "}
            <span className="login-redirect" onClick={() => navigate("/login")}>
              Log in
            </span>
          </p>
        )}
      </form>
    </div>
  );
}

export default SignUp;
