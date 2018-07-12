'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.listSync = exports.readSync = exports.list = exports.read = undefined;

var _promise = require('babel-runtime/core-js/promise');

var _promise2 = _interopRequireDefault(_promise);

var _gracefulFs = require('graceful-fs');

var _gracefulFs2 = _interopRequireDefault(_gracefulFs);

var _path = require('path');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var dir = (0, _path.join)(__dirname, 'files');
var getPath = function getPath(id) {
  return (0, _path.join)(dir, id + '.geojson');
};

var fin = function fin(resolve, reject, cb) {
  return function (err, res) {
    if (err) {
      reject(err);
      if (cb) cb(err);
      return;
    }
    resolve(res);
    if (cb) cb(null, res);
  };
};

var read = exports.read = function read(id, cb) {
  return new _promise2.default(function (resolve, reject) {
    var done = fin(resolve, reject, cb);
    _gracefulFs2.default.readFile(getPath(id), function (err, d) {
      if (err) return done(err);
      done(null, JSON.parse(d));
    });
  });
};

var list = exports.list = function list(cb) {
  return new _promise2.default(function (resolve, reject) {
    var done = fin(resolve, reject, cb);
    _gracefulFs2.default.readdir(dir, function (err, res) {
      if (err) return done(err);
      var ids = res.map(function (f) {
        return (0, _path.basename)(f, (0, _path.extname)(f));
      });
      done(null, ids);
    });
  });
};

var readSync = exports.readSync = function readSync(id) {
  return JSON.parse(_gracefulFs2.default.readFileSync(getPath(id)));
};

var listSync = exports.listSync = function listSync() {
  return _gracefulFs2.default.readdirSync(dir).map(function (f) {
    return (0, _path.basename)(f, (0, _path.extname)(f));
  });
};