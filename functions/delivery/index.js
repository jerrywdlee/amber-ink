const EmailStrategy = require('./emailStrategy');
const LineStrategy = require('./lineStrategy');
const SmsStrategy = require('./smsStrategy');

class DeliveryService {
    constructor() {
        this.strategies = {
            email: new EmailStrategy(),
            line: new LineStrategy(),
            sms: new SmsStrategy(),
        };
    }

    /**
     * Main send function that decides which strategy to use
     * @param {Object} user User document
     * @param {Object} deliveryData Content to send
     */
    async send(user, deliveryData) {
        // Determine method: user.contact_method or default to email
        const method = (user.contact_method || 'email').toLowerCase();

        // Fallback if strategy is not found
        const strategy = this.strategies[method] || this.strategies.email;

        console.log(`[DeliveryService] Dispatching via ${strategy.name} for user ${user.userId}`);
        return await strategy.send(user, deliveryData);
    }
}

module.exports = new DeliveryService();
