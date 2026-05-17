const fcmTokenService = require('./notification/fcmTokenService');
const fcmDeliveryService = require('./notification/fcmDeliveryService');

module.exports = {
  ...fcmTokenService,
  ...fcmDeliveryService,
};
