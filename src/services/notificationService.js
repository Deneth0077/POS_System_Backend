const { Receipt } = require('../models');

/**
 * Notification Service for SMS and Email delivery
 * Provides integration points for third-party services
 */
class NotificationService {
  /**
   * Send SMS notification
   * Integration placeholder - requires SMS gateway setup
   */
  static async sendSMS(phoneNumber, message, metadata = {}) {
    console.log('SMS Service - Send SMS requested');
    console.log('Phone:', phoneNumber);
    console.log('Message:', message.substring(0, 100) + '...');

    try {
      // TODO: Integrate with SMS gateway (e.g., Twilio, Dialog SMS API, etc.)
      // Example integration:
      // const result = await smsGateway.send({
      //   to: phoneNumber,
      //   message: message,
      //   from: process.env.SMS_SENDER_ID
      // });

      // For now, simulate successful send
      const simulatedResult = {
        success: true,
        messageId: `SMS-${Date.now()}`,
        timestamp: new Date(),
        status: 'sent',
        provider: 'simulated'
      };

      console.log('SMS sent successfully (simulated):', simulatedResult.messageId);
      
      return simulatedResult;
    } catch (error) {
      console.error('Error sending SMS:', error);
      throw new Error(`SMS delivery failed: ${error.message}`);
    }
  }

  /**
   * Send Email notification
   * Integration placeholder - requires email service setup
   */
  static async sendEmail(emailAddress, subject, htmlContent, textContent, metadata = {}) {
    console.log('Email Service - Send Email requested');
    console.log('To:', emailAddress);
    console.log('Subject:', subject);

    try {
      // TODO: Integrate with email service (e.g., SendGrid, AWS SES, Nodemailer, etc.)
      // Example integration with Nodemailer:
      // const transporter = nodemailer.createTransport({
      //   host: process.env.SMTP_HOST,
      //   port: process.env.SMTP_PORT,
      //   secure: true,
      //   auth: {
      //     user: process.env.SMTP_USER,
      //     pass: process.env.SMTP_PASSWORD
      //   }
      // });
      //
      // const result = await transporter.sendMail({
      //   from: process.env.EMAIL_FROM,
      //   to: emailAddress,
      //   subject: subject,
      //   html: htmlContent,
      //   text: textContent
      // });

      // For now, simulate successful send
      const simulatedResult = {
        success: true,
        messageId: `EMAIL-${Date.now()}`,
        timestamp: new Date(),
        status: 'sent',
        provider: 'simulated'
      };

      console.log('Email sent successfully (simulated):', simulatedResult.messageId);
      
      return simulatedResult;
    } catch (error) {
      console.error('Error sending email:', error);
      throw new Error(`Email delivery failed: ${error.message}`);
    }
  }

  /**
   * Send receipt via SMS
   */
  static async sendReceiptSMS(receiptId, phoneNumber) {
    const receipt = await Receipt.findByPk(receiptId);
    
    if (!receipt) {
      throw new Error('Receipt not found');
    }

    if (!phoneNumber) {
      throw new Error('Phone number is required');
    }

    // Validate phone number format (basic validation)
    const phoneRegex = /^[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,9}$/;
    if (!phoneRegex.test(phoneNumber)) {
      throw new Error('Invalid phone number format');
    }

    try {
      // Update receipt status
      await receipt.update({
        deliveryMethod: phoneNumber,
        deliveryStatus: 'pending',
        deliveryAttempts: receipt.deliveryAttempts + 1
      });

      // Generate SMS message (shortened for SMS)
      const smsMessage = this.generateSMSMessage(receipt);

      // Send SMS
      const result = await this.sendSMS(phoneNumber, smsMessage, {
        receiptId: receipt.id,
        receiptNumber: receipt.receiptNumber
      });

      // Update receipt status based on result
      await receipt.update({
        deliveryStatus: result.success ? 'sent' : 'failed',
        deliveredAt: result.success ? new Date() : null,
        errorMessage: result.success ? null : result.error,
        metadata: {
          ...receipt.metadata,
          smsResult: result
        }
      });

      return {
        success: result.success,
        receipt,
        deliveryInfo: result
      };
    } catch (error) {
      // Update receipt with error
      await receipt.update({
        deliveryStatus: 'failed',
        errorMessage: error.message
      });

      throw error;
    }
  }

  /**
   * Send receipt via Email
   */
  static async sendReceiptEmail(receiptId, emailAddress, includeAttachment = false) {
    const receipt = await Receipt.findByPk(receiptId);
    
    if (!receipt) {
      throw new Error('Receipt not found');
    }

    if (!emailAddress) {
      throw new Error('Email address is required');
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailAddress)) {
      throw new Error('Invalid email address format');
    }

