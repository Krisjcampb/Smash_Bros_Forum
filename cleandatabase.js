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

async function unbanExpiredUsers() {
    try {
        const result = await pool.query(`
            UPDATE forumusers
            SET is_banned = FALSE
            FROM ban_log
            WHERE forumusers.user_id = ban_log.user_id
              AND ban_log.expires_at IS NOT NULL
              AND ban_log.expires_at < NOW()
              AND forumusers.is_banned = TRUE
        `);
        console.log('Users unbanned successfully:', result.rowCount, 'users unbanned');
    } catch (error) {
        console.error('Error unbanning users:', error.message);
    }
}

cron.schedule('0 0 * * *', () => {
    cleanupExpiredRows();
    unbanExpiredUsers();
})