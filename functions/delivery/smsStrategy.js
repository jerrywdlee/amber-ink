const BaseDeliveryStrategy = require('./baseStrategy');

class SmsStrategy extends BaseDeliveryStrategy {
    constructor() {
        super('SMS');
    }

    async send(user, deliveryData) {
        console.log(`[SmsStrategy] (STUB) Sending to ${user.name} via Twilio/etc.`);
        // Future implementation: call SMS provider API
        return { success: true, message: 'SMS delivery simulated' };
    }
}

module.exports = SmsStrategy;
