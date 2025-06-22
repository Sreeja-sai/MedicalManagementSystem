import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Cookies from 'js-cookie';
import "./Login.css";
import { useEffect } from "react";

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

useEffect(() => {
  const token = Cookies.get("jwt_token");
  if (token) {
    navigate("/");
  }
}, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); // Clear any previous error

    try {
      const response = await fetch("http://localhost:3000/login/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      console.log(response);
      if (response.ok) {
        const data = await response.json();
        const jwtToken=data.jwt_token;
        console.log(jwtToken);
        Cookies.set("jwt_token",jwtToken,{
          expires:7
        })
        setEmail("");
        setPassword("");
        navigate("/");
      } else {
        const errorText = await response.text();
        console.log(errorText);
        setError(errorText); // Show error message below login button
      }
    } catch (err) {
      console.error("Login failed", err);
      setError("Login failed. Please try again.");
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <h2 className="login-title">Welcome Back</h2>
        <p className="login-subtitle">Please login to continue</p>

        <form onSubmit={handleLogin} className="login-form">
          <input
            type="email"
            placeholder="Email"
            className="login-input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <div className="password-wrapper">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              className="login-input password-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <span
              className="toggle-password"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? "🙈" : "👁️"}
            </span>
          </div>


          <button type="submit" className="login-button">
            Login
          </button>

          {/* Error message styled like image */}
          {error && <p className="error-message">*{error}</p>}
        </form>

        <p className="signup-text">
          Didn't register?{" "}
          <span className="signup-link" onClick={() => navigate("/signup")}>
            Signup
          </span>
        </p>
      </div>
    </div>
  );
};

export default Login;
