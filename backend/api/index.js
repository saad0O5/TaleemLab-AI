/**
 * Vercel serverless wrapper for TaleemLab backend.
 * Imports the existing http.Server and dispatches requests to it.
 * No code duplication — the same server.js handles both local and serverless.
 */
const server = require('../server.js');

module.exports = function handler(req, res) {
  server.emit('request', req, res);
};
