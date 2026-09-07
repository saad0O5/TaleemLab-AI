/**
 * Vercel catch-all serverless handler for the TaleemLab backend.
 *
 * Vercel routes every `/api/<name>` request here. We rebuild the real path
 * (from the `slug` wildcard) onto req.url and hand the request to the existing
 * http server in ../server.js — no route duplication.
 */
const server = require('../server.js');

module.exports = function handler(req, res) {
  const slug = req.query && req.query.slug;
  if (Array.isArray(slug)) {
    req.url = '/api/' + slug.join('/');
  }
  server.emit('request', req, res);
};
