// core/router.js
const express = require('express');

class Router {
  constructor() {
    this.router = express.Router();
  }

  get(path, handler) {
    this.router.get(path, handler);
  }

  post(path, handler) {
    this.router.post(path, handler);
  }

  use() {
    return this.router;
  }
}

module.exports = Router;
