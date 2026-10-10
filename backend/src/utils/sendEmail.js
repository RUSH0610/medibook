import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

export const sendOTPEmail = async (email, otp, name) => {
  const mailOptions = {
    from: `"MediBook" <${process.env.GMAIL_USER}>`,
    to: email,
    subject: "Your MediBook OTP Verification Code",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto;">
        <h2 style="color: #2563eb;">MediBook Email Verification</h2>
        <p>Hi ${name},</p>
        <p>Your OTP for MediBook registration is:</p>
        <div style="background: #f3f4f6; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
          <h1 style="color: #2563eb; letter-spacing: 8px; font-size: 36px;">${otp}</h1>
        </div>
        <p>This OTP is valid for <strong>10 minutes</strong>.</p>
        <p>If you did not request this, please ignore this email.</p>
        <p style="color: #6b7280; font-size: 12px;">— MediBook Team</p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
};
