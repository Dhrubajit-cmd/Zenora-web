import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { FaApple } from "react-icons/fa"
import { FcGoogle } from "react-icons/fc"
import "./login.css"

function LoginForm() {
  const navigate = useNavigate()

  const [identifier, setIdentifier] = useState("")
  const [otp, setOtp] = useState("")
  const [showOtpField, setShowOtpField] = useState(false)
  const [loading, setLoading] = useState(false)

  // Send OTP via Node server on port 5050
  const handleSendOtp = async () => {
    if (!identifier.trim()) {
      alert("Please enter your email address.")
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`${import.meta.env.VITE_OTP_URL}/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: identifier.trim() })
      })

      const data = await res.json()

      if (data.success) {
        setShowOtpField(true)
        alert("Verification OTP sent to your email! ✨")
      } else {
        alert("Failed to send OTP. Please ensure your email is correct and the server is running.")
      }
    } catch (err) {
      console.error("Error sending OTP:", err)
      alert("Connection error trying to reach OTP Server.")
    } finally {
      setLoading(false)
    }
  }

  // Verify OTP and Login via Go backend on port 8080
  const handleVerifyAndLogin = async () => {
    if (!otp.trim() || otp.length !== 6) {
      alert("Please enter the 6-digit OTP.")
      return
    }

    setLoading(true)
    try {
      // 1. Verify OTP with Node Server (Port 5050)
      const verifyRes = await fetch(`${import.meta.env.VITE_OTP_URL}/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: identifier.trim(), otp: otp.trim() })
      })

      const verifyData = await verifyRes.json()

      if (verifyData.verified) {
        // 2. Obtain JWT Token from Go Backend (Port 8080)
        const loginRes = await fetch(`${import.meta.env.VITE_API_URL}/auth/otp-login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: identifier.trim() })
        })

        const loginData = await loginRes.json()

        if (loginRes.ok) {
          alert("Login successful! Welcome to Zenora. 🚀")
          localStorage.setItem("token", loginData?.token)
          navigate("/dashboard")
        } else {
          alert(loginData?.error || "Failed to log in. Please try again.")
        }
      } else {
        alert("Invalid or expired OTP. Please try again.")
      }
    } catch (err) {
      console.error("Error logging in:", err)
      alert("System network error during OTP verification or login.")
    } finally {
      setLoading(false)
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      if (!showOtpField) {
        handleSendOtp()
      } else {
        handleVerifyAndLogin()
      }
    }
  }

  return (
    <div className="login-form">
      <h2 className="login-title">Log in or sign up</h2>

      {!showOtpField ? (
        <>
          {/* IDENTIFIER/EMAIL FIELD */}
          <div className="input-group-custom">
            <input
              type="email"
              placeholder="Enter your email or mobile number"
              className="input-field-custom"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              onKeyDown={handleKeyPress}
              disabled={loading}
            />
          </div>

          {/* CONTINUE BUTTON */}
          <button
            className={`continue-btn ${identifier.trim() ? "active" : ""}`}
            onClick={handleSendOtp}
            disabled={!identifier.trim() || loading}
          >
            {loading ? "Sending..." : "Continue"}
          </button>
        </>
      ) : (
        <>
          {/* SELECTED IDENTIFIER BACK LINK */}
          <div className="selected-identifier-row">
            <span className="selected-identifier-text">{identifier}</span>
            <button className="change-btn" onClick={() => setShowOtpField(false)} disabled={loading}>
              Change
            </button>
          </div>

          {/* OTP FIELD */}
          <div className="input-group-custom">
            <input
              type="text"
              placeholder="Enter 6-digit OTP"
              maxLength="6"
              className="input-field-custom"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
              onKeyDown={handleKeyPress}
              disabled={loading}
              autoFocus
            />
          </div>

          {/* VERIFY & LOGIN BUTTON */}
          <button
            className={`continue-btn ${otp.length === 6 ? "active" : ""}`}
            onClick={handleVerifyAndLogin}
            disabled={otp.length !== 6 || loading}
          >
            {loading ? "Verifying..." : "Verify & Log in"}
          </button>
        </>
      )}

      {/* DIVIDER */}
      <div className="form-divider">or</div>

      {/* SOCIAL LOGINS */}
      <button
        className="social-btn"
        onClick={() => {
          window.location.href = `${import.meta.env.VITE_API_URL}/auth/google/login`
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