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

const logoUrl = process.env.LOGO_URL || 'https://nijax-server-production.up.railway.app/favicon.jpg';

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
<body style="background-color: #ffffff; color: #000000; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 40px 20px; -webkit-font-smoothing: antialiased;">
  <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 560px; background-color: #ffffff;">
    <!-- Logo -->
    <tr>
      <td style="padding: 20px 0 35px 0; text-align: center;">
        <img src="${logoUrl}" alt="YUKTRON Logo" width="56" height="56" style="border-radius: 6px; border: 0;" />
      </td>
    </tr>
    
    <!-- Content Body -->
    <tr>
      <td style="padding: 0; text-align: left;">
        <h2 style="font-size: 18px; font-weight: 700; color: #000000; margin: 0 0 10px 0;">New Contact Form Submission</h2>
        <p style="font-size: 14px; color: #333333; line-height: 1.6; margin: 0 0 25px 0;">
          A visitor has submitted a contact form on the YUKTRON website. Here are the submission details:
        </p>
        
        <!-- Lead Details Table -->
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 25px; font-size: 14px; line-height: 1.7; border-collapse: collapse;">
          <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; color: #555555; width: 140px; font-weight: 500;">Name</td>
            <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; color: #000000; font-weight: 700;">${name}</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; color: #555555; font-weight: 500;">Email</td>
            <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; color: #000000; font-weight: 600;"><a href="mailto:${email}" style="color: #000000; text-decoration: underline;">${email}</a></td>
          </tr>
          <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; color: #555555; font-weight: 500;">Phone</td>
            <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; color: #000000;">${phone}</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; color: #555555; font-weight: 500;">Company</td>
            <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; color: #000000;">${company || 'N/A'}</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; color: #555555; font-weight: 500;">Service</td>
            <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; color: #000000; font-weight: 600;">${serviceLabel}</td>
          </tr>
        </table>
        
        <h3 style="font-size: 14px; font-weight: 700; color: #000000; margin: 25px 0 10px 0; text-transform: uppercase; letter-spacing: 0.5px;">Message</h3>
        <div style="border: 1px solid #e5e7eb; border-radius: 6px; padding: 15px; font-size: 14px; color: #000000; line-height: 1.6; white-space: pre-wrap; margin-bottom: 25px;">${message}</div>
        
        <!-- Reply CTA Button -->
        <div style="margin: 30px 0;">
          <a href="mailto:${email}" style="display: inline-block; background-color: #000000; color: #ffffff; font-size: 14px; font-weight: 600; text-decoration: none; padding: 10px 20px; border-radius: 5px;">Reply to Lead</a>
        </div>
      </td>
    </tr>
    
    <!-- Footer -->
    <tr>
      <td style="padding: 30px 0 10px 0; border-top: 1px solid #e5e7eb; font-size: 12px; color: #777777; line-height: 1.5; text-align: left;">
        This email was automatically generated by YUKTRON Website Lead Capture System.<br>
        &copy; ${new Date().getFullYear()} YUKTRON Digital Solutions. All rights reserved.
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
<body style="background-color: #ffffff; color: #000000; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 40px 20px; -webkit-font-smoothing: antialiased;">
  <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 560px; background-color: #ffffff;">
    <!-- Logo -->
    <tr>
      <td style="padding: 20px 0 35px 0; text-align: center;">
        <img src="${logoUrl}" alt="YUKTRON Logo" width="56" height="56" style="border-radius: 6px; border: 0;" />
      </td>
    </tr>
    
    <!-- Content Body -->
    <tr>
      <td style="padding: 0; text-align: left;">
        <h2 style="font-size: 18px; font-weight: 700; color: #000000; margin: 0 0 15px 0;">Hello ${name},</h2>
        <p style="font-size: 14px; color: #333333; line-height: 1.6; margin: 0 0 20px 0;">
          Thank you for reaching out to YUKTRON! We have successfully received your inquiry regarding our <strong>${serviceLabel}</strong> services.
        </p>
        <p style="font-size: 14px; color: #333333; line-height: 1.6; margin: 0 0 25px 0;">
          Our strategy and engineering team is reviewing your requirements. A dedicated specialist will get back to you within 24 hours to schedule an initial consultation or campaign audit.
        </p>
        
        <!-- Service Box -->
        <div style="border: 1px solid #e5e7eb; border-radius: 6px; padding: 18px; margin-bottom: 30px;">
          <h3 style="font-size: 11px; font-weight: 700; color: #555555; margin: 0 0 6px 0; text-transform: uppercase; letter-spacing: 1px;">Selected Service</h3>
          <p style="font-size: 14px; color: #000000; font-weight: bold; margin: 0;">${serviceLabel}</p>
        </div>
        
        <p style="font-size: 13px; color: #777777; line-height: 1.6; margin: 0 0 30px 0; font-style: italic;">
          If you did not make this request, please ignore this email.
        </p>
        
        <!-- CTA Button -->
        <div style="margin: 30px 0;">
          <a href="https://yuktron.com" style="display: inline-block; background-color: #000000; color: #ffffff; font-size: 14px; font-weight: 600; text-decoration: none; padding: 10px 20px; border-radius: 5px;">Visit YUKTRON Website</a>
        </div>
      </td>
    </tr>
    
    <!-- Footer -->
    <tr>
      <td style="padding: 30px 0 10px 0; border-top: 1px solid #e5e7eb; font-size: 12px; color: #777777; line-height: 1.5; text-align: left;">
        YUKTRON &bull; Next-Gen Digital Marketing & Engineering<br>
        &copy; ${new Date().getFullYear()} YUKTRON Digital Solutions. All rights reserved.
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
    applicationId,
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
<body style="background-color: #ffffff; color: #000000; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 40px 20px; -webkit-font-smoothing: antialiased;">
  <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 560px; background-color: #ffffff;">
    <!-- Logo -->
    <tr>
      <td style="padding: 20px 0 35px 0; text-align: center;">
        <img src="${logoUrl}" alt="YUKTRON Logo" width="56" height="56" style="border-radius: 6px; border: 0;" />
      </td>
    </tr>
    
    <!-- Content Body -->
    <tr>
      <td style="padding: 0; text-align: left;">
        <h2 style="font-size: 18px; font-weight: 700; color: #000000; margin: 0 0 10px 0;">New Campaign Application</h2>
        <p style="font-size: 14px; color: #333333; line-height: 1.6; margin: 0 0 25px 0;">
          A new business has registered for this month's YUKTRON ONE selection program. Review the details below:
        </p>
        
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 25px; font-size: 14px; line-height: 1.7; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; color: #555555; width: 140px; font-weight: 500;">Application ID</td>
            <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; color: #000000; font-weight: 700; font-family: monospace;">${applicationId}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; color: #555555; font-weight: 500;">Applicant Name</td>
            <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; color: #000000; font-weight: 700;">${fullName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; color: #555555; font-weight: 500;">Business Name</td>
            <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; color: #000000; font-weight: 700;">${businessName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; color: #555555; font-weight: 500;">Business Type</td>
            <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; color: #000000;">${businessType}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; color: #555555; font-weight: 500;">Location</td>
            <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; color: #000000;">${location}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; color: #555555; font-weight: 500;">Email</td>
            <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; color: #000000;"><a href="mailto:${email}" style="color: #000000; text-decoration: underline;">${email}</a></td>
          </tr>
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; color: #555555; font-weight: 500;">Phone</td>
            <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; color: #000000;">${phone}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; color: #555555; font-weight: 500;">Requested Service</td>
            <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; color: #000000; font-weight: 600;">${requestedService}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; color: #555555; font-weight: 500;">Website</td>
            <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; color: #000000;">${website ? `<a href="${website}" style="color: #000000; text-decoration: underline;">${website}</a>` : 'N/A'}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; color: #555555; font-weight: 500;">Social Links</td>
            <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; color: #000000;">${socialLinks || 'N/A'}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #555555; font-weight: 500;">Submitted At</td>
            <td style="padding: 8px 0; color: #000000;">${new Date(createdAt || Date.now()).toLocaleString()}</td>
          </tr>
        </table>
 
        <!-- Textarea Fields Detailed Review -->
        <h3 style="font-size: 13px; font-weight: 700; color: #000000; margin: 25px 0 10px 0; text-transform: uppercase; letter-spacing: 0.5px;">Why Selected Opportunity Matters</h3>
        <div style="border: 1px solid #e5e7eb; border-radius: 6px; padding: 15px; font-size: 14px; color: #000000; line-height: 1.6; white-space: pre-wrap; margin-bottom: 20px;">${whySelected || 'N/A'}</div>
 
        ${additionalInformation ? `
        <h3 style="font-size: 13px; font-weight: 700; color: #000000; margin: 0 0 10px 0; text-transform: uppercase; letter-spacing: 0.5px;">Additional Information</h3>
        <div style="border: 1px solid #e5e7eb; border-radius: 6px; padding: 15px; font-size: 14px; color: #000000; line-height: 1.6; white-space: pre-wrap; margin-bottom: 20px;">${additionalInformation}</div>
        ` : ''}
 
        <div style="margin: 30px 0;">
          <a href="mailto:${email}" style="display: inline-block; background-color: #000000; color: #ffffff; font-size: 14px; font-weight: 600; text-decoration: none; padding: 10px 20px; border-radius: 5px;">Contact Applicant</a>
        </div>
      </td>
    </tr>
    
    <!-- Footer -->
    <tr>
      <td style="padding: 30px 0 10px 0; border-top: 1px solid #e5e7eb; font-size: 12px; color: #777777; line-height: 1.5; text-align: left;">
        This email was automatically generated by YUKTRON Website Application Portal.<br>
        &copy; ${new Date().getFullYear()} YUKTRON Digital Solutions. All rights reserved.
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
export const sendFreeApplicationConfirmation = async (fullName, toEmail, businessName, requestedService, applicationId) => {
  const fromEmail = process.env.EMAIL_FROM || 'YUKTRON <onboarding@resend.dev>';

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Your YUKTRON ONE Application Has Been Received</title>
</head>
<body style="background-color: #ffffff; color: #000000; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 40px 20px; -webkit-font-smoothing: antialiased;">
  <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 560px; background-color: #ffffff;">
    <!-- Logo -->
    <tr>
      <td style="padding: 20px 0 35px 0; text-align: center;">
        <img src="${logoUrl}" alt="YUKTRON Logo" width="56" height="56" style="border-radius: 6px; border: 0;" />
      </td>
    </tr>
    
    <!-- Content Body -->
    <tr>
      <td style="padding: 0; text-align: left;">
        <h2 style="font-size: 18px; font-weight: 700; color: #000000; margin: 0 0 15px 0;">Hello ${fullName},</h2>
        <p style="font-size: 14px; color: #333333; line-height: 1.6; margin: 0 0 20px 0;">
          Thank you for applying to the **YUKTRON ONE** monthly initiative. We have successfully received the application for your business, <strong>${businessName}</strong>.
        </p>

        <!-- Application ID Block -->
        <div style="border: 1px solid #e5e7eb; padding: 15px; border-radius: 6px; margin: 20px 0; font-size: 13px; color: #333333; text-align: center;">
          Application Reference: <strong style="color: #000000; font-family: monospace; font-size: 15px; letter-spacing: 0.5px;">${applicationId}</strong>
        </div>
        
        <!-- Service Box -->
        <div style="border: 1px solid #e5e7eb; border-radius: 6px; padding: 18px; margin: 25px 0;">
          <h3 style="font-size: 11px; font-weight: 700; color: #555555; margin: 0 0 6px 0; text-transform: uppercase; letter-spacing: 1px;">Requested Service Pathway</h3>
          <p style="font-size: 14px; color: #000000; font-weight: bold; margin: 0;">${requestedService}</p>
        </div>

        <p style="font-size: 14px; color: #000000; font-weight: 700; margin: 0 0 10px 0;">
          What happens next?
        </p>
        <ul style="font-size: 13px; color: #333333; line-height: 1.6; padding-left: 20px; margin-bottom: 25px; margin-top: 0;">
          <li style="margin-bottom: 8px;">Our engineering and design teams will review all applications manually.</li>
          <li style="margin-bottom: 8px;">Exactly one business is selected every month based on evaluation (need, potential impact, fit).</li>
          <li style="margin-bottom: 8px;">If your business is selected, our team will contact you directly via the details provided to schedule a kick-off consultation.</li>
        </ul>
        
        <p style="font-size: 13px; color: #777777; line-height: 1.6; margin: 0 0 30px 0; font-style: italic;">
          Please note that due to high applicant volumes, selection is competitive and not guaranteed.
        </p>

        <div style="margin: 30px 0;">
          <a href="https://yuktron.com/free" style="display: inline-block; background-color: #000000; color: #ffffff; font-size: 14px; font-weight: 600; text-decoration: none; padding: 10px 20px; border-radius: 5px;">Visit Campaign Page</a>
        </div>
      </td>
    </tr>
    
    <!-- Footer -->
    <tr>
      <td style="padding: 30px 0 10px 0; border-top: 1px solid #e5e7eb; font-size: 12px; color: #777777; line-height: 1.5; text-align: left;">
        YUKTRON &bull; Next-Gen Digital Marketing & Engineering<br>
        &copy; ${new Date().getFullYear()} YUKTRON Digital Solutions. All rights reserved.
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
<body style="background-color: #ffffff; color: #000000; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 40px 20px; -webkit-font-smoothing: antialiased;">
  <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 560px; background-color: #ffffff;">
    <!-- Logo -->
    <tr>
      <td style="padding: 20px 0 35px 0; text-align: center;">
        <img src="${logoUrl}" alt="YUKTRON Logo" width="56" height="56" style="border-radius: 6px; border: 0;" />
      </td>
    </tr>
    
    <!-- Content Body -->
    <tr>
      <td style="padding: 0; text-align: left;">
        <h2 style="font-size: 18px; font-weight: 700; color: #000000; margin: 0 0 15px 0;">Hello ${fullName},</h2>
        <p style="font-size: 15px; color: #000000; line-height: 1.6; margin: 0 0 20px 0; font-weight: 600;">
          We are thrilled to inform you that your business, <strong>${businessName}</strong>, has been **SELECTED** for this month's **YUKTRON ONE** initiative!
        </p>
        
        <p style="font-size: 14px; color: #333333; line-height: 1.6; margin: 0 0 20px 0;">
          You requested our custom <strong>${requestedService}</strong> pathway. Our technical team is currently reviewing your details to outline a development and campaign blueprint customized to your business goals.
        </p>

        <p style="font-size: 14px; color: #333333; line-height: 1.6; margin: 0 0 30px 0;">
          A specialist from our team will contact you directly within 24-48 hours via email or phone to schedule our diagnostic kick-off consultation.
        </p>

        <div style="border: 1px solid #e5e7eb; border-radius: 6px; padding: 15px; font-size: 13px; color: #000000; text-align: center; font-weight: 700; margin: 25px 0;">
          🎉 Setup Consultation Scheduled Automatically
        </div>
      </td>
    </tr>
    
    <!-- Footer -->
    <tr>
      <td style="padding: 30px 0 10px 0; border-top: 1px solid #e5e7eb; font-size: 12px; color: #777777; line-height: 1.5; text-align: left;">
        YUKTRON &bull; Next-Gen Digital Marketing & Engineering<br>
        &copy; ${new Date().getFullYear()} YUKTRON Digital Solutions. All rights reserved.
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
<body style="background-color: #ffffff; color: #000000; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 40px 20px; -webkit-font-smoothing: antialiased;">
  <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 560px; background-color: #ffffff;">
    <!-- Logo -->
    <tr>
      <td style="padding: 20px 0 35px 0; text-align: center;">
        <img src="${logoUrl}" alt="YUKTRON Logo" width="56" height="56" style="border-radius: 6px; border: 0;" />
      </td>
    </tr>
    
    <!-- Content Body -->
    <tr>
      <td style="padding: 0; text-align: left;">
        <h2 style="font-size: 18px; font-weight: 700; color: #000000; margin: 0 0 15px 0;">Hello ${fullName},</h2>
        <p style="font-size: 14px; color: #333333; line-height: 1.6; margin: 0 0 20px 0;">
          Thank you for applying to the **YUKTRON ONE** initiative for your business, <strong>${businessName}</strong>. 
        </p>
        
        <p style="font-size: 14px; color: #333333; line-height: 1.6; margin: 0 0 20px 0;">
          We received many incredible applications this month, and unfortunately, <strong>your business was not selected for this month's ₹0 pilot</strong>. Since our scope is strictly limited to one business per month, making the decision was extremely difficult.
        </p>
 
        <p style="font-size: 14px; color: #333333; line-height: 1.6; margin: 0 0 30px 0;">
          However, your business remains in our database. We encourage you to keep your information updated or reapply in subsequent cycles if your requirements change.
        </p>
 
        <div style="margin: 30px 0;">
          <a href="https://yuktron.com/free" style="display: inline-block; background-color: #000000; color: #ffffff; font-size: 14px; font-weight: 600; text-decoration: none; padding: 10px 20px; border-radius: 5px;">Discuss My Requirement</a>
        </div>
      </td>
    </tr>
    
    <!-- Footer -->
    <tr>
      <td style="padding: 30px 0 10px 0; border-top: 1px solid #e5e7eb; font-size: 12px; color: #777777; line-height: 1.5; text-align: left;">
        YUKTRON &bull; Next-Gen Digital Marketing & Engineering<br>
        &copy; ${new Date().getFullYear()} YUKTRON Digital Solutions. All rights reserved.
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
