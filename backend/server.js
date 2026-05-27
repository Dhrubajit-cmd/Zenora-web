require("dotenv").config()

const express = require("express")
const { Resend } = require("resend")
const cors = require("cors")

const app = express()
app.use(cors())
app.use(express.json())

let otpStore = {}

// Initialize Resend Client
const resend = new Resend(process.env.RESEND_API_KEY)

// Send OTP
app.post("/send-otp", async (req, res) => {
  const { email } = req.body

  if (!email || !email.trim()) {
    return res.json({ success: false, message: "Email is required" })
  }

  const trimmedEmail = email.trim()
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(trimmedEmail)) {
    return res.json({ success: false, message: "Invalid email format" })
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString()

  otpStore[trimmedEmail] = {
    otp,
    expires: Date.now() + 5 * 60 * 1000
  }

  try {
    const { data, error } = await resend.emails.send({
      from: "Zenora <otp@otp.zenoraapp.in>",
      to: trimmedEmail,
      subject: "OTP Verification for Zenora",
      html: `<h2>Your OTP for verification is: ${otp}</h2>
             <p> This OTP will expire in 5 minutes</p>
             <p> Do not share this OTP with anyone</p>
             <p> If you did not request this OTP, please ignore this email</p>
             <p> Thank you for using Zenora</p>
             <p>Zenora Team</p>
            `
    })

    if (error) {
      console.log("Resend API Error:", error)
      return res.json({ success: false, message: error.message })
    }

    res.json({ success: true })
  } catch (err) {
    console.log(err)
    res.json({ success: false })
  }
})

// Verify OTP
app.post("/verify-otp", (req, res) => {
  const { email, otp } = req.body

  if (!email || !otp) {
    return res.json({ verified: false, message: "Email and OTP are required" })
  }

  const trimmedEmail = email.trim()
  const trimmedOtp = otp.trim()

  if (
    otpStore[trimmedEmail] &&
    otpStore[trimmedEmail].otp === trimmedOtp &&
    Date.now() < otpStore[trimmedEmail].expires
  ) {
    res.json({ verified: true })
  } else {
    res.json({ verified: false })
  }
})

const PORT = process.env.PORT || 5050;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})