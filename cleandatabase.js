const cron = require('node-cron');
const pool = require("./db");
const dotenv = require("dotenv")
dotenv.config();


async function cleanupExpiredRows() {
    try {
        const result = await pool.query('DELETE FROM emailverify WHERE expires_at < NOW()');
        console.log('Expired rows cleaned up successfully:', result.rowCount, 'rows deleted');

    } catch (error) {
        console.error('Error cleaning up expired rows:', error.message);
    }
}

cron.schedule('0 0 * * *', () => {
    cleanupExpiredRows();
})