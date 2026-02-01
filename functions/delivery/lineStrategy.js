const BaseDeliveryStrategy = require('./baseStrategy');

class LineStrategy extends BaseDeliveryStrategy {
    constructor() {
        super('LINE');
    }

    async send(user, deliveryData) {
        console.log(`[LineStrategy] (STUB) Sending to ${user.name} via Messaging API`);
        // Future implementation: fetch LINE user ID and call Messaging API
        return { success: true, message: 'LINE delivery simulated' };
    }
}

module.exports = LineStrategy;
