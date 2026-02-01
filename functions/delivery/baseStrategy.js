/**
 * Base Strategy for Delivery
 * All delivery strategies (Email, LINE, SMS) should inherit from this.
 */
class BaseDeliveryStrategy {
    constructor(name) {
        this.name = name;
    }

    /**
     * Send content to a user
     * @param {Object} user User document from DB
     * @param {Object} deliveryData The content to send (html, text, checkInUrl)
     */
    async send(user, deliveryData) {
        throw new Error('send() method must be implemented by strategy subclass');
    }
}

module.exports = BaseDeliveryStrategy;
