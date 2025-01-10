const path = require('path');

// Helper function to resolve asset paths
const asset = (...dirs) => {
  // Join all parts to create a relative path
  const relativePath = path.join(...dirs);

  // Return the full asset path (relative to `/assets`)
  return `/assets/${relativePath.replace(/\\/g, '/')}`; // Replace backslashes with forward slashes for web compatibility
};

module.exports = asset;
