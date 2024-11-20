const { updateCompletedBookings, updateExpiredRefundsToAdmin } = require("../services/order.service");
const cron = require("node-cron");

// Schedule to run daily at midnight
cron.schedule("0 0 * * *", async () => {
    try {
        console.log("Running cron job to update completed bookings...");
        await updateCompletedBookings();
        console.log("Completed bookings status updated.");

        console.log("Running cron job to update expired refunds...");
        await updateExpiredRefundsToAdmin();
        console.log("Checked and updated expired refunds to admin status.");
    } catch (error) {
        console.error("Error running cron jobs:", error);
    }
});
