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

  const otp = Math.floor(100000 + Math.random() * 900000).toString()

  otpStore[email] = {
    otp,
    expires: Date.now() + 5 * 60 * 1000
  }

  try {
    const { data, error } = await resend.emails.send({
      from: "Zenora <otp@otp.zenoraapp.in>",
      to: email,
      subject: "Zenora OTP Verification",
      html: `<h2>Your OTP is: ${otp}</h2>`
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

  if (
    otpStore[email] &&
    otpStore[email].otp === otp &&
    Date.now() < otpStore[email].expires
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