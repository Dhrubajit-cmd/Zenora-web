import LoginForm from "./LoginForm"
import "./login.css"

function LoginPage() {
  return (
    <div className="login-page">
      
      {/* Header */}
      <header className="login-header">
        <div className="logo-box">Z</div>
        <span className="logo-text">Zenora</span>
      </header>

      {/* Main Content */}
      <main className="login-main">
        <LoginForm />
      </main>

      {/* Help Icon */}
      <div className="help-icon">?</div>
      
    </div>
  )
}

export default LoginPage
