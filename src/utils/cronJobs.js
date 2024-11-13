const { updateExpiredRefundsToAdmin } = require('../services/order.service');
const cron = require('node-cron');

cron.schedule('0 0 * * *', async () => {  // Runs every day at midnight
    try {
        await updateExpiredRefundsToAdmin();
        console.log("Checked and updated expired refunds to admin status.");
    } catch (error) {
        console.error("Error updating expired refunds:", error);
    }
});
