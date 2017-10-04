/*
  Writers and Searchers should throw errors of this class in order for
  the server to generate friendly, JSONAPI error responses.

  The arguments to this class are defined via
  http://jsonapi.org/format/#error-objects

*/

const { STATUS_CODES } = require('http');

class E extends Error {
  constructor(detail, { status, title, source} = {}) {
    super(detail);
    this.detail = detail;
    this.status = status || 500;
    this.title = title || STATUS_CODES[status];
    this.source = source;
    this.isCardstackError = true;
    this.additionalErrors = null;
  }
  toJSON() {
    return {
      title: this.title,
      detail: this.detail,
      code: this.status,
      source: this.source
    };
  }

  static async withJsonErrorHandling(ctxt, fn) {
    try {
      return await fn();
    } catch (err) {
      if (!err.isCardstackError) {
        throw err;
      }
      let errors = [err];
      if (err.additionalErrors) {
        errors = errors.concat(err.additionalErrors);
      }
      ctxt.body = { errors };
      ctxt.status = errors[0].status;
    }
  }
}
module.exports = E;
