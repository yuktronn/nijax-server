import { Resend } from 'resend';
import dotenv from 'dotenv';

// Ensure environment variables are loaded
dotenv.config();

const resendApiKey = process.env.RESEND_API_KEY;
let resend = null;

if (resendApiKey) {
  resend = new Resend(resendApiKey);
  console.log('[EmailService] Resend SDK initialized successfully.');
} else {
  console.log('[EmailService] WARNING: RESEND_API_KEY is not defined in environment variables. Running in Simulated (Mock) Mode.');
}

/**
 * Helper to map service slug to friendly display name
 */
const getServiceLabel = (serviceSlug) => {
  const mapping = {
    'digital-marketing': 'Performance Digital Marketing',
    'web-development': 'Custom Web Development',
    'mobile-development': 'Mobile App Development',
    'seo': 'Search Engine Optimization (SEO)',
    'branding': 'Branding & Design',
    'saas-products': 'SaaS Product Development',
    'software': 'Enterprise Software Development',
    'ui-ux': 'UI/UX Strategy & Design'
  };
  return mapping[serviceSlug] || serviceSlug.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};

/**
 * Sends a notification email to the admin with lead details
 */
export const sendAdminNotification = async (leadData) => {
  const { name, email, phone, company, service, message } = leadData;
  const serviceLabel = getServiceLabel(service);
  const fromEmail = process.env.EMAIL_FROM || 'YUKTRON <onboarding@resend.dev>';
  const toEmail = process.env.EMAIL_TO || 'yuktronn@gmail.com';

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>New Lead Submission</title>
</head>
<body style="background-color: #05080c; color: #f3f4f6; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 40px 20px;">
  <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #0b111e; border: 1px solid #1e293b; border-top: 4px solid #00ff88; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);">
    <!-- Header -->
    <tr>
      <td style="padding: 30px 40px; text-align: center; background-color: #060913; border-bottom: 1px solid #1e293b;">
        <h1 style="font-size: 24px; font-weight: 800; color: #ffffff; margin: 0; letter-spacing: 2px;">YUKTRON</h1>
        <p style="font-size: 10px; color: #00ff88; font-weight: bold; margin: 5px 0 0 0; text-transform: uppercase; letter-spacing: 3px;">Lead Alert System</p>
      </td>
    </tr>
    
    <!-- Content Body -->
    <tr>
      <td style="padding: 40px;">
        <h2 style="font-size: 20px; font-weight: 700; color: #ffffff; margin: 0 0 20px 0;">New Contact Form Submission</h2>
        <p style="font-size: 14px; color: #9ca3af; line-height: 1.6; margin: 0 0 30px 0;">
          A visitor has submitted a contact form on the YUKTRON website. Here are the submission details:
        </p>
        
        <!-- Lead Details Card -->
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #05080c; border: 1px solid #1e293b; border-radius: 6px; padding: 20px; margin-bottom: 30px;">
          <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #1e293b; font-size: 13px; color: #9ca3af; font-weight: 600; width: 120px;">Name</td>
            <td style="padding: 10px 0; border-bottom: 1px solid #1e293b; font-size: 14px; color: #ffffff; font-weight: 700;">${name}</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #1e293b; font-size: 13px; color: #9ca3af; font-weight: 600;">Email</td>
            <td style="padding: 10px 0; border-bottom: 1px solid #1e293b; font-size: 14px; color: #00ff88; font-weight: bold;"><a href="mailto:${email}" style="color: #00ff88; text-decoration: none;">${email}</a></td>
          </tr>
          <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #1e293b; font-size: 13px; color: #9ca3af; font-weight: 600;">Phone</td>
            <td style="padding: 10px 0; border-bottom: 1px solid #1e293b; font-size: 14px; color: #ffffff;">${phone}</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #1e293b; font-size: 13px; color: #9ca3af; font-weight: 600;">Company</td>
            <td style="padding: 10px 0; border-bottom: 1px solid #1e293b; font-size: 14px; color: #ffffff;">${company || 'N/A'}</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #1e293b; font-size: 13px; color: #9ca3af; font-weight: 600;">Requested Service</td>
            <td style="padding: 10px 0; border-bottom: 1px solid #1e293b; font-size: 13px; color: #ffffff; font-weight: 600; text-transform: uppercase;"><span style="background-color: #0b1f1a; border: 1px solid #005030; color: #00ff88; padding: 3px 8px; border-radius: 4px; font-size: 11px;">${serviceLabel}</span></td>
          </tr>
          <tr>
            <td colspan="2" style="padding: 20px 0 0 0; font-size: 13px; color: #9ca3af; font-weight: 600;">Message</td>
          </tr>
          <tr>
            <td colspan="2" style="padding: 10px 0 0 0; font-size: 14px; color: #d1d5db; line-height: 1.6; white-space: pre-wrap;">${message}</td>
          </tr>
        </table>
        
        <!-- Reply CTA Button -->
        <div style="text-align: center;">
          <a href="mailto:${email}" style="display: inline-block; background-color: #00ff88; color: #05080c; font-size: 14px; font-weight: 800; text-decoration: none; padding: 14px 30px; border-radius: 4px; text-transform: uppercase; letter-spacing: 1px;">Reply to Lead</a>
        </div>
      </td>
    </tr>
    
    <!-- Footer -->
    <tr>
      <td style="padding: 20px 40px; text-align: center; background-color: #060913; border-top: 1px solid #1e293b; font-size: 11px; color: #6b7280;">
        This email was automatically generated by YUKTRON Website Lead Capture System.<br>
        &copy; ${new Date().getFullYear()} YUKTRON. All rights reserved.
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  console.log(`[EmailService] Attempting to send Admin Notification to ${toEmail}...`);

  if (!resend) {
    console.log('[EmailService] [SIMULATION] Admin Notification sent successfully (No API Key).');
    return { success: true, simulated: true };
  }

  try {
    const data = await resend.emails.send({
      from: fromEmail,
      to: toEmail,
      subject: `[Lead Alert] New submission from ${name} - ${serviceLabel}`,
      html: htmlContent,
    });
    console.log('[EmailService] Admin Notification sent successfully through Resend:', data);
    return { success: true, data };
  } catch (error) {
    console.error('[EmailService] Failed to send Admin Notification:', error);
    throw error;
  }
};

