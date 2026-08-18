import mongoose from 'mongoose';

const freeApplicationSchema = new mongoose.Schema(
  {
    applicationId: {
      type: String,
      required: [true, 'Application ID is required'],
      unique: true,
      trim: true,
    },
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
    },
    businessName: {
      type: String,
      required: [true, 'Business name is required'],
      trim: true,
    },
    businessType: {
      type: String,
      required: [true, 'Business type is required'],
      trim: true,
    },
    location: {
      type: String,
      required: [true, 'City/Location is required'],
      trim: true,
    },
    website: {
      type: String,
      trim: true,
    },
    socialLinks: {
      type: String,
      trim: true,
    },
    requestedService: {
      type: String,
      required: [true, 'Service selection is required'],
      enum: ['Social Media Marketing', 'Digital Marketing', 'Website', 'Micro CRM', 'SEO', 'Meta Ads'],
    },
    whySelected: {
      type: String,
      trim: true,
    },
    additionalInformation: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      required: true,
      enum: [
        'PENDING',
        'UNDER_REVIEW',
        'SHORTLISTED',
        'SELECTED',
        'NOT_SELECTED',
        'CONTACTED',
        'COMPLETED'
      ],
      default: 'PENDING',
    },
  },
  {
    timestamps: true,
  }
);

// Index to optimize queries for applications
freeApplicationSchema.index({ email: 1, requestedService: 1, createdAt: -1 });

const FreeApplication = mongoose.model('FreeApplication', freeApplicationSchema);

export default FreeApplication;
