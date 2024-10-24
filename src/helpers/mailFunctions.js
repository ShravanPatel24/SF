const config = require('../config/config');
var Mailgen = require('mailgen');
var nodemailer = require('nodemailer');
var sgMail = require('@sendgrid/mail');
sgMail.setApiKey(config.SENDGRID_API_KEY);

// console.log('config.SENDGRID_API_KEY==', config.SENDGRID_API_KEY)
var mailGenerator = new Mailgen({
    theme: 'default',
    product: {
        // Appears in header & footer of e-mails
        logo: 'https://res.cloudinary.com/df7gwlrj4/image/upload/v1684304257/Image_3_hayqvl.png',
        name: 'Ocean',
        link: 'https://omnisttechhub.com/'
    }
});

const transport = nodemailer.createTransport(config.email.smtp);

const sendEmail = async (to, subject, htmlBody) => {
    const mailOptions = {
        from: config.email.from, // Replace with your sender information
        to: to,
        subject,
        html: htmlBody,
    };
    try {
        const info = await transport.sendMail(mailOptions);
        // console.log(`Email sent: ${info.messageId}`, info);
    } catch (error) {
        console.error(`Error sending email: ${error}`);
    }
};

async function send_mail(to, template, subject, attachments) {
    var emailBody = mailGenerator.generate(template);
    var emailText = mailGenerator.generatePlaintext(template);
    let mailOptions = {
        from: 'Ocean <noreply@apikart.co>',
        to: to,
        subject: subject, // Subject line
        text: emailText, // plain text body
        html: emailBody, // html body
    };
    sgMail.send(mailOptions, function (error, info) {
        if (error) {
            console.log('error ====>>>', JSON.stringify(error?.response?.body));
        } else {
            console.log('Email send to:- ', to);
        }
    })
}

function sendOtpOnMail(userEmail, name, otp) {
    var emailTemplate = {
        body: {
            name: name,
            // title: 'Welcome To ss',
            signature: `Kind Regards`,
            intro: 'Thank you for choosing us. We really appreciate your support.',
            action: {
                instructions: 'Your OTP (One Time Password) is below.',
                button: {
                    text: '<strong>' + otp + '</strong>'
                }
            },
            outro: `To get started with ss, Please enter your OTP to authenticate your login details. Ensure you do not share your OTP with anyone. This OTP expires in 15 minutes` + '<br/>' + `Need help, or have questions Just reply to this email, we\'d love to help.`
        }
    };
    if (userEmail) {
        send_mail(userEmail, emailTemplate, 'Registration - One Time Password');
    }
}

// sendOtpOnMail('akash@yopmail.com', 'Akash', 12345);
function sendResetPasswordEmail(userEmail, token, type) {
    var url = '';
    if (type == 'admin') {
        url = `${config.ADMIN_URL}authentication/reset-password?token=${token}`
    } else {
        url = `${config.SITE_URL}authentication/reset-password?token=${token}`
    }
    console.log('url===', url)
    var emailTemplate = {
        body: {
            // name: name,
            title: 'You have requested to reset your password',
            signature: `Kind Regards`,
            intro: 'We cannot simply send you your old password. A unique link to reset your password has been generated for you. To reset your password, click the following link and follow the instructions.',
            action: {
                // instructions: 'Your OTP (One Time Password) is below.',
                button: {
                    color: '#22BC66', // Optional action button color
                    text: 'RESET YOUR PASSWORD',
                    link: url
                }
            },
            outro: `If you did not request a password reset, please ignore this email or reply to let us know. This password reset is only valid for 30 minutes.`
        }
    };
    send_mail(userEmail, emailTemplate, 'Reset Your Password: Secure Your Account with a New Password');
}
// sendResetPasswordEmail('susheelyadav@yopmail.com', 'Akash')

function sendVerificationEmail(user, token) {
    let name = user.name ? user.name : user.companyName;

    const data = {
        companyName: 'OmnistTechHub',
        userName: name,
        verificationLink: `${config.SITE_URL}/authentication/email-verify?token=${token}`,
        companyLogoUrl: 'https://example.com/logo.png',
    };
    var emailTemplate = {
        body: {
            name: name,
            title: 'Thank you for signing up please verify you email',
            signature: `Kind Regards`,
            intro: 'To complete the sign-up process A unique link has been generated for you. To verify you account, click the following link and follow the instructions.',
            action: {
                // instructions: 'Your OTP (One Time Password) is below.',
                button: {
                    color: '#22BC66', // Optional action button color
                    text: 'Verify Email',
                    link: data.verificationLink
                }
            },
            outro: `If you did not create an account, please ignore this email or reply to let us know. This is only valid for 120 minutes.`
        }
    };
    send_mail(user.email, emailTemplate, 'Verify Your Account: Pleae Verify Your Account');
}