/**
 * Sends a confirmation/thank you email to the user who submitted the form
 */
export const sendUserConfirmation = async (name, toEmail, service) => {
  const serviceLabel = getServiceLabel(service);
  const fromEmail = process.env.EMAIL_FROM || 'YUKTRON <onboarding@resend.dev>';

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Thank you for contacting YUKTRON</title>
</head>
<body style="background-color: #05080c; color: #f3f4f6; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 40px 20px;">
  <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #0b111e; border: 1px solid #1e293b; border-top: 4px solid #00ff88; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);">
    <!-- Header -->
    <tr>
      <td style="padding: 30px 40px; text-align: center; background-color: #060913; border-bottom: 1px solid #1e293b;">
        <h1 style="font-size: 24px; font-weight: 800; color: #ffffff; margin: 0; letter-spacing: 2px;">YUKTRON</h1>
        <p style="font-size: 10px; color: #00ff88; font-weight: bold; margin: 5px 0 0 0; text-transform: uppercase; letter-spacing: 3px;">Digital Marketing & Development</p>
      </td>
    </tr>
    
    <!-- Content Body -->
    <tr>
      <td style="padding: 40px;">
        <h2 style="font-size: 22px; font-weight: 700; color: #ffffff; margin: 0 0 20px 0;">Hello ${name},</h2>
        <p style="font-size: 15px; color: #d1d5db; line-height: 1.7; margin: 0 0 20px 0;">
          Thank you for reaching out to YUKTRON! We have successfully received your inquiry regarding our <strong>${serviceLabel}</strong> services.
        </p>
        <p style="font-size: 15px; color: #d1d5db; line-height: 1.7; margin: 0 0 30px 0;">
          Our strategy and engineering team is reviewing your requirements. A dedicated specialist will get back to you within 24 hours to schedule an initial consultation or campaign audit.
        </p>
        
        <!-- Service Box -->
        <div style="background-color: #05080c; border: 1px solid #1e293b; border-left: 4px solid #00ff88; border-radius: 4px; padding: 20px; margin-bottom: 30px;">
          <h3 style="font-size: 14px; font-weight: 700; color: #ffffff; margin: 0 0 8px 0; text-transform: uppercase; letter-spacing: 1px;">Selected Service</h3>
          <p style="font-size: 14px; color: #00ff88; font-weight: bold; margin: 0;">${serviceLabel}</p>
          <p style="font-size: 13px; color: #9ca3af; margin: 10px 0 0 0; line-height: 1.5;">
            We'll customize a strategy aligned to scale this specific vertical for your business.
          </p>
        </div>
        
        <p style="font-size: 14px; color: #9ca3af; line-height: 1.6; margin: 0 0 30px 0;">
          In the meantime, feel free to explore our latest works and services on our website.
        </p>
        
        <!-- CTA Button -->
        <div style="text-align: center;">
          <a href="https://yuktron.com" style="display: inline-block; background-color: #00ff88; color: #05080c; font-size: 14px; font-weight: 800; text-decoration: none; padding: 14px 30px; border-radius: 4px; text-transform: uppercase; letter-spacing: 1px;">Visit YUKTRON Website</a>
        </div>
      </td>
    </tr>
    
    <!-- Footer -->
    <tr>
      <td style="padding: 30px 40px; text-align: center; background-color: #060913; border-top: 1px solid #1e293b; font-size: 12px; color: #6b7280;">
        <p style="margin: 0 0 10px 0;">YUKTRON &bull; Next-Gen Digital Marketing & Engineering</p>
        <p style="margin: 0; font-size: 11px;">
          If you did not make this request, please ignore this email.<br>
          &copy; ${new Date().getFullYear()} YUKTRON. All rights reserved.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  console.log(`[EmailService] Attempting to send Confirmation to User: ${toEmail}...`);

  if (!resend) {
    console.log('[EmailService] [SIMULATION] User Confirmation sent successfully (No API Key).');
    return { success: true, simulated: true };
  }

  try {
    const data = await resend.emails.send({
      from: fromEmail,
      to: toEmail,
      subject: `We've received your request - YUKTRON`,
      html: htmlContent,
    });
    console.log('[EmailService] User Confirmation sent successfully through Resend:', data);
    return { success: true, data };
  } catch (error) {
    console.error('[EmailService] Failed to send User Confirmation:', error);
    throw error;
  }
};

