import FreeApplication from '../models/FreeApplication.js';
import {
  sendFreeApplicationAdminNotification,
  sendFreeApplicationConfirmation
} from '../services/emailService.js';

// Simple in-memory store for IP/email rate limiting
const rateLimitStore = {};

/**
 * @desc    Submit YUKTRON ONE monthly application
 * @route   POST /api/free-application
 * @access  Public
 */
export const submitFreeApplication = async (req, res) => {
  try {
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
      website_honey // Honeypot field
    } = req.body;

    // 1. Honeypot Spam Protection
    if (website_honey) {
      console.log(`[FreeApplicationController] SPAM DETECTED via honeypot. Silent fail.`);
      return res.status(201).json({
        success: true,
        message: 'Application submitted successfully.'
      });
    }

    // 2. Server-side validation
    if (!fullName || fullName.trim().length < 2) {
      return res.status(400).json({ success: false, message: 'Full name must be at least 2 characters.' });
    }
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(400).json({ success: false, message: 'Please provide a valid email address.' });
    }
    if (!phone || !/^[+0-9\s-]{10,15}$/.test(phone.trim())) {
      return res.status(400).json({ success: false, message: 'Phone number must be between 10 and 15 digits.' });
    }
    if (!businessName || businessName.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Business name is required.' });
    }
    if (!businessType || businessType.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Business type is required.' });
    }
    if (!location || location.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'City/Location is required.' });
    }
    if (!requestedService || !['Social Media Marketing', 'Digital Marketing', 'Website', 'Micro CRM', 'SEO', 'Meta Ads'].includes(requestedService)) {
      return res.status(400).json({ success: false, message: 'Please select a valid service pathway.' });
    }
    // whySelected is optional now

    // 3. In-memory Rate Limiting
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;

    // Rate limit by IP
    if (!rateLimitStore[ip]) rateLimitStore[ip] = [];
    rateLimitStore[ip] = rateLimitStore[ip].filter(timestamp => now - timestamp < oneHour);
    if (rateLimitStore[ip].length >= 3) {
      return res.status(429).json({
        success: false,
        message: 'Too many applications submitted from this IP. Please try again in an hour.'
      });
    }
    rateLimitStore[ip].push(now);

    // Rate limit by Email
    const emailKey = `email:${email.toLowerCase()}`;
    if (!rateLimitStore[emailKey]) rateLimitStore[emailKey] = [];
    rateLimitStore[emailKey] = rateLimitStore[emailKey].filter(timestamp => now - timestamp < oneHour);
    if (rateLimitStore[emailKey].length >= 3) {
      return res.status(429).json({
        success: false,
        message: 'Too many applications submitted with this email. Please try again in an hour.'
      });
    }
    rateLimitStore[emailKey].push(now);

    // 4. Accidental Duplicate Submission Prevention (Check current calendar month)
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const existingApplication = await FreeApplication.findOne({
      $or: [
        { email: email.toLowerCase() },
        { businessName: { $regex: new RegExp(`^${businessName.trim()}$`, 'i') } }
      ],
      createdAt: { $gte: startOfMonth },
      status: { $in: ['PENDING', 'UNDER_REVIEW', 'SHORTLISTED'] }
    });

    if (existingApplication) {
      return res.status(400).json({
        success: false,
        message: 'An active application for this email or business name has already been submitted in the current month.'
      });
    }

    // Generate unique application ID (e.g. Y1-2608-A9FD)
    const date = new Date();
    const yearMonth = date.toISOString().slice(2, 7).replace('-', '');
    const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase();
    const applicationId = `Y1-${yearMonth}-${randomStr}`;

    // 5. Create Database Entry
    const newApplication = await FreeApplication.create({
      applicationId,
      fullName,
      email,
      phone,
      businessName,
      businessType,
      location,
      website: website || '',
      socialLinks: socialLinks || '',
      requestedService,
      whySelected: whySelected || '',
      additionalInformation: additionalInformation || '',
      status: 'PENDING'
    });

    // 6. Send transactional emails asynchronously
    try {
      await sendFreeApplicationAdminNotification(newApplication);
      await sendFreeApplicationConfirmation(
        fullName,
        email,
        businessName,
        requestedService,
        applicationId
      );
    } catch (emailError) {
      console.error('[FreeApplicationController] Transactional emails dispatch failed, but application was saved in database:', emailError.message);
    }

    // 7. Success Response
    return res.status(201).json({
      success: true,
      message: 'Application submitted successfully.',
      applicationId
    });

  } catch (error) {
    console.error('Error in submitFreeApplication:', error);

    // Mongoose schema validation check
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((val) => val.message);
      return res.status(400).json({
        success: false,
        message: messages.join(', ')
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Server error. Please try again later.'
    });
  }
};
