import LoginForm from "./LoginForm"
import { FaTwitter, FaLinkedinIn, FaFacebookF } from "react-icons/fa"
import FinTrackLogo from "../../assets/logo/FinTrackLogo.png"
import "./login.css"

function LoginPage() {
  return (
    <div className="login-container">
      
      {/* Header */}
      <header className="login-header">
        <div className="header-left">
          <img src={FinTrackLogo} alt="Zenora Logo" className="header-logo-img" />
          <span className="logo-text">Zenora</span>
        </div>
        <div className="header-right">
          <button className="blog-btn" onClick={() => window.location.href='https://zenoraapp.in/blog'}>Blog</button>
          <a href="https://zenoraapp.in" className="landing-link" target="_blank" rel="noopener noreferrer">Product Landing Page</a>
        </div>
      </header>

      <div className="center-panel">
        <LoginForm />
      </div>

      {/* PAGE FOOTER */}
      <footer className="page-footer">
        <div className="footer-content">
          
          <div className="footer-left">
            <p className="footer-copyright">© 2026 Zenora Fintech Private Limited</p>
            <p className="footer-disclaimer">Built with privacy in mind. Your data is secure and encrypted.</p>
            <p className="footer-disclaimer">Zenora provides insights, not financial advice.</p>
            <div className="footer-socials">
              <a href="#"><FaTwitter /></a>
              <a href="#"><FaLinkedinIn /></a>
              <a href="#"><FaFacebookF /></a>
            </div>
          </div>

          <div className="footer-right">
            <a href="https://www.zenoraapp.in/privacy.html" className="footer-link" target="_blank" rel="noopener noreferrer">Privacy Policy</a>
            <a href="https://www.zenoraapp.in/terms.html" className="footer-link" target="_blank" rel="noopener noreferrer">Terms of Use</a>
          </div>

        </div>
      </footer>
    </div>
  )
}

export default LoginPage
