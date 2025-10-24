import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./ForgotPassword.css";

function ForgotPassword() {
  const [step, setStep] = useState(1); // step 1 = verify email, step 2 = reset password
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const navigate = useNavigate();

  // Step 1 → verify email
  const handleVerifyEmail = async (e) => {
    e.preventDefault();

    if (!email) {
      setError("⚠️ Please enter your email.");
      setTimeout(() => setError(""), 3000);
      return;
    }

    try {
      const res = await axios.post(
        "http://localhost:5000/api/auth/verify-email",
        { email }
      );

      setMessage(
        res.data.msg || "✅ Email verified. Please reset your password."
      );
      setTimeout(() => setMessage(""), 4000);
      setError("");
      setStep(2); // move to reset password form
    } catch (err) {
      setError(err.response?.data?.msg || "❌ Email not found.");
      setTimeout(() => setError(""), 3000);
      setMessage("");
    }
  };

  // Step 2 → reset password
  const handleResetPassword = async (e) => {
    e.preventDefault();

    if (!newPassword || !confirmPassword) {
      setError("⚠️ Please fill in all fields.");
      setTimeout(() => setError(""), 3000);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("⚠️ Passwords do not match.");
      setTimeout(() => setError(""), 3000);
      return;
    }

    try {
      const res = await axios.post(
        "http://localhost:5000/api/auth/forgot-password",
        { email, newPassword }
      );

      setMessage(res.data.msg || "✅ Password reset successful.");
      setError("");

      setTimeout(() => {
        navigate("/login"); // redirect after success
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.msg || "❌ Something went wrong.");
      setTimeout(() => setError(""), 3000);
      setMessage("");
    }
  };

  return (
    <div className="forgot-container">
      <form
        className="forgot-card"
        onSubmit={step === 1 ? handleVerifyEmail : handleResetPassword}
      >
        <div className="icon-circle">{step === 1 ? "📧" : "🔒"}</div>
        <h2>{step === 1 ? "Forgot Password" : "Reset Password"}</h2>
        <p>
          {step === 1
            ? "Enter your registered email to verify."
            : "Enter your new password."}
        </p>

        {/* Error box */}
        {error && <div className="error-box">{error}</div>}

        {/* Success box */}
        {message && <div className="success-box">{message}</div>}

        {/* Step 1 → email input */}
        {step === 1 && (
          <div className="input-group">
            <label>Email Address</label>
            <input
              type="email"
              placeholder="Enter your registered email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
        )}

        {/* Step 2 → reset password */}
        {step === 2 && (
          <>
            <div className="input-group">
              <label>Email Address</label>
              <input type="email" value={email} disabled />
            </div>

            <div className="input-group">
              <label>New Password</label>
              <div className="password-field">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
                <span
                  className="toggle-eye"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? "Hide" : "Show"}
                </span>
              </div>

              {/* Password rules */}
              <ul className="rules-list">
                <li className={newPassword.length >= 8 ? "valid" : ""}>
                  At least 8 characters
                </li>
                <li className={/[A-Z]/.test(newPassword) ? "valid" : ""}>
                  At least one uppercase letter
                </li>
                <li className={/[a-z]/.test(newPassword) ? "valid" : ""}>
                  At least one lowercase letter
                </li>
                <li className={/[0-9]/.test(newPassword) ? "valid" : ""}>
                  At least one number
                </li>
                <li className={/[^A-Za-z0-9]/.test(newPassword) ? "valid" : ""}>
                  At least one special character
                </li>
              </ul>
            </div>

            <div className="input-group">
              <label>Confirm Password</label>
              <div className="password-field">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
                <span
                  className="toggle-eye"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? "Hide" : "Show"}
                </span>
              </div>
            </div>
          </>
        )}

        <button type="submit" className="btn">
          {step === 1 ? "Verify Email" : "Reset Password"}
        </button>
      </form>
    </div>
  );
}

export default ForgotPassword;
