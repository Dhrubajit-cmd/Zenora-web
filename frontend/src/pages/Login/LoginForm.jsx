import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { FaEye, FaEyeSlash } from "react-icons/fa"
import "./login.css"
import logo from "../../assets/logo/logo.png"

function LoginForm() {
  const navigate = useNavigate()

  const [identifier, setIdentifier] = useState("")
  const [password, setPassword] = useState("")

  const [showPassword, setShowPassword] = useState(false)

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

    <div className="login-form">

      <h2 className="login-title">Log into Zenora</h2>

      {/* EMAIL FIELD */}
      <input
        type="text"
        placeholder="Email or Username"
        className="input-field"
        value={identifier}
        onChange={(e) => setIdentifier(e.target.value)}
      />

      {/* PASSWORD FIELD */}
      <div className="password-wrapper">
        <input
          type={showPassword ? "text" : "password"}
          placeholder="Password"
          className="input-field"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <span
          className="eye-icon"
          onClick={() => setShowPassword(!showPassword)}
        >
          {showPassword ? <FaEye /> : <FaEyeSlash />}
        </span>

      </div>

      <button className="login-button" onClick={handleLogin}>
        Log in
      </button>
      {/* FORGOT PASSWORD LINK */}
      <p className="forgot-password">
        Forgot password?
      </p>

      {/* DIVIDER */}
      <div className="divider">
        <span>OR</span>
      </div>

      {/*login with google*/}
      <button
        className="google-login"
        onClick={() => {
          window.location.href = "http://localhost:8080/auth/google/login"
        }}
      >
        Continue with Google
      </button>

      {/*Create Account*/}
      <button
        className="create-account"
        onClick={() => navigate("/register")}
      >
        Create New Account
      </button>

    </div>
  )

}

export default LoginForm