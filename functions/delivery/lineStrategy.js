const BaseDeliveryStrategy = require('./baseStrategy');

class LineStrategy extends BaseDeliveryStrategy {
    constructor() {
        super('LINE');
    }

    async send(user, deliveryData) {
        const { targetOverride } = deliveryData;
        const target = targetOverride === 'emergency' ? 'Emergency' : 'Self';
        console.log(`[LineStrategy] (STUB) Sending to ${user.name} via Messaging API (Target: ${target})`);
        // Future implementation: fetch LINE user ID and call Messaging API
        return { success: true, message: `LINE delivery to ${target} simulated` };
    }
}

module.exports = LineStrategy;
