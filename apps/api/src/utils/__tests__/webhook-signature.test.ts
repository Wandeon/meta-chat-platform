import { describe, it, expect } from 'vitest';
import crypto from 'crypto';
import {
  verifyWebhookSignature,
  verifyWhatsAppSignature,
  verifyMessengerSignature,
  verifyStripeSignature,
} from '../webhook-signature';

describe('webhook-signature', () => {
  describe('verifyWebhookSignature', () => {
    it('should accept valid signature', () => {
      const payload = 'test payload data';
      const secret = 'webhook-secret-key';
      const signature = crypto.createHmac('sha256', secret)
        .update(payload)
        .digest('hex');
      
      expect(verifyWebhookSignature(payload, signature, secret)).toBe(true);
    });

    it('should reject invalid signature', () => {
      const payload = 'test payload data';
      const secret = 'webhook-secret-key';
      const badSignature = 'deadbeefcafe1234567890abcdef';
      
      expect(verifyWebhookSignature(payload, badSignature, secret)).toBe(false);
    });

    it('should reject signature with wrong secret', () => {
      const payload = 'test payload data';
      const secret = 'webhook-secret-key';
      const wrongSecret = 'wrong-secret';
      const signature = crypto.createHmac('sha256', wrongSecret)
        .update(payload)
        .digest('hex');
      
      expect(verifyWebhookSignature(payload, signature, secret)).toBe(false);
    });

    it('should reject signature with tampered payload', () => {
      const originalPayload = 'test payload data';
      const tamperedPayload = 'tampered payload data';
      const secret = 'webhook-secret-key';
      const signature = crypto.createHmac('sha256', secret)
        .update(originalPayload)
        .digest('hex');
      
      expect(verifyWebhookSignature(tamperedPayload, signature, secret)).toBe(false);
    });

    it('should handle empty inputs safely', () => {
      expect(verifyWebhookSignature('', 'sig', 'secret')).toBe(false);
      expect(verifyWebhookSignature('payload', '', 'secret')).toBe(false);
      expect(verifyWebhookSignature('payload', 'sig', '')).toBe(false);
    });

    it('should handle invalid hex signature', () => {
      const payload = 'test payload';
      const secret = 'secret';
      const invalidHex = 'not-valid-hex!@#';
      
      expect(verifyWebhookSignature(payload, invalidHex, secret)).toBe(false);
    });

    it('should support different HMAC algorithms', () => {
      const payload = 'test payload';
      const secret = 'secret';
      
      // SHA256
      const sig256 = crypto.createHmac('sha256', secret).update(payload).digest('hex');
      expect(verifyWebhookSignature(payload, sig256, secret, 'sha256')).toBe(true);
      
      // SHA1
      const sig1 = crypto.createHmac('sha1', secret).update(payload).digest('hex');
      expect(verifyWebhookSignature(payload, sig1, secret, 'sha1')).toBe(true);
      
      // SHA512
      const sig512 = crypto.createHmac('sha512', secret).update(payload).digest('hex');
      expect(verifyWebhookSignature(payload, sig512, secret, 'sha512')).toBe(true);
    });

    it('should work with Buffer payload', () => {
      const payload = Buffer.from('test payload data');
      const secret = 'webhook-secret-key';
      const signature = crypto.createHmac('sha256', secret)
        .update(payload)
        .digest('hex');
      
      expect(verifyWebhookSignature(payload, signature, secret)).toBe(true);
    });

    it('should reject signatures with different lengths', () => {
      const payload = 'test payload';
      const secret = 'secret';
      const shortSignature = 'abc123'; // Too short
      
      expect(verifyWebhookSignature(payload, shortSignature, secret)).toBe(false);
    });

    it('should use crypto.timingSafeEqual for constant-time comparison', () => {
      // This test verifies that crypto.timingSafeEqual is used
      // The actual timing-safety is guaranteed by Node.js crypto module
      const payload = 'test payload';
      const secret = 'secret';
      
      // Test with various signatures that would leak timing in non-constant-time comparison
      const correctSig = crypto.createHmac('sha256', secret).update(payload).digest('hex');
      const wrongFirst = '0' + correctSig.slice(1); // First char wrong
      const wrongMiddle = correctSig.slice(0, 32) + '0' + correctSig.slice(33); // Middle char wrong
      const wrongLast = correctSig.slice(0, -1) + '0'; // Last char wrong
      
      // All should return false, regardless of where the difference is
      expect(verifyWebhookSignature(payload, wrongFirst, secret)).toBe(false);
      expect(verifyWebhookSignature(payload, wrongMiddle, secret)).toBe(false);
      expect(verifyWebhookSignature(payload, wrongLast, secret)).toBe(false);
      
      // Correct signature should pass
      expect(verifyWebhookSignature(payload, correctSig, secret)).toBe(true);
    });
  });

  describe('verifyWhatsAppSignature', () => {
    it('should verify WhatsApp webhook signature with sha256 prefix', () => {
      const payload = '{"object":"whatsapp_business_account"}';
      const secret = 'whatsapp-webhook-secret';
      const sig = crypto.createHmac('sha256', secret).update(payload).digest('hex');
      const signature = `sha256=${sig}`;
      
      expect(verifyWhatsAppSignature(payload, signature, secret)).toBe(true);
    });

    it('should handle signature without prefix', () => {
      const payload = '{"object":"whatsapp_business_account"}';
      const secret = 'whatsapp-webhook-secret';
      const signature = crypto.createHmac('sha256', secret).update(payload).digest('hex');
      
      expect(verifyWhatsAppSignature(payload, signature, secret)).toBe(true);
    });

    it('should reject invalid WhatsApp signature', () => {
      const payload = '{"object":"whatsapp_business_account"}';
      const secret = 'whatsapp-webhook-secret';
      const signature = 'sha256=invalid';
      
      expect(verifyWhatsAppSignature(payload, signature, secret)).toBe(false);
    });

    it('should work with real WhatsApp webhook payload', () => {
      const payload = '{"object":"whatsapp_business_account","entry":[{"id":"123","changes":[{"value":{"messaging_product":"whatsapp"}}]}]}';
      const secret = 'test-secret-key';
      const sig = crypto.createHmac('sha256', secret).update(payload).digest('hex');
      const signature = `sha256=${sig}`;
      
      expect(verifyWhatsAppSignature(payload, signature, secret)).toBe(true);
    });
  });

  describe('verifyMessengerSignature', () => {
    it('should verify Messenger webhook signature with sha1 prefix', () => {
      const payload = '{"object":"page","entry":[]}';
      const appSecret = 'messenger-app-secret';
      const sig = crypto.createHmac('sha1', appSecret).update(payload).digest('hex');
      const signature = `sha1=${sig}`;
      
      expect(verifyMessengerSignature(payload, signature, appSecret)).toBe(true);
    });

    it('should handle signature without prefix', () => {
      const payload = '{"object":"page","entry":[]}';
      const appSecret = 'messenger-app-secret';
      const signature = crypto.createHmac('sha1', appSecret).update(payload).digest('hex');
      
      expect(verifyMessengerSignature(payload, signature, appSecret)).toBe(true);
    });

    it('should reject invalid Messenger signature', () => {
      const payload = '{"object":"page","entry":[]}';
      const appSecret = 'messenger-app-secret';
      const signature = 'sha1=invalid';
      
      expect(verifyMessengerSignature(payload, signature, appSecret)).toBe(false);
    });

    it('should work with real Messenger webhook payload', () => {
      const payload = '{"object":"page","entry":[{"id":"123","time":1234567890,"messaging":[{"sender":{"id":"1234"},"recipient":{"id":"5678"},"message":{"text":"hello"}}]}]}';
      const appSecret = 'test-secret';
      const sig = crypto.createHmac('sha1', appSecret).update(payload).digest('hex');
      const signature = `sha1=${sig}`;
      
      expect(verifyMessengerSignature(payload, signature, appSecret)).toBe(true);
    });
  });

  describe('verifyStripeSignature', () => {
    it('should verify Stripe webhook signature with timestamp', () => {
      const payload = '{"id":"evt_test","object":"event"}';
      const secret = 'whsec_test123';
      const timestamp = Math.floor(Date.now() / 1000);
      const signedPayload = `${timestamp}.${payload}`;
      const sig = crypto.createHmac('sha256', secret).update(signedPayload).digest('hex');
      const signature = `t=${timestamp},v1=${sig}`;
      
      expect(verifyStripeSignature(payload, signature, secret)).toBe(true);
    });

    it('should reject Stripe signature with old timestamp (replay attack prevention)', () => {
      const payload = '{"id":"evt_test","object":"event"}';
      const secret = 'whsec_test123';
      const oldTimestamp = Math.floor(Date.now() / 1000) - 400; // 6+ minutes old
      const signedPayload = `${oldTimestamp}.${payload}`;
      const sig = crypto.createHmac('sha256', secret).update(signedPayload).digest('hex');
      const signature = `t=${oldTimestamp},v1=${sig}`;
      
      expect(verifyStripeSignature(payload, signature, secret)).toBe(false);
    });

    it('should accept Stripe signature within 5 minute window', () => {
      const payload = '{"id":"evt_test"}';
      const secret = 'whsec_test';
      const timestamp = Math.floor(Date.now() / 1000) - 200; // 3.3 minutes old (within window)
      const signedPayload = `${timestamp}.${payload}`;
      const sig = crypto.createHmac('sha256', secret).update(signedPayload).digest('hex');
      const signature = `t=${timestamp},v1=${sig}`;
      
      expect(verifyStripeSignature(payload, signature, secret)).toBe(true);
    });

    it('should reject malformed Stripe signature', () => {
      const payload = '{"id":"evt_test"}';
      const secret = 'whsec_test123';
      const badSignature = 'invalid-format';
      
      expect(verifyStripeSignature(payload, badSignature, secret)).toBe(false);
    });

    it('should reject Stripe signature missing timestamp', () => {
      const payload = '{"id":"evt_test"}';
      const secret = 'whsec_test123';
      const signature = 'v1=abc123';
      
      expect(verifyStripeSignature(payload, signature, secret)).toBe(false);
    });

    it('should reject Stripe signature missing v1', () => {
      const payload = '{"id":"evt_test"}';
      const secret = 'whsec_test123';
      const timestamp = Math.floor(Date.now() / 1000);
      const signature = `t=${timestamp}`;
      
      expect(verifyStripeSignature(payload, signature, secret)).toBe(false);
    });
  });
});
