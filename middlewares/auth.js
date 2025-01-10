const jwt = require('jsonwebtoken'); // For JWT-based authentication

const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET); // Replace with your JWT secret
    req.user = decoded.userId; // Attach user ID to the request object
    next();
  } catch (error) {
    console.error(error);
    res.status(403).json({ success: false, message: 'Invalid token' });
  }
};

module.exports = {
  verifyToken,
};