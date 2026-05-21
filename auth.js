const pool = require('./db'); // database connection
const jwt = require('jsonwebtoken');

const verifyRole = (allowedRoles = []) => {
    return async (req, res, next) => {
        try {
            const result = await pool.query(
                'SELECT role FROM forumusers WHERE users_id = $1',
                [req.user.users_id]
            );

            if (!result.rows[0]) {
                return res.status(404).json({ error: 'User not found' });
            }

            if (!allowedRoles.includes(result.rows[0].role)) {
                return res.status(403).json({ error: 'Access denied' });
            }

            next();
        } catch (err) {
            console.error('Role verification error:', err);
            return res.status(500).json({ error: 'Internal server error' });
        }
    };
};

module.exports = {
    verifyRole
};