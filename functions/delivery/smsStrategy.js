const BaseDeliveryStrategy = require('./baseStrategy');

class SmsStrategy extends BaseDeliveryStrategy {
    constructor() {
        super('SMS');
    }

    async send(user, deliveryData) {
        const { targetOverride } = deliveryData;
        const target = targetOverride === 'emergency' ? 'Emergency' : 'Self';
        console.log(`[SmsStrategy] (STUB) Sending to ${user.name} via Twilio/etc. (Target: ${target})`);
        // Future implementation: call SMS provider API
        return { success: true, message: `SMS delivery to ${target} simulated` };
    }
}

module.exports = SmsStrategy;
