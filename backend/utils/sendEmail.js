import dotenv from "dotenv";
dotenv.config();

export const sendOTPEmail = async (email, otp) => {
  const apiKey = process.env.BREVO_API_KEY;

  if (!apiKey) {
    return { success: false, error: "Missing BREVO_API_KEY" };
  }

  console.log(`📧 Attempting to send OTP to: ${email}`);

  try {
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": apiKey,
      },
      body: JSON.stringify({
        sender: {
          name: "MyChatApp",
          email: process.env.EMAIL,
        },
        to: [{ email }],
        subject: "Your MyChatApp OTP Code",
        htmlContent: `
          <div style="
            max-width: 450px;
            margin: auto;
            background: #ffffff;
            padding: 25px;
            border-radius: 12px;
            font-family: Arial, sans-serif;
            border: 1px solid #eee;
          ">
            <div style="text-align: center;">
              <div style="
                width: 60px;
                height: 60px;
                margin: auto;
                background: #FE795F;
                border-radius: 15px;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-size: 28px;
                font-weight: bold;
              ">
                🔐
              </div>
    
              <h2 style="color: #3d3636; margin-top: 20px;">
                Your Verification Code
              </h2>
    
              <p style="color: #3d3636; font-size: 15px;">
                Use the OTP below to complete your signup on <strong>MyChatApp</strong>.
              </p>
    
              <div style="
                font-size: 32px;
                font-weight: bold;
                letter-spacing: 6px;
                color: #FE795F;
                margin: 25px 0;
              ">
                ${otp}
              </div>
    
              <p style="color: #3d3636; font-size: 14px;">
                This code is valid for <strong>5 minutes</strong>.  
                If you did not request this, you can safely ignore this email.
              </p>
    
              <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;" />
    
              <p style="color: #999; font-size: 12px;">
                © ${new Date().getFullYear()} MyChatApp — All Rights Reserved.
              </p>
            </div>
          </div>
        `,
      }),
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      console.error("Brevo send error:", {
        status: response.status,
        body: data,
      });
      return { success: false, error: data?.message || "Brevo send failed" };
    }

    console.log("OTP email sent successfully:", data);
    return { success: true, data };

  } catch (err) {
    console.error("Unexpected error sending OTP:", err);
    return { success: false, error: err.message };
  }
};
