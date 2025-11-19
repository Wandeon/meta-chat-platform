import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

export class TenantProvisioning {
  /**
   * Create a default tenant for a new user
   * This includes creating the tenant, generating an API key, and setting up a default workspace
   */
  async createDefaultTenant(adminId: string, companyName: string): Promise<{
    tenantId: string;
    apiKey: string;
  }> {
    try {
      // Create tenant
      const tenant = await prisma.tenant.create({
        data: {
          name: companyName,
          enabled: true,
          settings: {
            defaultLanguage: 'en',
            timezone: 'UTC',
          },
        },
      });

      // Generate API key
      const apiKeyData = await this.generateApiKey(tenant.id, 'Default API Key');

      console.log(`Tenant ${tenant.id} provisioned for admin ${adminId}`);

      return {
        tenantId: tenant.id,
        apiKey: apiKeyData.fullKey,
      };
    } catch (error) {
      console.error('Error provisioning tenant:', error);
      throw new Error('Failed to provision tenant');
    }
  }

  /**
   * Generate a secure API key for a tenant
   */
  private async generateApiKey(tenantId: string, label: string): Promise<{
    fullKey: string;
    keyId: string;
  }> {
    // Generate a random API key: prefix_randomString
    const prefix = 'mcp';
    const randomBytes = crypto.randomBytes(32).toString('hex'); // 64 character hex string
    const fullKey = `${prefix}_${randomBytes}`;

    // Generate salt and hash
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto
      .createHash('sha256')
      .update(fullKey + salt)
      .digest('hex');

    // Store only last 4 characters for display
    const lastFour = randomBytes.slice(-4);

    // Create API key record
    const apiKey = await prisma.tenantApiKey.create({
      data: {
        tenantId,
        label,
        prefix,
        hash,
        salt,
        lastFour,
        active: true,
      },
    });

    return {
      fullKey,
      keyId: apiKey.id,
    };
  }

  /**
   * Create default channel configuration for tenant
   */
  async createDefaultChannel(tenantId: string, channelType: string = 'webchat'): Promise<void> {
    try {
      await prisma.channel.create({
        data: {
          tenantId,
          type: channelType,
          enabled: true,
          config: {
            name: 'Default Web Chat',
            theme: {
              primaryColor: '#0066cc',
              fontFamily: 'Arial, sans-serif',
            },
          },
        },
      });

      console.log(`Default ${channelType} channel created for tenant ${tenantId}`);
    } catch (error) {
      console.error('Error creating default channel:', error);
      // Don't throw - channel creation is optional
    }
  }

  /**
   * Setup complete tenant with all defaults
   */
  async setupCompleteTenant(adminId: string, companyName: string): Promise<{
    tenantId: string;
    apiKey: string;
  }> {
    const { tenantId, apiKey } = await this.createDefaultTenant(adminId, companyName);

    // Create default web chat channel
    await this.createDefaultChannel(tenantId, 'webchat');

    return { tenantId, apiKey };
  }
}

// Singleton instance
export const tenantProvisioning = new TenantProvisioning();
