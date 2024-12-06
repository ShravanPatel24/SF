const mongoose = require('mongoose');
const { toJSON } = require('./plugins');
const mongoosePaginate = require("mongoose-paginate-v2");

const templateSchema = mongoose.Schema(
    {
        adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'admin' },
        templateName: { type: String, required: true }, // e.g., "Welcome Email", "Password Reset"
        subject: { type: String, required: true }, // Email subject
        fromName: { type: String, default: 'Ocean' }, // Default sender name
        fromEmail: { type: String, default: 'noreply@apikart.co' }, // Default sender email
        templateFor: { type: String, required: true }, // Identifies template use-case, e.g., 'new-application', 'reset-password'
        templateType: { type: Number, default: 0 }, // 0 for email, 1 for SMS
        templateDisc: { type: String, required: true }, // Email body template, containing placeholders like {userName}
        orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'order', required: false },
        status: { type: Number, default: 1 }, // 1 for Active, 0 for Inactive
        isDelete: { type: Number, default: 1 }, // Soft delete: 1 for active, 0 for deleted
        attachments: [{ type: String }], // Optional: Array of attachment file paths or URLs
    },
    {
        timestamps: true,
    }
);

templateSchema.index({ templateName: 1, templateFor: 1 }, { unique: true });

templateSchema.plugin(toJSON);
templateSchema.plugin(mongoosePaginate);

/**
 * @typedef template
 */
const TEMPLATE = mongoose.model('template', templateSchema);

