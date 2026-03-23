const pool = require('./db'); // your database connection
const jwt = require('jsonwebtoken');

// your existing verifyToken
const verifyToken = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token provided' });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.userId = decoded.userId;
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Invalid token' });
    }
};

// new verifyRole middleware
const verifyRole = (allowedRoles = []) => {
    return async (req, res, next) => {
        try {
            await verifyToken(req, res, async () => {
                const userId = req.userId;
                const result = await pool.query(
                    'SELECT role FROM forumusers WHERE users_id = $1',
                    [userId]
                );

                if (!result.rows[0]) {
                    return res.status(404).json({ error: 'User not found' });
                }

                const userRole = result.rows[0].role;
                if (!allowedRoles.includes(userRole)) {
                    return res.status(403).json({ error: 'Access denied' });
                }

                next();
            });
        } catch (err) {
            console.error('Role verification error:', err);
            return res.status(500).json({ error: 'Internal server error' });
        }
    };
};

module.exports = {
    verifyToken,
    verifyRole
};