/**
 * Sends a notification email to the admin with YUKTRON ONE application details
 */
export const sendFreeApplicationAdminNotification = async (appData) => {
  const {
    fullName,
    email,
    phone,
    businessName,
    businessType,
    location,
    website,
    socialLinks,
    requestedService,
    whySelected,
    additionalInformation,
    createdAt
  } = appData;

  const fromEmail = process.env.EMAIL_FROM || 'YUKTRON <onboarding@resend.dev>';
  const toEmail = process.env.EMAIL_TO || 'yuktronn@gmail.com';

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>New YUKTRON ONE Application</title>
</head>
<body style="background-color: #05080c; color: #f3f4f6; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 40px 20px;">
  <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 650px; background-color: #0b111e; border: 1px solid #1e293b; border-top: 4px solid #8b5cf6; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);">
    <!-- Header -->
    <tr>
      <td style="padding: 30px 40px; text-align: center; background-color: #060913; border-bottom: 1px solid #1e293b;">
        <h1 style="font-size: 24px; font-weight: 800; color: #ffffff; margin: 0; letter-spacing: 2px;">YUKTRON ONE</h1>
        <p style="font-size: 10px; color: #8b5cf6; font-weight: bold; margin: 5px 0 0 0; text-transform: uppercase; letter-spacing: 3px;">Monthly Selection Program</p>
      </td>
    </tr>
    
    <!-- Content Body -->
    <tr>
      <td style="padding: 40px;">
        <h2 style="font-size: 18px; font-weight: 700; color: #ffffff; margin: 0 0 20px 0; border-left: 3px solid #8b5cf6; padding-left: 10px;">New Campaign Application Received</h2>
        
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #05080c; border: 1px solid #1e293b; border-radius: 6px; padding: 20px; margin-bottom: 25px; font-size: 13px; line-height: 1.6;">
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #1e293b/30; color: #9ca3af; width: 150px; font-weight: 600;">Applicant Name</td>
            <td style="padding: 8px 0; border-bottom: 1px solid #1e293b/30; color: #ffffff; font-weight: 700;">${fullName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #1e293b/30; color: #9ca3af; font-weight: 600;">Business Name</td>
            <td style="padding: 8px 0; border-bottom: 1px solid #1e293b/30; color: #ffffff; font-weight: 700;">${businessName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #1e293b/30; color: #9ca3af; font-weight: 600;">Business Type</td>
            <td style="padding: 8px 0; border-bottom: 1px solid #1e293b/30; color: #ffffff;">${businessType}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #1e293b/30; color: #9ca3af; font-weight: 600;">Location</td>
            <td style="padding: 8px 0; border-bottom: 1px solid #1e293b/30; color: #ffffff;">${location}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #1e293b/30; color: #9ca3af; font-weight: 600;">Email</td>
            <td style="padding: 8px 0; border-bottom: 1px solid #1e293b/30; color: #8b5cf6; font-weight: bold;"><a href="mailto:${email}" style="color: #8b5cf6; text-decoration: none;">${email}</a></td>
          </tr>
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #1e293b/30; color: #9ca3af; font-weight: 600;">Phone</td>
            <td style="padding: 8px 0; border-bottom: 1px solid #1e293b/30; color: #ffffff;">${phone}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #1e293b/30; color: #9ca3af; font-weight: 600;">Requested Service</td>
            <td style="padding: 8px 0; border-bottom: 1px solid #1e293b/30; color: #ffffff; font-weight: bold; text-transform: uppercase;"><span style="background-color: #19142b; border: 1px solid #5c35b4; color: #a78bfa; padding: 2px 6px; border-radius: 4px; font-size: 11px;">${requestedService}</span></td>
          </tr>
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #1e293b/30; color: #9ca3af; font-weight: 600;">Website</td>
            <td style="padding: 8px 0; border-bottom: 1px solid #1e293b/30; color: #ffffff;">${website || 'N/A'}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #1e293b/30; color: #9ca3af; font-weight: 600;">Social Links</td>
            <td style="padding: 8px 0; border-bottom: 1px solid #1e293b/30; color: #ffffff;">${socialLinks || 'N/A'}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #9ca3af; font-weight: 600;">Submitted At</td>
            <td style="padding: 8px 0; color: #ffffff;">${new Date(createdAt || Date.now()).toLocaleString()}</td>
          </tr>
        </table>

        <!-- Textarea Fields Detailed Review -->
        <h3 style="font-size: 14px; font-weight: 700; color: #ffffff; margin: 25px 0 10px 0; text-transform: uppercase; letter-spacing: 0.5px;">Why Selected Opportunity Matters</h3>
        <div style="background-color: #05080c; border: 1px solid #1e293b; border-radius: 6px; padding: 15px; font-size: 13px; color: #d1d5db; line-height: 1.6; white-space: pre-wrap; margin-bottom: 20px;">${whySelected}</div>

        ${additionalInformation ? `
        <h3 style="font-size: 14px; font-weight: 700; color: #ffffff; margin: 0 0 10px 0; text-transform: uppercase; letter-spacing: 0.5px;">Additional Information</h3>
        <div style="background-color: #05080c; border: 1px solid #1e293b; border-radius: 6px; padding: 15px; font-size: 13px; color: #d1d5db; line-height: 1.6; white-space: pre-wrap; margin-bottom: 20px;">${additionalInformation}</div>
        ` : ''}

        <div style="text-align: center; margin-top: 30px;">
          <a href="mailto:${email}" style="display: inline-block; background-color: #8b5cf6; color: #ffffff; font-size: 14px; font-weight: 800; text-decoration: none; padding: 14px 30px; border-radius: 4px; text-transform: uppercase; letter-spacing: 1px;">Contact Applicant</a>
        </div>
      </td>
    </tr>
    
    <!-- Footer -->
    <tr>
      <td style="padding: 20px 40px; text-align: center; background-color: #060913; border-top: 1px solid #1e293b; font-size: 11px; color: #6b7280;">
        This email was automatically generated by YUKTRON Website Application Portal.<br>
        &copy; ${new Date().getFullYear()} YUKTRON. All rights reserved.
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  console.log(`[EmailService] Attempting to send Admin Notification for YUKTRON ONE to ${toEmail}...`);

  if (!resend) {
    console.log('[EmailService] [SIMULATION] YUKTRON ONE Admin Notification sent successfully (No API Key).');
    return { success: true, simulated: true };
  }

  try {
    const data = await resend.emails.send({
      from: fromEmail,
      to: toEmail,
      subject: `New YUKTRON ONE Application - ${businessName}`,
      html: htmlContent,
    });
    console.log('[EmailService] YUKTRON ONE Admin Notification sent successfully through Resend:', data);
    return { success: true, data };
  } catch (error) {
    console.error('[EmailService] Failed to send YUKTRON ONE Admin Notification:', error);
    throw error;
  }
};

/**
 * Sends a confirmation email to the applicant confirming receipt of application
 */
export const sendFreeApplicationConfirmation = async (fullName, toEmail, businessName, requestedService) => {
  const fromEmail = process.env.EMAIL_FROM || 'YUKTRON <onboarding@resend.dev>';

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Your YUKTRON ONE Application Has Been Received</title>
</head>
<body style="background-color: #05080c; color: #f3f4f6; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 40px 20px;">
  <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #0b111e; border: 1px solid #1e293b; border-top: 4px solid #00ff88; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);">
    <!-- Header -->
    <tr>
      <td style="padding: 30px 40px; text-align: center; background-color: #060913; border-bottom: 1px solid #1e293b;">
        <h1 style="font-size: 24px; font-weight: 800; color: #ffffff; margin: 0; letter-spacing: 2px;">YUKTRON ONE</h1>
        <p style="font-size: 10px; color: #00ff88; font-weight: bold; margin: 5px 0 0 0; text-transform: uppercase; letter-spacing: 3px;">Initiative Confirmation</p>
      </td>
    </tr>
    
    <!-- Content Body -->
    <tr>
      <td style="padding: 40px;">
        <h2 style="font-size: 20px; font-weight: 700; color: #ffffff; margin: 0 0 20px 0;">Hello ${fullName},</h2>
        <p style="font-size: 15px; color: #d1d5db; line-height: 1.7; margin: 0 0 20px 0;">
          Thank you for applying to the **YUKTRON ONE** monthly initiative. We have successfully received the application for your business, <strong>${businessName}</strong>.
        </p>
        
        <!-- Service Box -->
        <div style="background-color: #05080c; border: 1px solid #1e293b; border-left: 4px solid #00ff88; border-radius: 4px; padding: 20px; margin: 25px 0;">
          <h3 style="font-size: 12px; font-weight: 700; color: #9ca3af; margin: 0 0 6px 0; text-transform: uppercase; letter-spacing: 1px;">Requested Service Pathway</h3>
          <p style="font-size: 15px; color: #00ff88; font-weight: bold; margin: 0;">${requestedService}</p>
        </div>

        <p style="font-size: 14px; color: #9ca3af; line-height: 1.7; margin: 0 0 20px 0;">
          <strong>What happens next?</strong>
        </p>
        <ul style="font-size: 14px; color: #9ca3af; line-height: 1.7; padding-left: 20px; margin-bottom: 25px;">
          <li style="margin-bottom: 8px;">Our strategy and engineering teams review all submitted applications.</li>
          <li style="margin-bottom: 8px;">One business is selected every month based on evaluation (need, potential impact, fit).</li>
          <li style="margin-bottom: 8px;">Please note that selection is not guaranteed due to the volume of applications.</li>
          <li>If your business is selected, our team will contact you directly to schedule an initial consultation.</li>
        </ul>
        
        <p style="font-size: 14px; color: #9ca3af; line-height: 1.7; margin: 0 0 30px 0;">
          We appreciate your interest in partnering with YUKTRON to build your digital future.
        </p>

        <div style="text-align: center;">
          <a href="https://yuktron.com/free" style="display: inline-block; background-color: #00ff88; color: #05080c; font-size: 14px; font-weight: 800; text-decoration: none; padding: 14px 30px; border-radius: 4px; text-transform: uppercase; letter-spacing: 1px;">Visit Campaign Page</a>
        </div>
      </td>
    </tr>
    
    <!-- Footer -->
    <tr>
      <td style="padding: 30px 40px; text-align: center; background-color: #060913; border-top: 1px solid #1e293b; font-size: 11px; color: #6b7280;">
        YUKTRON &bull; Next-Gen Digital Marketing & Engineering<br>
        If you did not make this application, please disregard this notification.<br>
        &copy; ${new Date().getFullYear()} YUKTRON. All rights reserved.
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  console.log(`[EmailService] Attempting to send Application Confirmation to ${toEmail}...`);

  if (!resend) {
    console.log('[EmailService] [SIMULATION] Application Confirmation sent successfully (No API Key).');
    return { success: true, simulated: true };
  }

  try {
    const data = await resend.emails.send({
      from: fromEmail,
      to: toEmail,
      subject: `Your YUKTRON ONE Application Has Been Received`,
      html: htmlContent,
    });
    console.log('[EmailService] Application Confirmation sent successfully through Resend:', data);
    return { success: true, data };
  } catch (error) {
    console.error('[EmailService] Failed to send Application Confirmation:', error);
    throw error;
  }
};

/**
 * Sends selection notification email to the selected business
 */
export const sendFreeApplicationSelectedEmail = async (fullName, toEmail, businessName, requestedService) => {
  const fromEmail = process.env.EMAIL_FROM || 'YUKTRON <onboarding@resend.dev>';

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Congratulations! Your business was selected for YUKTRON ONE</title>
</head>
<body style="background-color: #05080c; color: #f3f4f6; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 40px 20px;">
  <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #0b111e; border: 1px solid #1e293b; border-top: 4px solid #00ff88; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);">
    <!-- Header -->
    <tr>
      <td style="padding: 30px 40px; text-align: center; background-color: #060913; border-bottom: 1px solid #1e293b;">
        <h1 style="font-size: 24px; font-weight: 800; color: #ffffff; margin: 0; letter-spacing: 2px;">YUKTRON ONE</h1>
        <p style="font-size: 10px; color: #00ff88; font-weight: bold; margin: 5px 0 0 0; text-transform: uppercase; letter-spacing: 3px;">Congratulations</p>
      </td>
    </tr>
    
    <!-- Content Body -->
    <tr>
      <td style="padding: 40px;">
        <h2 style="font-size: 22px; font-weight: 700; color: #ffffff; margin: 0 0 20px 0;">Hello ${fullName},</h2>
        <p style="font-size: 15px; color: #d1d5db; line-height: 1.7; margin: 0 0 20px 0;">
          We are thrilled to inform you that your business, <strong>${businessName}</strong>, has been **SELECTED** for this month's **YUKTRON ONE** initiative!
        </p>
        
        <p style="font-size: 15px; color: #d1d5db; line-height: 1.7; margin: 0 0 20px 0;">
          You requested our custom <strong>${requestedService}</strong> pathway. Our technical team is reviewing your details to outline a development blueprint customized to your workflow.
        </p>

        <p style="font-size: 15px; color: #d1d5db; line-height: 1.7; margin: 0 0 30px 0;">
          A specialist from our team will contact you directly within 24-48 hours to schedule a diagnostic kick-off consultation.
        </p>
      </td>
    </tr>
    
    <!-- Footer -->
    <tr>
      <td style="padding: 30px 40px; text-align: center; background-color: #060913; border-top: 1px solid #1e293b; font-size: 11px; color: #6b7280;">
        YUKTRON &bull; Next-Gen Digital Marketing & Engineering<br>
        &copy; ${new Date().getFullYear()} YUKTRON. All rights reserved.
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  if (!resend) {
    console.log('[EmailService] [SIMULATION] Selection email sent successfully (No API Key).');
    return { success: true, simulated: true };
  }

  try {
    const data = await resend.emails.send({
      from: fromEmail,
      to: toEmail,
      subject: `YUKTRON ONE Selection - Congratulations ${businessName}!`,
      html: htmlContent,
    });
    return { success: true, data };
  } catch (error) {
    console.error('[EmailService] Failed to send Selection Email:', error);
    throw error;
  }
};

/**
 * Sends a notification email to applicants not selected for this month
 */
export const sendFreeApplicationNotSelectedEmail = async (fullName, toEmail, businessName) => {
  const fromEmail = process.env.EMAIL_FROM || 'YUKTRON <onboarding@resend.dev>';

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>YUKTRON ONE - Campaign Update</title>
</head>
<body style="background-color: #05080c; color: #f3f4f6; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 40px 20px;">
  <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #0b111e; border: 1px solid #1e293b; border-top: 4px solid #9ca3af; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);">
    <!-- Header -->
    <tr>
      <td style="padding: 30px 40px; text-align: center; background-color: #060913; border-bottom: 1px solid #1e293b;">
        <h1 style="font-size: 24px; font-weight: 800; color: #ffffff; margin: 0; letter-spacing: 2px;">YUKTRON ONE</h1>
        <p style="font-size: 10px; color: #9ca3af; font-weight: bold; margin: 5px 0 0 0; text-transform: uppercase; letter-spacing: 3px;">Update</p>
      </td>
    </tr>
    
    <!-- Content Body -->
    <tr>
      <td style="padding: 40px;">
        <h2 style="font-size: 20px; font-weight: 700; color: #ffffff; margin: 0 0 20px 0;">Hello ${fullName},</h2>
        <p style="font-size: 15px; color: #d1d5db; line-height: 1.7; margin: 0 0 20px 0;">
          Thank you for applying to the **YUKTRON ONE** initiative for <strong>${businessName}</strong>. 
        </p>
        
        <p style="font-size: 15px; color: #d1d5db; line-height: 1.7; margin: 0 0 20px 0;">
          Due to the high volume of applicants, we were only able to select one business for this month. Unfortunately, your application was not chosen this time.
        </p>

        <p style="font-size: 15px; color: #d1d5db; line-height: 1.7; margin: 0 0 30px 0;">
          However, your business remains in our database. We encourage you to keep your information updated or reapply in subsequent cycles if your requirements change.
        </p>
      </td>
    </tr>
    
    <!-- Footer -->
    <tr>
      <td style="padding: 30px 40px; text-align: center; background-color: #060913; border-top: 1px solid #1e293b; font-size: 11px; color: #6b7280;">
        YUKTRON &bull; Next-Gen Digital Marketing & Engineering<br>
        &copy; ${new Date().getFullYear()} YUKTRON. All rights reserved.
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  if (!resend) {
    console.log('[EmailService] [SIMULATION] Not Selected email sent successfully (No API Key).');
    return { success: true, simulated: true };
  }

  try {
    const data = await resend.emails.send({
      from: fromEmail,
      to: toEmail,
      subject: `YUKTRON ONE Initiative Update - ${businessName}`,
      html: htmlContent,
    });
    return { success: true, data };
  } catch (error) {
    console.error('[EmailService] Failed to send Not Selected Email:', error);
    throw error;
  }
};

