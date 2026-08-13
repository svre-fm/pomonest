import nodemailer from "nodemailer";
import path from "node:path";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

export async function sendVerificationEmail(email: string, token: string) {
  const verifyUrl = `${process.env.BACKEND_URL}/api/auth/verify?token=${token}`;

  console.log("Verify URL:", verifyUrl);
  console.log("Sending to:", email);

  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Verify your Pomonest account",
    html: `
      
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
</head>

<body style="
    margin:0;
    padding:40px 0;
    background:none;
">

<table
align="center"
cellpadding="0"
cellspacing="0"
width="100%"
>
<tr>
<td align="center">

<table
width="460"
cellpadding="0"
cellspacing="0"
style="
border-radius:40px;
padding:40px;
font-family:Arial,sans-serif;
text-align:center;
"
>

<tr>
<td>


<img
  src="cid:pomonest-logo"
  style="width:70%;"
>

<p
style="
font-size:18px;
color:#aa7628;
line-height:28px;
margin-bottom:35px;
"
>
Click the button below to verify your email.
</p>

<table
align="center"
cellpadding="0"
cellspacing="0"
>
<tr>

<td
bgcolor="#ded65a"
style="
border-radius:40px;
border:2px solid #908339;
"
>

<a
href="${verifyUrl}"
style="
display:inline-block;
padding:15px 35px;
font-size:20px;
font-weight:bold;
color:#7a593f;
text-decoration:none;
"
>
Verify Email
</a>

</td>

</tr>
</table>

<p
style="
margin-top:40px;
font-size:13px;
color:#888;
"
>
This verification link will expire in 5 minutes.
</p>

</td>
</tr>

</table>

</td>
</tr>
</table>

</body>
</html>
    `,

    attachments: [
      {
        filename: "logo.png",
        path: "./src/assets/logo.png",
        cid: "pomonest-logo",
      },
    ],
  });
}

/**
 * ส่งอีเมล reset password แบบ link พร้อมปุ่ม
 * @param email อีเมลผู้รับ
 * @param resetToken UUID token สำหรับ reset link
 */
export async function sendResetPasswordEmail(email: string, resetToken: string) {
  const resetUrl = `${process.env.FRONTEND_URL}/reset?token=${resetToken}`;

  console.log(`\n========================================`);
  console.log(`[FORGOT PASSWORD] Email: ${email}`);
  console.log(`[FORGOT PASSWORD] Reset URL: ${resetUrl}`);
  console.log(`[FORGOT PASSWORD] Token expires in 15 minutes`);
  console.log(`========================================\n`);

  if (process.env.EMAIL_USER && process.env.EMAIL_PASSWORD) {
    try {
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: email,
        subject: "Reset your Pomonest password",
        html: `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
</head>

<body style="
    margin:0;
    padding:40px 0;
    background:none;
">

<table
align="center"
cellpadding="0"
cellspacing="0"
>
<tr>
<td align="center">

<table
width="460"
cellpadding="0"
cellspacing="0"
style="
border-radius:40px;
padding:40px;
font-family:Arial,sans-serif;
text-align:center;
"
>

<tr>
<td>

<img
  src="cid:pomonest-logo"
  style="width:70%;"
  
>


<p
style="
font-size:30px;
font-weight: 600;
color:#5c3e12;
margin-bottom:10px;
"
>
Forgot your password?
</p>

<p
style="
font-size:18px;
color:#aa7628;
line-height:28px;
margin-bottom:15px;
"
>It happens to the best of us.<br>Click the button below to reset your password.
</p>

<table
align="center"
cellpadding="0"
cellspacing="0"
>
<tr>

<td
bgcolor="#ded65a"
style="
border-radius:40px;
border:2px solid #908339;
"
>

<a
href="${resetUrl}"
style="
display:inline-block;
padding:15px 35px;
font-size:20px;
font-weight:bold;
color:#7a593f;
text-decoration:none;
"
>
Reset your password
</a>

</td>

</tr>
</table>

<p
style="
margin-top:40px;
font-size:13px;
color:#888;
"
>
This link will expire in 15 minutes.<br>
If you did not request a password reset, you can ignore this email.
</p>

</td>
</tr>

</table>

</td>
</tr>
</table>

</body>
</html>
        `,
        attachments: [
          {
            filename: "logo.png",
            path: "./src/assets/logo.png",
            cid: "pomonest-logo",
          },
        ],
      });
      console.log(`[FORGOT PASSWORD] Email sent to ${email}`);
    } catch (err) {
      console.error("[FORGOT PASSWORD] Failed to send email, reset URL is logged above:", err);
    }
  }
}