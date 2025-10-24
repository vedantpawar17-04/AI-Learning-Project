import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import "./Login.css";

function Login() {
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    role: "not-selected",
    subject: [], // ✅ Now supports multiple subjects
    teacherId: [], // ✅ Now supports multiple teachers
  });
  console.log("Form Data:", formData);

  const [teachers, setTeachers] = useState([]);
  const [assignedData, setAssignedData] = useState({
    subjects: [],
    teachers: [],
    teacherSubjects: []
  });
  const [loadingUserData, setLoadingUserData] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [attempts, setAttempts] = useState(0);
  console.log("Login attempts:", attempts);
  const [locked, setLocked] = useState(false);
  const navigate = useNavigate();

  const subjectOptions = ["ADBMS", "STQA", "DevOps", "AI & KR", "ML & DL"];

  // ✅ Auto-fetch user data when username and role are filled (for teachers, only username needed)
  useEffect(() => {
    const fetchUserData = async () => {
      // For teachers: trigger on username + role
      // For students: trigger on email + username + role (more secure)
      const shouldFetchForTeacher = formData.role === "teacher" && formData.username.trim();
      const shouldFetchForStudent = formData.role === "student" && formData.email && formData.username;

      if (shouldFetchForTeacher || shouldFetchForStudent) {
        try {
          setLoadingUserData(true);
          const response = await axios.post("http://localhost:5000/api/auth/getUserData", {
            email: formData.email,
            username: formData.username,
            role: formData.role
          });

          if (response.data.success) {
            const userData = response.data.user;

            if (formData.role === "student") {
              // Auto-populate student's assigned subjects and teachers
              setAssignedData({
                subjects: userData.subject || [],
                teachers: userData.teacherDetails || [],
                teacherSubjects: []
              });

              // Update form data with assigned subjects and teachers
              setFormData(prev => ({
                ...prev,
                subject: userData.subject || [],
                teacherId: userData.teacherId || []
              }));
            } else if (formData.role === "teacher") {
              // Auto-populate teacher's subjects
              setAssignedData({
                subjects: [],
                teachers: [],
                teacherSubjects: userData.teacherSubjects || []
              });

              setFormData(prev => ({
                ...prev,
                subject: userData.teacherSubjects || []
              }));
            }
          }
        } catch (err) {
          console.log("User data not found or error:", err.response?.data?.msg);
          // Reset assigned data if user not found
          setAssignedData({
            subjects: [],
            teachers: [],
            teacherSubjects: []
          });
        }
      } else {
        // Reset assigned data when conditions are not met
        setAssignedData({
          subjects: [],
          teachers: [],
          teacherSubjects: []
        });
      }
    };

    fetchUserData();
  }, [formData.email, formData.username, formData.role]);

  // ✅ Fetch teachers when student selects subjects (fallback for manual selection)
  useEffect(() => {
    const fetchTeachers = async () => {
      if (formData.role === "student" && Array.isArray(formData.subject) && formData.subject.length > 0 && assignedData.teachers.length === 0) {
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
          setTeachers([]);
        }
      } else {
        setTeachers([]);
      }
    };
    fetchTeachers();
  }, [formData.role, formData.subject, assignedData.teachers]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Handle multiple subject selection
  const handleSubjectChange = (subject) => {
    setFormData(prev => {
      const currentSubjects = Array.isArray(prev.subject) ? prev.subject : [];
      const isSelected = currentSubjects.includes(subject);

      let newSubjects;
      if (isSelected) {
        // Remove subject
        newSubjects = currentSubjects.filter(s => s !== subject);
      } else {
        // Add subject
        newSubjects = [...currentSubjects, subject];
      }

      console.log("Subject changed:", subject, "New subjects:", newSubjects);

      return {
        ...prev,
        subject: newSubjects
      };
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

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (
      !formData.username ||
      !formData.email ||
      !formData.password ||
      formData.role === "not-selected"
    ) {
      setError("⚠️ Please fill in all the required data.");
      setTimeout(() => setError(""), 3000);
      return;
    }

    if (
      formData.role === "student" &&
      (!Array.isArray(formData.subject) || formData.subject.length === 0 ||
        (!Array.isArray(formData.teacherId) || formData.teacherId.length === 0) && assignedData.teachers.length === 0)
    ) {
      setError("⚠️ Please select at least one subject and teacher.");
      setTimeout(() => setError(""), 3000);
      return;
    }

    if (
      formData.role === "teacher" &&
      (!Array.isArray(formData.subject) || formData.subject.length === 0) &&
      assignedData.teacherSubjects.length === 0
    ) {
      setError("⚠️ Please select at least one teaching subject.");
      setTimeout(() => setError(""), 3000);
      return;
    }

    if (locked) {
      setError("🚫 Too many attempts. Try again later.");
      return;
    }

    try {
      console.log("Login attempt with data:", formData);

      const loginData = {
        username: formData.username,
        email: formData.email,
        password: formData.password,
        role: formData.role,
        ...(formData.role === "student" && {
          subject: formData.subject,
          teacherId: assignedData.teachers.length > 0
            ? assignedData.teachers.map(t => t._id)
            : formData.teacherId
        }),
        ...(formData.role === "teacher" && {
          teacherSubject: assignedData.teacherSubjects.length > 0
            ? assignedData.teacherSubjects
            : formData.subject
        })
      };

      const res = await axios.post(
        "http://localhost:5000/api/auth/login",
        loginData
      );

      console.log("Login response:", res.data);

      // ✅ Success flow
      alert("✅ Login Successfully!");
      setSuccess(res.data.msg || "✅ Login successful!");
      setError("");
      setAttempts(0);
      // ✅ Navigate based on role
      if (formData.role === "student") {
        const studentData = {
          studentId: res.data.user._id,
          username: res.data.user.username,
          email: res.data.user.email,
          subject: res.data.user.subject || "Not Assigned",
          teacherId: res.data.user.teacherId || null,
          role: 'student'
        };


        navigate("/student-dashboard", { state: studentData });
        console.log("✅ Backend user response:", res.data.user);
      } else if (formData.role === "teacher") {
        const teacherData = {
          teacherId: res.data.user._id,
          username: res.data.user.username,
          email: res.data.user.email,
          subjects: res.data.user.teacherSubjects || [],
          role: 'teacher'
        };

        navigate("/teacher-dashboard", { state: teacherData });
        console.log("✅ Teacher login successful:", res.data.user);
      } else {
        // For parent or other roles, redirect to a generic dashboard
        const userData = {
          userId: res.data.user._id,
          username: res.data.user.username,
          email: res.data.user.email,
          role: formData.role
        };

        navigate("/dashboard", { state: userData });
      }
    } catch (err) {
      const msg = err.response?.data?.msg || "❌ Invalid credentials.";
      setError(msg);
      setTimeout(() => setError(""), 3000);

      setAttempts((prev) => {
        const newAttempts = prev + 1;
        if (newAttempts >= 3) {
          setLocked(true);
          setError("🚫 Too many attempts. All fields are locked.");
        }
        return newAttempts;
      });
    }
  };

  return (
    <div className="login-container">
      <form className="login-card" onSubmit={handleSubmit} noValidate>
        <div className="icon-circle">🔑</div>

        <h2>Welcome !!!</h2>
        <p>Please login to continue...</p>

        {error && <div className="error-box">{error}</div>}
        {success && <div className="success-box">{success}</div>}

        {/* Username */}
        <div className="input-group">
          <label>
            Full Name <span className="required-asterisk">*</span>
          </label>
          <input
            type="text"
            placeholder="Enter your Full Name"
            name="username"
            value={formData.username}
            onChange={handleChange}
            disabled={locked}
          />
        </div>

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
            disabled={locked}
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
            disabled={locked}
          >
            <option value="not-selected" disabled>
              Select Role
            </option>
            <option value="student">Student</option>
            <option value="teacher">Teacher</option>
            <option value="parent">Parent</option>
          </select>
        </div>

        {/* Auto-populated Subject & Teacher Display for Students */}
        {formData.role === "student" && (
          <>
            {assignedData.subjects.length > 0 ? (
              <>
                <div className="input-group">
                  <label>
                    Assigned Subjects <span className="required-asterisk">*</span>
                  </label>
                  <textarea
                    value={assignedData.subjects.join(", ")}
                    readOnly
                    disabled
                    className="readonly-textarea"
                    rows="2"
                  />
                </div>
              </>
            ) : (
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
                        disabled={locked}
                      />
                      <span className="checkbox-label">{subject}</span>
                    </div>
                  ))}
                </div>
                {Array.isArray(formData.subject) && formData.subject.length > 0 && (
                  <small className="helper-text">
                    Selected: {formData.subject.join(", ")}
                  </small>
                )}
              </div>
            )}

            {assignedData.teachers.length > 0 ? (
              <div className="input-group">
                <label>
                  Assigned Teachers <span className="required-asterisk">*</span>
                </label>
                <textarea
                  value={assignedData.teachers.map(teacher =>
                    `${teacher.username} (${Array.isArray(teacher.teacherSubjects) ? teacher.teacherSubjects.join(", ") : teacher.teacherSubjects || "No subjects"})`
                  ).join("\n")}
                  readOnly
                  disabled
                  className="readonly-textarea"
                  rows="3"
                />
              </div>
            ) : teachers.length > 0 ? (
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
                        disabled={locked}
                      />
                      <span className="checkbox-label">
                        {teacher.username}
                        {teacher.teacherSubject && ` (${Array.isArray(teacher.teacherSubject) ? teacher.teacherSubject.join(", ") : teacher.teacherSubject})`}
                      </span>
                    </div>
                  ))}
                </div>
                {Array.isArray(formData.teacherId) && formData.teacherId.length > 0 && (
                  <small className="helper-text">
                    {formData.teacherId.length} teacher(s) selected
                  </small>
                )}
              </div>
            ) : Array.isArray(formData.subject) && formData.subject.length > 0 && assignedData.subjects.length === 0 ? (
              <div className="input-group">
                <small className="helper-text">
                  Loading teachers for selected subjects...
                </small>
              </div>
            ) : null}
          </>
        )}

        {/* Auto-populated Subject Display for Teachers */}
        {formData.role === "teacher" && (
          <>
            {assignedData.teacherSubjects.length > 0 ? (
              <>
                <div className="input-group">
                  <label>
                    Teaching Subjects <span className="required-asterisk">*</span>
                  </label>
                  <textarea
                    value={assignedData.teacherSubjects.join(", ")}
                    readOnly
                    disabled
                    className="readonly-textarea"
                    rows="2"
                  />
                  <small className="helper-text">
                    These are the subjects you are assigned to teach
                  </small>
                </div>
              </>
            ) : (
              <div className="input-group">
                <label>
                  Teaching Subjects <span className="required-asterisk">*</span>
                </label>
                <div className="checkbox-group">
                  {subjectOptions.map((subject, i) => (
                    <div key={i} className="checkbox-item">
                      <input
                        type="checkbox"
                        checked={Array.isArray(formData.subject) && formData.subject.includes(subject)}
                        onChange={() => handleSubjectChange(subject)}
                        disabled={locked}
                      />
                      <span className="checkbox-label">{subject}</span>
                    </div>
                  ))}
                </div>
                {Array.isArray(formData.subject) && formData.subject.length > 0 && (
                  <small className="helper-text">
                    Selected: {formData.subject.join(", ")}
                  </small>
                )}
              </div>
            )}
          </>
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
              disabled={locked}
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

        {/* Login Button */}
        <button type="submit" className="btn login-btn" disabled={locked}>
          Login
        </button>

        {/* Forgot Password */}
        {locked && (
          <div className="forgot-password">
            <Link to="/forgot-password" className="forgot-link">
              Forgot Password
            </Link>
          </div>
        )}
      </form>
    </div>
  );
}

export default Login;