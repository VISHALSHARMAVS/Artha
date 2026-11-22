import { Request, Response } from 'express';
import { WhatsAppParserService } from '../services/whatsapp-parser.service.js';
import { AuthService } from '../services/auth.service.js';
import { normalizePhoneNumber } from '../repositories/user.repository.js';

export class WhatsAppController {
  /**
   * Meta WhatsApp Cloud API Webhook Verification Handshake (GET)
   */
  static verifyWebhook(req: Request, res: Response): void {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    const expectedToken = process.env.WHATSAPP_VERIFY_TOKEN || 'artha_webhook_token';

    if (mode === 'subscribe' && token === expectedToken) {
      console.log('✅ Meta WhatsApp webhook verified successfully.');
      res.status(200).send(challenge);
      return;
    }

    res.status(403).json({ error: 'Forbidden. Verification token mismatch.' });
  }

  /**
   * Meta WhatsApp Cloud API Incoming Message Handler (POST)
   */
  static async handleWebhookMessage(req: Request, res: Response): Promise<void> {
    try {
      const body = req.body;

      // Meta sends events in entry[].changes[].value
      if (body.object === 'whatsapp_business_account' || body.entry) {
        const entry = body.entry?.[0];
        const changes = entry?.changes?.[0];
        const value = changes?.value;
        const messages = value?.messages;

        if (messages && messages.length > 0) {
          const msg = messages[0];
          const from = msg.from; // e.g. "919876543210"
          const messageText = msg.text?.body;

          if (from && messageText) {
            console.log(`📩 Incoming WhatsApp from +${from}: "${messageText}"`);
            const result = WhatsAppParserService.processIncomingMessage(from, messageText);
            
            // If Meta API credentials exist in environment, send reply back via Graph API
            await WhatsAppController.dispatchWhatsAppCloudMessage(from, result.replyMessage);

            res.status(200).json({ status: 'PROCESSED', result });
            return;
          }
        }
      }

      res.status(200).json({ status: 'ACKNOWLEDGED' });
    } catch (err: any) {
      console.error('❌ Error handling WhatsApp webhook message:', err);
      res.status(500).json({ error: 'Internal server error processing WhatsApp webhook' });
    }
  }

  /**
   * Link user's WhatsApp phone number to their Artha account.
   */
  static linkPhone(req: Request, res: Response): void {
    const userId = req.userId;
    const { phone_number } = req.body;

    if (!phone_number || typeof phone_number !== 'string') {
      res.status(400).json({ success: false, error: { message: 'phone_number is required and must be a string.' } });
      return;
    }

    try {
      const updatedUser = AuthService.linkWhatsApp(userId, phone_number);
      res.status(200).json({
        success: true,
        data: {
          message: 'WhatsApp phone number successfully linked to your Artha ledger.',
          user: updatedUser,
        },
      });
    } catch (err: any) {
      res.status(err.statusCode || 400).json({
        success: false,
        error: {
          message: err.message,
          code: err.code || 'PHONE_LINK_ERROR',
        },
      });
    }
  }

  /**
   * In-App Interactive WhatsApp Simulator Endpoint.
   * Enables immediate instant testing without requiring Meta API credentials or buying a SIM.
   */
  static simulateMessage(req: Request, res: Response): void {
    const userId = req.userId;
    const { message, phone_number } = req.body;

    if (!message || typeof message !== 'string') {
      res.status(400).json({ success: false, error: { message: 'message is required.' } });
      return;
    }

    // Determine phone number: either passed explicitly or looked up from authenticated user
    let senderPhone = phone_number ? normalizePhoneNumber(phone_number) : '';
    if (!senderPhone && userId) {
      const user = AuthService.getMe(userId);
      if (user.phone_number) {
        senderPhone = user.phone_number;
      }
    }

    if (!senderPhone) {
      senderPhone = '919876543210'; // Default sandbox number
    }

    const result = WhatsAppParserService.processIncomingMessage(senderPhone, message);
    res.status(200).json({
      success: true,
      data: {
        sender_phone: senderPhone,
        input_message: message,
        result,
      },
    });
  }

  /**
   * Get WhatsApp integration status and developer sandbox guide.
   */
  static getStatus(req: Request, res: Response): void {
    const userId = req.userId;
    const user = AuthService.getMe(userId);

    const protocol = req.protocol;
    const host = req.get('host') || 'localhost:3000';
    const webhookUrl = `${protocol}://${host}/api/v1/webhooks/whatsapp`;
    const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN || 'artha_webhook_token';

    res.status(200).json({
      success: true,
      data: {
        phone_number: user.phone_number || null,
        whatsapp_linked: Boolean(user.whatsapp_linked),
        webhook_url: webhookUrl,
        verify_token: verifyToken,
        sandbox_instructions: {
          steps: [
            'Go to developers.facebook.com and select your App > WhatsApp > API Setup',
            'Copy the free Test Phone Number provided by Meta (No SIM purchase needed)',
            'In Webhook Configuration, paste the Webhook URL and Verify Token shown above',
            'Send your first test message to the Meta sandbox number or use our in-app Simulator!',
          ],
        },
      },
    });
  }

  /**
   * Sends reply back to Meta WhatsApp Business Cloud API if credentials configured.
   */
  private static async dispatchWhatsAppCloudMessage(recipientPhone: string, text: string): Promise<void> {
    const token = process.env.WHATSAPP_CLOUD_API_TOKEN;
    const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;

    if (!token || !phoneId) {
      // In development / sandbox simulation mode, no external HTTP dispatch needed
      return;
    }

    try {
      await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: recipientPhone,
          type: 'text',
          text: { body: text },
        }),
      });
    } catch (error) {
      console.warn('⚠️ Meta Cloud API dispatch failed (check credentials):', error);
    }
  }
}
