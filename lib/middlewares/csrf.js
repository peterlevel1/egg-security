'use strict';

const debug = require('debug')('egg-security:csrf');
const utils = require('../utils');

module.exports = function(options) {
  return function* csrf(next) {
    if (this.isAjax) {
      return yield next;
    }

    // ignore requests: get, head, options
    if (this.method === 'GET' ||
      this.method === 'HEAD' ||
      this.method === 'OPTIONS') {
      return yield next;
    }

    if (utils.checkIfIgnore(options, this.path)) {
      return yield next;
    }

    const body = this.request.body || {};
    debug('%s %s, got %j', this.method, this.url, body);

    try {
      this.assertCSRF(body);
    } catch (err) {
      debug('%s %s, error: %s', this.method, this.url, err.message);
      if (err.status === 403) {
        this.status = 403;
        const msg = err.message || 'invalid csrf token';
        if (msg === 'token is missing' && this.app.config.env === 'local') {
          const err = new Error('csrf token is missing when post');
          this.logger.error(err);
        } else {
          this.logger.warn(err);
        }
        if (this.accepts('html', 'text', 'json') === 'json') {
          this.body = {
            message: msg,
          };
        } else {
          this.body = msg;
        }
      } else {
        this.throw(err);
      }
      return '';
    }

    yield next;
  };
};