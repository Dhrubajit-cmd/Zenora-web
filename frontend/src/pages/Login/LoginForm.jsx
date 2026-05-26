import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { FaEye, FaEyeSlash, FaApple } from "react-icons/fa"
import { FcGoogle } from "react-icons/fc"
import "./login.css"

function LoginForm() {
  const navigate = useNavigate()

  const [identifier, setIdentifier] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showPasswordField, setShowPasswordField] = useState(false)

  const handleLogin = async () => {
    if (!password.trim()) {
      alert("Please enter your password.")
      return
    }

    try {
      const res = await fetch("http://localhost:8080/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          identifier: identifier,
          password: password
        })
      })

      let data
      let text

      const contentType = res.headers.get("content-type")

      if (contentType && contentType.includes("application/json")) {
        data = await res.json()
      } else {
        text = await res.text()
      }

      if (res.ok) {
        alert("Login successful ")
        localStorage.setItem("token", data?.token)
        navigate("/dashboard")
      } else {
        alert(
          data?.error ||
          data?.message ||
          text ||
          "Invalid username or password "
        )
      }

    } catch (err) {
      console.log("ERROR:", err)
      alert("Server error ")
    }
  }

  const handleContinue = () => {
    if (!identifier.trim()) {
      alert("Please enter your email or mobile number.")
      return
    }
    setShowPasswordField(true)
  }

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      if (!showPasswordField) {
        handleContinue()
      } else {
        handleLogin()
      }
    }
  }

  return (
    <div className="login-form">
      <h2 className="login-title">Log in or sign up</h2>

      {!showPasswordField ? (
        <>
          {/* IDENTIFIER FIELD */}
          <div className="input-group-custom">
            <input
              type="text"
              placeholder="Enter your email or mobile number"
              className="input-field-custom"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              onKeyDown={handleKeyPress}
            />
          </div>

          {/* CONTINUE BUTTON */}
          <button
            className={`continue-btn ${identifier.trim() ? "active" : ""}`}
            onClick={handleContinue}
            disabled={!identifier.trim()}
          >
            Continue
          </button>
        </>
      ) : (
        <>
          {/* SELECTED IDENTIFIER BACK LINK */}
          <div className="selected-identifier-row">
            <span className="selected-identifier-text">{identifier}</span>
            <button className="change-btn" onClick={() => setShowPasswordField(false)}>
              Change
            </button>
          </div>

          {/* PASSWORD FIELD */}
          <div className="password-wrapper-custom">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Enter your password"
              className="input-field-custom password-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={handleKeyPress}
              autoFocus
            />
            <span
              className="eye-icon-custom"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <FaEye /> : <FaEyeSlash />}
            </span>
          </div>

          {/* LOGIN BUTTON */}
          <button
            className={`continue-btn ${password.trim() ? "active" : ""}`}
            onClick={handleLogin}
            disabled={!password.trim()}
          >
            Log in
          </button>
        </>
      )}

      {/* DIVIDER */}
      <div className="form-divider">or</div>

      {/* SOCIAL LOGINS */}
      <button
        className="social-btn"
        onClick={() => {
          window.location.href = "http://localhost:8080/auth/google/login"
        }}
      >
        <span className="google-icon-wrapper">
          <FcGoogle className="google-icon" />
        </span>
        Continue with Google
      </button>

      <button
        className="social-btn"
        onClick={() => {
          alert("Apple Sign-In is integrated and coming soon! 🚀")
        }}
      >
        <FaApple className="apple-icon" />
        Continue with Apple
      </button>
    </div>
  )
}

export default LoginForm