async function inIt() {
    var success = await TEMPLATE.countDocuments({});
    // console.log('CATEGORY success===', success)
    if (success == 0) {
        // await new TEMPLATE({ name: 'Super Admin', email: 'superadmin@yopmail.com', password: '12345678', type: 'superadmin' }).save();
        var templatesArray = [{
            "templateType": 0,
            "status": 1,
            "isDelete": 1,
            "templateName": "New Application",
            "subject": "Loan Application Submitted - Confirmation and Next Steps",
            "templateFor": "new-application",
            "templateDisc": "<p>Dear {userName},</p><p>Thank you for submitting your loan application with <strong>Company Name Here</strong>. We have received your application <strong>#{loanApplicationNumber}</strong> and are currently reviewing it.</p><p>Rest assured that our team is working diligently to assess your eligibility for the requested loan amount. We appreciate your patience during this process.</p><p>If any additional information or documentation is required, we will reach out to you directly. We aim to provide a transparent and efficient application experience.</p><p>Once our review is complete, we will notify you of the outcome. If your application is approved, we will provide detailed loan terms and conditions.</p><p>For any questions or assistance, please contact our customer support team at <strong>+65 6445 9166</strong> or <a href=\"mailto:contact@domain.com\"><strong>contact@domain.com</strong></a>.</p><p>Thank you for choosing Company Name Here. We value your trust and look forward to serving you.</p><p>Best regards,</p><p>Company Name Here<br>+65 6445 9166</p>",
            "adminId": "62d78c729035d82a40d92fb4"
        }, {
            "templateType": 0,
            "status": 1,
            "isDelete": 1,
            "templateName": "Loan Application Rejection",
            "subject": "Loan Application Rejection Notification",
            "templateFor": "reject-application",
            "templateDisc": "<p>Dear {userName},</p><p>We regret to inform you that your loan application with <strong>Company Name Here</strong> has been rejected. We have carefully reviewed your application <strong>#{loanApplicationNumber}</strong>, but unfortunately, we are unable to approve your request at this time.</p><p>If you have any questions or would like further clarification, please feel free to contact our customer support team at <strong>+65 6445 9166 </strong>or<strong> contact@domain.com</strong>.</p><p>Thank you for considering <strong>Company Name Here</strong>.</p><p>Best regards,</p><p>Support Team<br>+65 6445 9166</p>",
            "adminId": "62d78c729035d82a40d92fb4"
        }, {
            "templateType": 1,
            "status": 1,
            "isDelete": 0,
            "templateName": "Approve Loan",
            "subject": "Loan Application Approval Notification",
            "templateFor": "approve-application",
            "templateDisc": "<p>Dear {userName},</p><p>We are pleased to inform you that your loan application <strong>#{loanApplicationNumber}</strong> &nbsp;with <strong>Company Name Here</strong> has been approved. Congratulations! We have carefully reviewed your application and are delighted to support your financial needs.</p><p>Here are the key details regarding your approved loan:</p><p>Loan Amount: &nbsp;<strong>{loanAmount}</strong></p><p>We understand that you have been eagerly awaiting this decision, and we are excited to be able to assist you with your financial requirements. Our team will work closely with you to finalize the necessary documentation and facilitate the loan disbursal process.</p><p>Should you have any questions or require further information, please do not hesitate to contact our customer support team at <strong>+65 6445 9166</strong> or <a href=\"mailto:contact@domain.com\"><strong>contact@domain.com</strong></a>. We are here to provide any assistance you may need.</p><p>Once again, congratulations on the approval of your loan application! We appreciate your trust in <strong>Company Name Here</strong>, and we look forward to serving your financial needs.</p><p>Best regards,</p><p>Support Team<br>+65 6445 9166</p>",
            "adminId": "62d78c729035d82a40d92fb4"
        }, {
            "templateType": 0,
            "status": 1,
            "isDelete": 1,
            "templateName": "Approve Loan",
            "subject": "Loan Application Approval Notification",
            "templateFor": "approve-application",
            "templateDisc": "<p>Dear {userName},</p><p>We are pleased to inform you that your loan application <strong>#{loanApplicationNumber}</strong> &nbsp;with <strong>Company Name Here</strong> has been approved. Congratulations! We have carefully reviewed your application and are delighted to support your financial needs.</p><p>Here are the key details regarding your approved loan:</p><p>Loan Amount: &nbsp;<strong>{loanAmount}</strong></p><p>We understand that you have been eagerly awaiting this decision, and we are excited to be able to assist you with your financial requirements. Our team will work closely with you to finalize the necessary documentation and facilitate the loan disbursal process.</p><p>Should you have any questions or require further information, please do not hesitate to contact our customer support team at <strong>+65 6445 9166</strong> or <a href=\"mailto:contact@domain.com\"><strong>contact@domain.com</strong></a>. We are here to provide any assistance you may need.</p><p>Once again, congratulations on the approval of your loan application! We appreciate your trust in <strong>Company Name Here</strong>, and we look forward to serving your financial needs.</p><p>Best regards,</p><p>Support Team<br>+65 6445 9166</p>",
            "adminId": "62d78c729035d82a40d92fb4"
        }, {
            "templateType": 0,
            "status": 1,
            "isDelete": 1,
            "templateName": "Counter Offer",
            "subject": "Loan Counter Offer - Special Offer Inside!",
            "templateFor": "counter-offer",
            "templateDisc": "<p>Dear {userName},</p><p>Congratulations! We have a special offer for you based on our review of your loan application. Here are the details:</p><p>Loan Amount: {counterOfferAmount} Interest Rate: {counterOfferInterestRate}% Repayment Term: {counterOfferTerm} months</p><p>This counter offer is tailored to better suit your needs. To proceed, simply review the terms and conditions outlined below:</p><ol><li>Loan Amount: {counterOfferAmount}</li><li>Interest Rate: {counterOfferInterestRate}%</li><li>Repayment Term: {counterOfferTerm} months</li></ol><p>To accept this offer, please sign and return the attached agreement within {counterOfferExpiry} days. Once we receive the signed agreement, we will initiate the loan disbursement process.</p><p>If you have any questions, feel free to contact our loan department at <strong>+65 6445 9166</strong> or <a href=\"mailto:contact@domain.com\"><strong>contact@domain.com</strong></a>.</p><p>We appreciate your interest in our loan services and look forward to assisting you further.</p><p>Best regards,</p><p>Support Team<br>+65 6445 9166</p>",
            "adminId": "62d78c729035d82a40d92fb4"
        }, {
            "templateType": 0,
            "status": 1,
            "isDelete": 1,
            "templateName": "Chat Notification",
            "subject": "You've received messages from {senderName}}",
            "templateFor": "chat-notification",
            "templateDisc": "<p>Hi {userName},</p><p>You've received new messages from {senderName}. Here's a preview of the message:</p><p>“{message}”</p><p>Thank you for using our platform. If you have any further questions or need assistance, feel free to reach out to our support team.</p><p>Best regards,</p><p>Support Team<br>+65 6445 9166</p>",
            "adminId": "62d78c729035d82a40d92fb4"
        }, {
            "templateType": 0,
            "status": 1,
            "isDelete": 1,
            "templateName": "Appointment Date and Time Change",
            "subject": "Appointment Date and Time Change",
            "templateFor": "change-appointment",
            "templateDisc": "<p>Dear {userName},</p><p>We hope this email finds you well. We wanted to inform you that there has been a change in the date and time of your upcoming appointment. The updated details are as follows:</p><ul><li>Appointment Date: {application_date}</li><li>Appointment Time: {application_date}</li></ul><p>We apologize for any inconvenience caused by this change. We understand the importance of your appointment and have made every effort to accommodate your schedule. If the new date and time are not suitable for you, please let us know as soon as possible, and we will do our best to find an alternative arrangement.</p><p>If you have any questions or need further assistance, please feel free to contact our office. We appreciate your understanding and cooperation.</p><p>Best regards,</p><p>Support Team<br>+65 6445 9166</p>",
            "adminId": "62d78c729035d82a40d92fb4"
        }, {
            "templateType": 0,
            "status": 1,
            "isDelete": 1,
            "templateName": "New User Register",
            "subject": "Welcome to Company Name Here - Let's Get Started!",
            "templateFor": "new-register-customer",
            "templateDisc": "<p>Dear {userName},</p><p>Welcome to <strong>Company Name Here</strong>! We're thrilled to have you join our community. Get ready to explore, connect, and make the most of our platform.</p><p>Complete your profile, explore our features, connect with others, learn and grow, and share your feedback. We're here to support you every step of the way.</p><p>If you have any questions, feel free to reach out to our support team at <strong>+65 6445 9166</strong> or <a href=\"mailto:contact@domain.com\"><strong>contact@domain.com</strong></a>.</p><p>Let's embark on an exciting journey together!</p><p>Best regards,</p><p>Support Team<br>+65 6445 9166</p>",
            "adminId": "62d78c729035d82a40d92fb4"
        }, {
            "templateType": 0,
            "status": 1,
            "isDelete": 1,
            "templateName": "Account Deactivation Confirmation",
            "subject": "Account Deactivation Confirmation",
            "templateFor": "deactivate-customer-account",
            "templateDisc": "<p>Dear {userName},</p><p>We regret to inform you that your account with <strong>Company Name Here</strong> has been deactivated as per your request. We confirm that your account has been successfully deactivated.</p><p>If you change your mind in the future and wish to reactivate your account, please contact our support team at <strong>+65 6445 9166</strong> or <a href=\"mailto:contact@domain.com\"><strong>contact@domain.com</strong></a>, and we will be happy to assist you.</p><p>Thank you for being a part of [Platform Name], and we wish you all the best in your future endeavors.</p><p>Sincerely,</p><p>Support Team<br>+65 6445 9166</p>",
            "adminId": "62d78c729035d82a40d92fb4"
        },
        {
            "templateType": 0,
            "status": 1,
            "isDelete": 1,
            "templateName": "Document Required",
            "subject": "Document Required for Loan Application #{loan_application_number}",
            "templateFor": "request-document",
            "templateDisc": "<p>Dear {userName},</p><p>We hope this email finds you well. We are writing to inform you that we require some additional documents in order to process your loan application with us.</p><p>To proceed with the evaluation of your application, we kindly request the submission of the following documents:</p><ol><li>Proof of identification (e.g., passport, driver's license)</li><li>Proof of income (e.g., pay stubs, bank statements)</li><li>Address verification (e.g., utility bill, rental agreement)</li></ol><p>Please ensure that the documents are provided to us as soon as possible. This will enable us to complete the necessary assessment and expedite the loan approval process for you.</p><p>If you have any questions or need further clarification regarding the document requirements, please feel free to contact our customer support team. We are here to assist you throughout the process.</p><p>Thank you for your cooperation and prompt attention to this matter. We look forward to receiving the requested documents and proceeding with your loan application.</p><p>Best regards,</p><p>Support Team<br>+65 6445 9166</p>",
            "adminId": "62d78c729035d82a40d92fb4"
        },
        {
            "templateType": 1,
            "status": 1,
            "isDelete": 0,
            "templateName": "New Ticket",
            "subject": "New Ticket #{ticket_number} ",
            "templateFor": "new-ticket",
            "templateDisc": "<p>Dear {userName},</p><p>Thank you for reaching out to our support team. We have received your new ticket and we are here to assist you.</p><p>Ticket Number: #{ticketNumber}</p><p>Our team is currently reviewing your request and we will provide a response as soon as possible. We appreciate your patience during this process.</p><p>If you have any additional information or details that you would like to share regarding your issue, please feel free to reply to this email. We want to ensure that we address your concerns effectively.</p><p>Once again, thank you for contacting our support team. We will do our best to resolve your issue promptly.</p><p>Best regards,</p><p>Support Team<br>+65 6445 9166<br>&nbsp;</p>",
            "adminId": "62d78c729035d82a40d92fb4"
        },
        {
            "templateType": 0,
            "status": 1,
            "isDelete": 1,
            "templateName": "New Ticket",
            "subject": "New Ticket # ticket_number",
            "templateFor": "new-ticket",
            "templateDisc": "<p>Dear {userName},</p><p>Thank you for reaching out to our support team. We have received your new ticket and we are here to assist you.</p><p>Ticket Number: #{ticketNumber}</p><p>Our team is currently reviewing your request and we will provide a response as soon as possible. We appreciate your patience during this process.</p><p>If you have any additional information or details that you would like to share regarding your issue, please feel free to reply to this email. We want to ensure that we address your concerns effectively.</p><p>Once again, thank you for contacting our support team. We will do our best to resolve your issue promptly.</p><p>Best regards,</p><p>Support Team<br>+65 6445 9166</p>",
            "adminId": "62d78c729035d82a40d92fb4"
        }]
        for (let i = 0; i < templatesArray.length; i++) {
            const element = templatesArray[i];
            await new TEMPLATE(element).save()
        }
    }
};

inIt();

module.exports = TEMPLATE;