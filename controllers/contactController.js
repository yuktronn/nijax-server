import Contact from '../models/Contact.js';
import { sendAdminNotification, sendUserConfirmation } from '../services/emailService.js';

/**
 * @desc    Submit contact form
 * @route   POST /api/contact
 * @access  Public
 */
export const submitContact = async (req, res) => {
  try {
    const { name, email, phone, company, service, message } = req.body;

    // Validation
    if (!name || !email || !phone || !service || !message) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields: name, email, phone, service, message.',
      });
    }

    // Create entry
    const newContact = await Contact.create({
      name,
      email,
      phone,
      company: company || '',
      service,
      message,
    });

    // Send emails asynchronously with error handling
    try {
      await sendAdminNotification({ name, email, phone, company, service, message });
      await sendUserConfirmation(name, email, service);
    } catch (emailError) {
      console.error('[contactController] Email sending failed, but lead was saved in DB:', emailError.message);
    }

    return res.status(201).json({
      success: true,
      message: "Thank you! We'll be in touch.",
      data: newContact,
    });
  } catch (error) {

    console.error('Error in submitContact:', error);

    // Mongoose validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((val) => val.message);
      return res.status(400).json({
        success: false,
        message: messages.join(', '),
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Server error. Please try again later.',
    });
  }
};
