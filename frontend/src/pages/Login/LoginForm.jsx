import { useState } from "react"
import { useNavigate } from "react-router-dom"
import "./login.css"

function LoginForm() {
  const navigate = useNavigate()

  const [identifier, setIdentifier] = useState("")
  const [password, setPassword] = useState("")

  const handleLogin = async () => {
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

  return (
    <div className="login-card">
      <h2 className="login-title">Welcome back</h2>
      <p className="login-subtitle">Sign in to your account to continue</p>

      <div className="form-group">
        <label>Email</label>
        <input
          type="text"
          placeholder="name@example.com"
          className="input-field"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
        />
      </div>

      <div className="form-group">
        <div className="password-header">
          <label>Password</label>
          <span className="forgot-password">Forgot password?</span>
        </div>
        <input
          type="password"
          placeholder="Enter your password"
          className="input-field"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>

      <button className="sign-in-button" onClick={handleLogin}>
        Sign in
      </button>

      <p className="signup-text">
        Don't have an account? <span onClick={() => navigate("/register")}>Sign up</span>
      </p>
    </div>
  )
}

export default LoginForm