const sendTicketReplyEmail = async (userEmail, name, ticketDetails) => {
    // Create the HTML body with ticket details
    const subject = `Ticket Reply: ${ticketDetails.subject}`;
    const htmlBody = `
      <p>Hi ${name},</p>
      <p>We are writing to inform you about a reply to your ticket (ID: ${ticketDetails._id}) regarding ${ticketDetails.subject}.</p>
      <p><b>Latest Reply:</b></p>
      <p>${ticketDetails.userAdminReplies[ticketDetails.userAdminReplies.length - 1].content}</p>
      <p>You can view the full conversation and manage your ticket through our platform: [link to ticket page]</p>
      <p>Thank you for using our support system.</p>
      <p>Sincerely,</p>
      <p>Your Store Name</p>
    `;

    // Send the email
    await sendEmail(userEmail, subject, htmlBody);
};

const sendTicketConfirmationEmail = async (userEmail, name, ticketDetails) => {
    // Create the HTML body with ticket details
    const subject = `Ticket Confirmation: Your Ticket (ID: ${ticketDetails._id})`;
    const htmlBody = `
      <p>Hi ${name},</p>
      <p>This email confirms that your ticket (ID: ${ticketDetails._id}) has been successfully submitted.</p>
      <p><b>Subject:</b> ${ticketDetails.subject}</p>
      <p><b>Message:</b> ${ticketDetails.message}</p>
      <p>Our support team will review your ticket and respond as soon as possible. You can view the status of your ticket and any replies through our platform: [link to ticket page]</p>
      <p>Thank you for contacting us.</p>
      <p>Sincerely,</p>
      <p>Your Store Name</p>
    `;

    // Send the email
    await sendEmail(userEmail, subject, htmlBody);
};

const sendWelcomeEmail = async (userEmail, userName) => {
    const emailTemplate = {
        body: {
            title: 'Thank you for joining us!',
            intro: `Hi ${userName},<br/><br/>Thank you for joining us at Ocean! We’re excited to have you as part of our community.`,
            outro: `Your account has been successfully created, and you’re all set to start enjoying our services. If you have any questions or need assistance, don’t hesitate to reach out to our support team.<br/><br/>We look forward to helping you.<br/>`
        }
    };
    await send_mail(userEmail, emailTemplate, 'Welcome to Ocean');
};

function sendLoginNotificationEmail(userEmail, device, time, ipAddress) {
    const emailTemplate = {
        body: {
            title: 'We noticed a login to your account',
            intro: `Hello,<br/><br/>We noticed a login to your account associated with Ocean - ${userEmail}. Below are the details:`,
            table: {
                data: [
                    {
                        item: 'Device',
                        description: device,
                    },
                    {
                        item: 'Time',
                        description: time,
                    },
                    {
                        item: 'IP address',
                        description: ipAddress,
                    },
                ],
                columns: {
                    customAlignment: { item: 'left', description: 'right' },
                },
            },
            outro: `If this was you, You can ignore this message. There's no need to take any action. <br/><br/> If this wasn't you, protect your account by clicking <a href="${config.SITE_URL}/authentication/logout-all">here</a>. You'll be logged out of all your active sessions.`
        }
    };

    send_mail(userEmail, emailTemplate, 'Login Notification: We noticed a login to your account');
}

function sendActivationEmail(userEmail, userName) {
    const emailTemplate = {
        body: {
            title: 'Your Ocean App account has been reactivated!',
            intro: `Hi ${userName},<br/><br/>We're excited to inform you that your Ocean account has been successfully reactivated! You can now log in and enjoy all the features and benefits of the Ocean App once again.`,
            outro: `If you have any questions or need assistance, our support team is here to help.<br/><br/>Thank you for choosing Ocean App. We're glad to have you back!`
        }
    };

    send_mail(userEmail, emailTemplate, 'Your Ocean Account Has Been Reactivated');
}

// Function to send email with new password by admin
const sendPasswordResetEmailByAdmin = async (email, name, newPassword) => {
    const msg = {
        to: email,
        from: 'Ocean <noreply@apikart.co>',
        subject: 'Your Password Has Been Reset',
        text: `Dear ${name},\n\nYour password has been reset by an administrator. Your new password is: ${newPassword}\n\nPlease change your password after logging in for security reasons.\n\nBest regards,\nSupport Team`,
    };
    await sgMail.send(msg);
};

// const sendOrderNotificationToPartner = async (partnerId, order) => {
//     // Send email or push notification to the partner about the new order
//     const partner = await PartnerModel.findById(partnerId);
//     if (!partner) {
//         throw new Error("Partner not found");
//     }

//     // Example: Send an email
//     sendEmail({
//         to: partner.email,
//         subject: "New Order Pending",
//         text: `You have a new order pending review. Order ID: ${order.orderId}. Please review and accept or reject the order.`,
//     });
// };

module.exports = {
    sendEmail,
    sendOtpOnMail: sendOtpOnMail,
    sendResetPasswordEmail: sendResetPasswordEmail,
    sendVerificationEmail: sendVerificationEmail,
    sendTicketConfirmationEmail: sendTicketConfirmationEmail,
    sendTicketReplyEmail: sendTicketReplyEmail,
    sendWelcomeEmail: sendWelcomeEmail,
    sendLoginNotificationEmail: sendLoginNotificationEmail,
    sendActivationEmail: sendActivationEmail,
    sendPasswordResetEmailByAdmin: sendPasswordResetEmailByAdmin
};