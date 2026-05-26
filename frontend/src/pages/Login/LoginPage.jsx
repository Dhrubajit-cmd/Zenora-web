import LoginForm from "./LoginForm"
import { FaTwitter, FaLinkedinIn, FaFacebookF } from "react-icons/fa"
import "./login.css"

function LoginPage() {
  return (
    <div className="login-container">
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
            <a href="/privacy" className="footer-link">Privacy Policy</a>
            <a href="/terms" className="footer-link">Terms of Use</a>
          </div>

        </div>
      </footer>
    </div>
  )
}

export default LoginPage
