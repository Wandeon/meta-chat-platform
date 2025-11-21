import crypto from 'crypto';

/**
 * Timing-safe signature verification for webhooks
 * 
 * Uses crypto.timingSafeEqual() to prevent timing attacks where
 * an attacker could determine the correct signature by measuring
 * how long the comparison takes.
 * 
 * @param payload - The raw payload string/buffer
 * @param signature - The signature to verify (hex encoded)
 * @param secret - The secret key for HMAC
 * @param algorithm - HMAC algorithm (default: sha256)
 * @returns true if signature is valid, false otherwise
 */
export function verifyWebhookSignature(
  payload: string | Buffer,
  signature: string,
  secret: string,
  algorithm: string = 'sha256'
): boolean {
  if (!payload || !signature || !secret) {
    return false;
  }

  try {
    // Calculate expected signature
    const hmac = crypto.createHmac(algorithm, secret);
    hmac.update(payload);
    const expectedSignature = hmac.digest('hex');
    
    // Convert both signatures to buffers for comparison
    const signatureBuffer = Buffer.from(signature, 'hex');
    const expectedBuffer = Buffer.from(expectedSignature, 'hex');
    
    // Both buffers must be same length for timingSafeEqual
    if (signatureBuffer.length !== expectedBuffer.length) {
      return false;
    }
    
    // Constant-time comparison prevents timing attacks
    return crypto.timingSafeEqual(signatureBuffer, expectedBuffer);
  } catch (error) {
    // Invalid hex string or other error
    return false;
  }
}

/**
 * Verify WhatsApp webhook signature
 * WhatsApp sends signature in format: sha256=<hex_signature>
 * 
 * @param payload - Raw request body
 * @param signature - Value from X-Hub-Signature-256 header
 * @param secret - Webhook secret from WhatsApp app settings
 * @returns true if signature is valid
 */
export function verifyWhatsAppSignature(
  payload: string | Buffer,
  signature: string,
  secret: string
): boolean {
  // WhatsApp sends: sha256=<signature>
  const sig = signature.replace(/^sha256=/, '');
  return verifyWebhookSignature(payload, sig, secret, 'sha256');
}

/**
 * Verify Messenger webhook signature
 * Messenger sends signature in format: sha1=<hex_signature>
 * 
 * @param payload - Raw request body
 * @param signature - Value from X-Hub-Signature header
 * @param appSecret - App secret from Messenger app settings
 * @returns true if signature is valid
 */
export function verifyMessengerSignature(
  payload: string | Buffer,
  signature: string,
  appSecret: string
): boolean {
  // Messenger sends: sha1=<signature>
  const sig = signature.replace(/^sha1=/, '');
  return verifyWebhookSignature(payload, sig, appSecret, 'sha1');
}

/**
 * Verify Stripe webhook signature
 * Stripe uses a more complex signature scheme with timestamp
 * 
 * @param payload - Raw request body
 * @param signature - Value from Stripe-Signature header
 * @param secret - Webhook signing secret from Stripe dashboard
 * @returns true if signature is valid
 */
export function verifyStripeSignature(
  payload: string | Buffer,
  signature: string,
  secret: string
): boolean {
  try {
    // Stripe signature format: t=timestamp,v1=signature
    const parts = signature.split(',');
    const timestamp = parts.find(p => p.startsWith('t='))?.substring(2);
    const sig = parts.find(p => p.startsWith('v1='))?.substring(3);
    
    if (!timestamp || !sig) {
      return false;
    }
    
    // Verify timestamp is within 5 minutes to prevent replay attacks
    const currentTime = Math.floor(Date.now() / 1000);
    const signatureTime = parseInt(timestamp, 10);
    if (Math.abs(currentTime - signatureTime) > 300) {
      return false;
    }
    
    // Construct signed payload: timestamp.payload
    const signedPayload = `${timestamp}.${payload}`;
    return verifyWebhookSignature(signedPayload, sig, secret, 'sha256');
  } catch (error) {
    return false;
  }
}
