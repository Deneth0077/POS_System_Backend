const crypto = require('crypto');
const PaymentTransaction = require('../models/PaymentTransaction');
const Sale = require('../models/Sale');
const { sequelize } = require('../config/database');

class PayHereService {
    constructor() {
        this.merchantId = process.env.PAYHERE_MERCHANT_ID;
        this.merchantSecret = process.env.PAYHERE_MERCHANT_SECRET;
        this.isSandbox = process.env.PAYHERE_IS_SANDBOX === 'true';
        this.baseUrl = this.isSandbox
            ? 'https://sandbox.payhere.lk/pay/checkout'
            : 'https://www.payhere.lk/pay/checkout';
    }

    /**
     * Generate MD5 hash for PayHere checkout
     */
    generateHash(orderId, amount, currency) {
        const secretHash = crypto.createHash('md5').update(this.merchantSecret).digest('hex').toUpperCase();

        // Amount must be formatted to 2 decimal places
        const formattedAmount = Number(amount).toLocaleString('en-us', { minimumFractionDigits: 2 }).replaceAll(',', '');

        const mainString = this.merchantId + orderId + formattedAmount + currency + secretHash;
        return crypto.createHash('md5').update(mainString).digest('hex').toUpperCase();
    }

    /**
     * Prepare data for PayHere form redirect
     */
    async prepareCheckoutData(data) {
        const {
            orderId,
            amount,
            currency = 'LKR',
            items,
            customerName,
            customerEmail,
            customerPhone,
            address = 'N/A',
            city = 'Colombo',
            country = 'Sri Lanka',
            metadata = {}
        } = data;

        const hash = this.generateHash(orderId, amount, currency);

        // Splitting name if only full name is provided
        const nameParts = customerName.split(' ');
        const firstName = nameParts[0] || 'Customer';
        const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : 'POS';

        return {
            sandbox: this.isSandbox,
            merchant_id: this.merchantId,
            return_url: `${process.env.CORS_ORIGIN}/payment/success`,
            cancel_url: `${process.env.CORS_ORIGIN}/payment/cancel`,
            notify_url: `${process.env.API_URL}/api/payments/payhere/notify`,
            order_id: orderId,
            items: items || 'POS Order',
            currency: currency,
            amount: parseFloat(amount).toFixed(2),
            first_name: firstName,
            last_name: lastName,
            email: customerEmail || 'customer@example.com',
            phone: customerPhone || '0000000000',
            address: address,
            city: city,
            country: country,
            hash: hash,
            custom_1: metadata.saleId || '',
            custom_2: metadata.kitchenOrderId || ''
        };
    }

    /**
     * Verify PayHere notification (Webhook/Notify URL)
     */
    async verifyNotification(notifyData) {
        const {
            merchant_id,
            order_id,
            payhere_amount,
            payhere_currency,
            status_code,
            md5sig,
            custom_1, // saleId
            custom_2  // kitchenOrderId
        } = notifyData;

        // Verify hash
        const secretHash = crypto.createHash('md5').update(this.merchantSecret).digest('hex').toUpperCase();
        const mainString = merchant_id + order_id + payhere_amount + payhere_currency + status_code + secretHash;
        const expectedHash = crypto.createHash('md5').update(mainString).digest('hex').toUpperCase();

        if (md5sig !== expectedHash) {
            throw new Error('Invalid signature');
        }

        // status_code: 2 is success
        if (status_code === '2' || status_code === 2) {
            const transactionRecord = await sequelize.transaction();
            try {
                // Check if Sale exists or create it
                let saleId = custom_1;
                let kitchenOrderId = custom_2;

                // Create transaction record
                const transactionId = `PAYHERE-${order_id}`;

                const [transaction, created] = await PaymentTransaction.findOrCreate({
                    where: { gatewayTransactionId: notifyData.payment_id },
                    defaults: {
                        transactionId: transactionId,
                        saleId: saleId || null,
                        paymentMethod: 'card',
                        amount: parseFloat(payhere_amount),
                        currency: payhere_currency,
                        status: 'completed',
                        transactionType: 'payment',
                        gatewayResponse: notifyData,
                        gatewayTransactionId: notifyData.payment_id,
                        receiptNumber: order_id,
                        processedAt: new Date()
                    },
                    transaction: transactionRecord
                });

                if (created) {
                    // Update Sale if exists
                    if (saleId) {
                        await Sale.update(
                            { paymentStatus: 'paid', paidAt: new Date(), paymentMethod: 'card' },
                            { where: { id: saleId }, transaction: transactionRecord }
                        );
                    }
                }

                await transactionRecord.commit();
                return { success: true, message: 'Payment recorded successfully', saleId, kitchenOrderId };
            } catch (error) {
                await transactionRecord.rollback();
                throw error;
            }
        }

        return { success: false, message: `Payment status: ${status_code}` };
    }
}

module.exports = new PayHereService();