    try {
      // Update receipt status
      await receipt.update({
        deliveryMethod: emailAddress,
        deliveryStatus: 'pending',
        deliveryAttempts: receipt.deliveryAttempts + 1
      });

      // Generate email content
      const { subject, htmlContent, textContent } = this.generateEmailContent(receipt);

      // Send email
      const result = await this.sendEmail(emailAddress, subject, htmlContent, textContent, {
        receiptId: receipt.id,
        receiptNumber: receipt.receiptNumber,
        includeAttachment
      });

      // Update receipt status based on result
      await receipt.update({
        deliveryStatus: result.success ? 'sent' : 'failed',
        deliveredAt: result.success ? new Date() : null,
        errorMessage: result.success ? null : result.error,
        metadata: {
          ...receipt.metadata,
          emailResult: result
        }
      });

      return {
        success: result.success,
        receipt,
        deliveryInfo: result
      };
    } catch (error) {
      // Update receipt with error
      await receipt.update({
        deliveryStatus: 'failed',
        errorMessage: error.message
      });

      throw error;
    }
  }

  /**
   * Generate SMS message from receipt
   */
  static generateSMSMessage(receipt) {
    const data = receipt.receiptData;
    const template = data.template;
    
    let message = `${template.companyInfo.name}\n`;
    message += `Receipt: ${receipt.receiptNumber}\n`;
    message += `Sale: ${data.sale.saleNumber}\n`;
    message += `Date: ${template.receiptInfo.date} ${template.receiptInfo.time}\n`;
    message += `Total: ${template.calculations.total.amount}\n`;
    message += `Payment: ${template.paymentInfo.method.value}\n`;
    message += `${template.footer.thankYou}`;

    return message;
  }

  /**
   * Generate email content from receipt
   */
  static generateEmailContent(receipt) {
    const data = receipt.receiptData;
    const template = data.template;
    
    const subject = `Receipt ${receipt.receiptNumber} - ${template.companyInfo.name}`;
    
    // HTML content (full receipt HTML)
    const ReceiptService = require('./receiptService');
    const htmlContent = ReceiptService.templateToHTML(template);
    
    // Plain text content
    const textContent = ReceiptService.templateToPlainText(template);

    return {
      subject,
      htmlContent,
      textContent
    };
  }

  /**
   * Retry failed delivery
   */
  static async retryDelivery(receiptId) {
    const receipt = await Receipt.findByPk(receiptId);
    
    if (!receipt) {
      throw new Error('Receipt not found');
    }

    if (receipt.deliveryStatus === 'sent' || receipt.deliveryStatus === 'delivered') {
      throw new Error('Receipt already delivered successfully');
    }

    if (!receipt.deliveryMethod) {
      throw new Error('No delivery method specified');
    }

    // Check max retry attempts
    const MAX_RETRIES = 3;
    if (receipt.deliveryAttempts >= MAX_RETRIES) {
      throw new Error(`Maximum retry attempts (${MAX_RETRIES}) exceeded`);
    }

    // Determine format and retry
    if (receipt.format === 'sms') {
      return await this.sendReceiptSMS(receipt.id, receipt.deliveryMethod);
    } else if (receipt.format === 'email') {
      return await this.sendReceiptEmail(receipt.id, receipt.deliveryMethod);
    } else {
      throw new Error('Receipt format does not support digital delivery retry');
    }
  }

  /**
   * Get delivery status
   */
  static async getDeliveryStatus(receiptId) {
    const receipt = await Receipt.findByPk(receiptId);
    
    if (!receipt) {
      throw new Error('Receipt not found');
    }

    return {
      receiptNumber: receipt.receiptNumber,
      format: receipt.format,
      deliveryMethod: receipt.deliveryMethod,
      deliveryStatus: receipt.deliveryStatus,
      deliveryAttempts: receipt.deliveryAttempts,
      deliveredAt: receipt.deliveredAt,
      errorMessage: receipt.errorMessage,
      metadata: receipt.metadata
    };
  }

  /**
   * Send bulk receipts (for batch processing)
   */
  static async sendBulkReceipts(receipts) {
    const results = [];
    
    for (const receiptConfig of receipts) {
      try {
        let result;
        
        if (receiptConfig.format === 'sms') {
          result = await this.sendReceiptSMS(receiptConfig.receiptId, receiptConfig.deliveryMethod);
        } else if (receiptConfig.format === 'email') {
          result = await this.sendReceiptEmail(receiptConfig.receiptId, receiptConfig.deliveryMethod);
        } else {
          result = {
            success: false,
            error: 'Unsupported format for digital delivery'
          };
        }
        
        results.push({
          receiptId: receiptConfig.receiptId,
          ...result
        });
      } catch (error) {
        results.push({
          receiptId: receiptConfig.receiptId,
          success: false,
          error: error.message
        });
      }
    }

    return results;
  }
}

module.exports = NotificationService;
