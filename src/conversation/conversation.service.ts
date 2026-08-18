import { Injectable } from '@nestjs/common';
import { Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';

interface Message {
  role: 'user' | 'assistant';
  text: string;
}

interface ApplicationDraft {
  businessName: string;
  businessType: string;
  requestedSolution: string;
  businessChallenge: string;
  targetAudience: string;
  location: string;
  applicantName: string;
  applicantDesignation: string;
  email: string;
  phone: string;
  referralSource: string;
}

type FieldName = keyof ApplicationDraft;

@Injectable()
export class ConversationService {
  constructor(private readonly prisma: PrismaService) {}

  async processAndStreamMessage(
    body: {
      messages: Message[];
      currentField: string;
      formData: ApplicationDraft;
      message: string;
    },
    res: Response,
  ) {
    const apiKey = process.env.AI_API_KEY || process.env.GEMINI_API_KEY || '';

    let result: {
      message: string;
      extractedData: any;
      nextField: string;
      conversationState: string;
    };

    if (!apiKey) {
      result = await this.processDeterministicFallback(body);
    } else {
      try {
        result = await this.callGeminiAI(body, apiKey);
      } catch (e) {
        // Fall back to deterministic flow on AI execution error
        result = await this.processDeterministicFallback(body);
      }
    }

    // Progressively stream result.message to client (typing speed emulation)
    const text = result.message;
    const chunkSize = 3; // stream 3 characters at a time
    for (let i = 0; i < text.length; i += chunkSize) {
      const chunk = text.slice(i, i + chunkSize);
      res.write(chunk);
      // Brief sleep delay for organic typewriter pacing (approx 20-30ms)
      await new Promise((resolve) => setTimeout(resolve, 25));
    }

    // Append metadata block at the very end
    res.write(
      `\n\n[METADATA]\n${JSON.stringify({
        extractedData: result.extractedData,
        nextField: result.nextField,
        conversationState: result.conversationState,
      })}`,
    );

    res.end();
  }

  private async callGeminiAI(
    body: {
      messages: Message[];
      currentField: string;
      formData: ApplicationDraft;
      message: string;
    },
    apiKey: string,
  ) {
    const { messages, formData, message } = body;

    // Fetch active services & campaign settings
    const activeServices = await this.prisma.service.findMany({
      where: { isActive: true, deletedAt: null },
      orderBy: { displayOrder: 'asc' },
    });

    const settings = await this.prisma.campaignSettings.findUnique({
      where: { id: 'default' },
    });

    const campaignTitle = settings?.campaignTitle || 'Your business could be our next Digital Pilot.';
    const campaignSubtitle = settings?.campaignSubtitle || 'Each month, Yuktron selects one business for a Digital Pilot.';
    const offerMessage = settings?.offerMessage || 'Selected businesses receive the pilot at no project cost.';
    const supportingMessage = settings?.supportingMessage || 'Selected businesses receive the pilot at no project cost.';

    const servicesStr = activeServices
      .map(
        (s: any) =>
          `- ${s.name}: ${s.shortDescription}. AI Context: ${s.aiContext || s.description}`
      )
      .join('\n');

    const serviceNames = activeServices.length > 0
      ? activeServices.map((s: any) => s.name)
      : ['Website Development', 'Small Business CRM', 'Business Automation', 'Booking System'];

    // Convert history to Gemini format (user/model roles)
    const contents = messages.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.text }],
    }));

    // Append current user message
    contents.push({
      role: 'user',
      parts: [{ text: message }],
    });

    const systemInstruction = `You are NIJAX, the warm, professional, and intelligent AI assistant of Yuktron.
You are talking with a business owner naturally to understand their business suitability for our monthly Digital Pilot program.
This should feel like a premium, intelligent conversation, NOT a basic form or a scripted chatbot interview.

Campaign Guidelines:
- Title: ${campaignTitle}
- Subtitle: ${campaignSubtitle}
- Opportunity Messaging: ${offerMessage}. ${supportingMessage}
- CRITICAL: Never use cheap words like "₹0", "FREE WEBSITE", "FREE SERVICE", "CHEAP", or "DISCOUNT". Always frame it as a premium opportunity with selection and scarcity.

Active Services Available (Recommend only these active services):
${servicesStr}

Conversation Flow Guidelines:
1. Casual Conversation:
   - If the user sends casual messages (e.g. "Hi", "Hello", "How are you?", "What is this?", "Who are you?"), respond naturally and conversationally in a warm, welcoming tone.
   - Do NOT force application questions or extract fields from casual pleasantries.
   - Example user: "Hi" -> Response: "Hey! 👋 Welcome to Yuktron Digital Pilot. I'm NIJAX. Tell me a little about your business and what you'd like to improve."
   - Example user: "How are you?" -> Response: "I'm doing great! 😄 Ready to learn about your business. What do you do?"

2. Application Information & Extraction:
   - Extract fields naturally: businessName, businessType, location, businessChallenge (core problem), requestedSolution (must map to one of active services), applicantName, email, phone, applicantDesignation, referralSource.
   - If the user provides multiple details in one go (e.g., "I'm Arun. I run Sri Lakshmi Bakery in Chennai..."), extract ALL of them and do not ask for them again.
   - Avoid duplicate questions. If a field is already known, skip it.

3. Adaptive & Minimal Questions:
   - Check the known fields in the context. Ask ONLY for missing information.
   - Keep exchanges short and sweet (1-3 sentences).
   - Target 3-5 conversational exchanges total for the whole application.

4. Early Completion & Review:
   - Once you have the essential fields (Business details, location, challenge, name, email, phone), transition to the summary immediately.
   - Transition to review by setting nextField to "review" and conversationState to "REVIEW", outputting a warm summary message.

Current Extracted Context:
${JSON.stringify(formData, null, 2)}
`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents,
          systemInstruction: {
            parts: [{ text: systemInstruction }],
          },
          generationConfig: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: 'OBJECT',
              properties: {
                message: {
                  type: 'STRING',
                  description: 'The natural language assistant response. Keep it conversational, warm, and between 1-3 short sentences. Acknowledge user input and ask the next logical question or follow-up.'
                },
                extractedData: {
                  type: 'OBJECT',
                  description: 'A flat JSON object containing newly extracted fields from the user\'s response. Only include fields actually provided or corrected.',
                  properties: {
                    businessName: { type: 'STRING' },
                    businessType: { type: 'STRING' },
                    requestedSolution: {
                      type: 'STRING',
                      enum: serviceNames,
                      description: 'The name of the active service requested by the user, if mentioned.'
                    },
                    businessChallenge: { type: 'STRING' },
                    targetAudience: { type: 'STRING' },
                    location: { type: 'STRING' },
                    applicantName: { type: 'STRING' },
                    applicantDesignation: { type: 'STRING' },
                    email: { type: 'STRING' },
                    phone: { type: 'STRING' },
                    referralSource: { type: 'STRING' }
                  }
                },
                nextField: {
                  type: 'STRING',
                  description: 'The next structured field to focus on. Set to "review" when all core fields are successfully collected or enough information exists.',
                  enum: ['businessName', 'businessType', 'requestedSolution', 'businessChallenge', 'targetAudience', 'location', 'applicantName', 'applicantDesignation', 'email', 'phone', 'referralSource', 'review']
                },
                conversationState: {
                  type: 'STRING',
                  description: 'The current state of the conversation machine.',
                  enum: ['WELCOME', 'DISCOVERY', 'BUSINESS_DETAILS', 'CURRENT_PROCESS', 'CURRENT_PROBLEM', 'DESIRED_OUTCOME', 'SOLUTION_REQUIREMENT', 'CONTACT_DETAILS', 'REVIEW', 'CONFIRMATION']
                }
              },
              required: ['message', 'extractedData', 'nextField', 'conversationState']
            }
          }
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini API returned status ${response.status}`);
    }

    const json = await response.json();
    if (json.candidates && json.candidates[0]?.content?.parts[0]?.text) {
      const parsed = JSON.parse(json.candidates[0].content.parts[0].text);
      return parsed;
    }

    throw new Error('Malformed Gemini response format');
  }

  // ----------------------------------------------------
  // CONDENSED DETERMINISTIC FALLBACK SYSTEM
  // ----------------------------------------------------

  private async processDeterministicFallback(body: {
    currentField: string;
    formData: ApplicationDraft;
    message: string;
  }) {
    const { currentField, formData, message } = body;
    const value = message.trim();

    // Handle casual inputs in welcome state
    const lowercaseMsg = value.toLowerCase();
    if (lowercaseMsg === 'hi' || lowercaseMsg === 'hello' || lowercaseMsg === 'hey') {
      return {
        message: "Hey! 👋 Welcome to Yuktron Digital Pilot. I'm NIJAX. Tell me a little about your business and what you'd like to improve.",
        extractedData: {},
        nextField: 'businessName',
        conversationState: 'WELCOME',
      };
    }
    if (lowercaseMsg.includes('how are you')) {
      return {
        message: "I'm doing great! 😄 Ready to learn about your business. What is your business name?",
        extractedData: {},
        nextField: 'businessName',
        conversationState: 'WELCOME',
      };
    }

    if (currentField === 'businessName') {
      if (value.length < 2) {
        return {
          message: 'I need at least two characters for the business name. Could you give me the full business name?',
          extractedData: {},
          nextField: 'businessName',
          conversationState: 'BUSINESS_DETAILS',
        };
      }
      return {
        message: `Got it! What type of business is ${value} and where are you located?`,
        extractedData: { businessName: value },
        nextField: 'businessType',
        conversationState: 'BUSINESS_DETAILS',
      };
    }

    if (currentField === 'businessType') {
      if (value.length < 2) {
        return {
          message: 'Please tell me what your business does and where you are located.',
          extractedData: {},
          nextField: 'businessType',
          conversationState: 'BUSINESS_DETAILS',
        };
      }
      // Infer location name if mentioned
      let loc = 'Chennai';
      const lowercase = value.toLowerCase();
      const areas = ['adyar', 'avadi', 't-nagar', 'poonamallee', 'velachery', 'anna nagar', 'mylapore', 'tambaram', 'guindy'];
      for (const area of areas) {
        if (lowercase.includes(area)) {
          loc = `${area.charAt(0).toUpperCase() + area.slice(1)}, Chennai`;
          break;
        }
      }

      return {
        message: 'Excellent. What is the single biggest operational bottleneck you face, and what would you like us to build?',
        extractedData: { businessType: value, location: loc },
        nextField: 'businessChallenge',
        conversationState: 'CURRENT_PROBLEM',
      };
    }

    if (currentField === 'businessChallenge') {
      if (value.length < 10) {
        return {
          message: 'I need a bit more detail about the challenge you are facing (at least 10 characters). Could you tell me a little more?',
          extractedData: {},
          nextField: 'businessChallenge',
          conversationState: 'CURRENT_PROBLEM',
        };
      }
      
      // Semantically detect requested solution matching active database services
      const active = await this.prisma.service.findMany({
        where: { isActive: true, deletedAt: null },
      });
      let sol = active.length > 0 ? active[0].name : 'Website Development';
      const lowercase = value.toLowerCase();
      for (const s of active) {
        if (lowercase.includes(s.name.toLowerCase()) || lowercase.includes(s.slug.toLowerCase())) {
          sol = s.name;
          break;
        }
      }

      return {
        message: 'Introduce yourself! What is your full name and designation/role?',
        extractedData: {
          businessChallenge: value,
          requestedSolution: sol,
          targetAudience: 'General Customers',
        },
        nextField: 'applicantName',
        conversationState: 'CONTACT_DETAILS',
      };
    }

    if (currentField === 'applicantName') {
      if (value.length < 2) {
        return {
          message: 'Could you tell me your name and designation? (At least 2 characters)',
          extractedData: {},
          nextField: 'applicantName',
          conversationState: 'CONTACT_DETAILS',
        };
      }

      // Detect designation
      let desig = 'Founder';
      const lowercase = value.toLowerCase();
      if (lowercase.includes('owner')) desig = 'Owner';
      else if (lowercase.includes('ceo')) desig = 'CEO';
      else if (lowercase.includes('founder')) desig = 'Founder';
      else if (lowercase.includes('manager')) desig = 'Manager';

      return {
        message: 'Got it. What is your email address and mobile phone number?',
        extractedData: { applicantName: value, applicantDesignation: desig },
        nextField: 'email',
        conversationState: 'CONTACT_DETAILS',
      };
    }

    if (currentField === 'email' || currentField === 'phone') {
      const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
      const phoneRegex = /[6-9]\d{9}/;

      const emailMatch = value.match(emailRegex);
      const phoneMatch = value.match(phoneRegex);

      if (!emailMatch || !phoneMatch) {
        return {
          message: 'I need both a valid email address and a 10-digit mobile number starting with 6-9 so we can reach you. Could you provide them?',
          extractedData: {},
          nextField: 'email',
          conversationState: 'CONTACT_DETAILS',
        };
      }

      return {
        message: "Let's make sure I've got everything right. Here is your application summary:",
        extractedData: {
          email: emailMatch[0],
          phone: phoneMatch[0],
          referralSource: 'Direct Search',
        },
        nextField: 'review',
        conversationState: 'REVIEW',
      };
    }

    return {
      message: "Let's make sure I've got everything right. Here is your application summary:",
      extractedData: {},
      nextField: 'review',
      conversationState: 'REVIEW',
    };
  }
}
