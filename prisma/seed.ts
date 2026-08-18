import { PrismaClient, Role, CycleStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const adminEmail = 'admin@yuktron.com';
  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash('admin123', 10);
    await prisma.user.create({
      data: {
        name: 'Yuktron Admin',
        email: adminEmail,
        passwordHash,
        role: Role.ADMIN,
        phone: '9876543210',
      },
    });
    console.log('Admin user created: admin@yuktron.com / admin123');
  } else {
    console.log('Admin user already exists');
  }

  const cycleName = 'August 2026 Digital Pilot';
  const existingCycle = await prisma.pilotCycle.findFirst({
    where: { name: cycleName },
  });

  if (!existingCycle) {
    const now = new Date();
    const start = new Date(now);
    const end = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000); // Closes in 10 days
    const selection = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000); // Winner selected in 15 days

    await prisma.pilotCycle.create({
      data: {
        name: cycleName,
        month: 8,
        year: 2026,
        status: CycleStatus.OPEN,
        applicationStartAt: start,
        applicationEndAt: end,
        selectionAt: selection,
      },
    });
    console.log('Open pilot cycle created: August 2026 Digital Pilot');
  } else {
    console.log('Cycle already exists');
  }

  // Seed CampaignSettings
  const existingSettings = await prisma.campaignSettings.findUnique({
    where: { id: 'default' },
  });

  if (!existingSettings) {
    const start = new Date();
    const end = new Date(start.getTime() + 10 * 24 * 60 * 60 * 1000);
    await prisma.campaignSettings.create({
      data: {
        id: 'default',
        campaignTitle: 'Your business could be our next Digital Pilot.',
        campaignSubtitle: 'Each month, Yuktron selects one business for a Digital Pilot.',
        selectionCount: 1,
        offerMessage: 'Selected businesses receive the pilot at no project cost.',
        supportingMessage: 'Selected businesses receive the pilot at no project cost.',
        applicationOpen: start,
        applicationClose: end,
        isActive: true,
      },
    });
    console.log('Default Campaign Settings seeded');
  }

  // Seed default Services
  const defaultServices = [
    {
      name: 'Website Development',
      slug: 'website-development',
      shortDescription: 'Premium business website customized for lead capture.',
      description: 'A high-performance, mobile-first website designed to showcase your business, products, and services. Includes contact forms, maps, and SEO optimization.',
      icon: 'FiLayout',
      aiContext: 'Website Development. Use this when the customer needs a landing page, business website, portfolio, or showcase site.',
      isActive: true,
      displayOrder: 1,
    },
    {
      name: 'Small Business CRM',
      slug: 'small-business-crm',
      shortDescription: 'Custom CRM to manage clients, leads, and quotes.',
      description: 'A lightweight, simple-to-use customer relationship management tool to capture leads, track conversations, schedule follow-ups, and log pipeline status.',
      icon: 'FiBriefcase',
      aiContext: 'Small Business CRM. Use this when the customer wants to manage client inquiries, log pipeline stages, track contacts, or centralize team communications.',
      isActive: true,
      displayOrder: 2,
    },
    {
      name: 'Business Automation',
      slug: 'business-automation',
      shortDescription: 'Connect apps and automate manual workflows.',
      description: 'Integration flow custom-built to connect your email, WhatsApp, sheets, or existing tools to automate order processing, notifications, and repetitive manual tasks.',
      icon: 'FiZap',
      aiContext: 'Business Automation / Integration. Use this when the customer wants to sync data between platforms (like Google Sheets to WhatsApp), automate notifications, or reduce manual copy-paste work.',
      isActive: true,
      displayOrder: 3,
    },
    {
      name: 'Booking System',
      slug: 'booking-system',
      shortDescription: 'Appointment booking calendar for clients.',
      description: 'Self-service scheduling calendar allowing customers to view availability, book slots, receive SMS/email confirmations, and manage appointments without back-and-forth messaging.',
      icon: 'FiCalendar',
      aiContext: 'Appointment Booking / Scheduling. Use this when the client is a service provider (clinic, consultant, salon, tutor) and wants automated bookings.',
      isActive: true,
      displayOrder: 4,
    },
  ];

  for (const s of defaultServices) {
    const existing = await prisma.service.findUnique({
      where: { slug: s.slug },
    });
    if (!existing) {
      await prisma.service.create({ data: s });
      console.log(`Service seeded: ${s.name}`);
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
