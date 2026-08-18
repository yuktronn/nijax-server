import { Controller, Post, Body, Res } from '@nestjs/common';
import * as express from 'express';
import { ConversationService } from './conversation.service';

@Controller('pilot/conversation')
export class ConversationController {
  constructor(private readonly conversationService: ConversationService) {}

  @Post('message')
  async handleMessage(
    @Body() body: {
      messages: { role: 'user' | 'assistant'; text: string }[];
      currentField: string;
      formData: any;
      message: string;
    },
    @Res() res: express.Response,
  ) {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Transfer-Encoding', 'chunked');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    await this.conversationService.processAndStreamMessage(body, res);
  }
}
