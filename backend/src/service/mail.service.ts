import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

export async function sendVerificationEmail(
  email: string,
  token: string,
) {
  const verifyUrl =
    `${process.env.FRONTEND_URL}/verify?token=${token}`;

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
    background:#ddd2a7;
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
background:#ffffff;
border-radius:40px;
padding:40px;
font-family:Arial,sans-serif;
text-align:center;
"
>

<tr>
<td>

<h1
style="
color:#7a593f;
font-size:34px;
margin:15px 0 25px;
"
>
Welcome to Pomonest
</h1>

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
This verification link will expire in 1 hour.
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
  });
}