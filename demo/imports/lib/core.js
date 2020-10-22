import { Meteor } from 'meteor/meteor';

const Collections = {};
const _app = {
  conf: {
    maxFileSize: (Meteor.settings.public.maxFileSizeMb || 128) * 1000 * 1000,
    maxFilesQty: Meteor.settings.public.maxFilesQty || 6,
    fileTTL: (Meteor.settings.public.fileTTLSec || 86400) * 1000
  },
  NOOP(){},
  isUndefined(obj) {
    return obj === void 0;
  },
  isObject(obj) {
    if (this.isArray(obj) || this.isFunction(obj)) {
      return false;
    }
    return obj === Object(obj);
  },
  isArray(obj) {
    return Array.isArray(obj);
  },
  isBoolean(obj) {
    return obj === true || obj === false || Object.prototype.toString.call(obj) === '[object Boolean]';
  },
  isFunction(obj) {
    return typeof obj === 'function' || false;
  },
  isEmpty(obj) {
    if (this.isDate(obj)) {
      return false;
    }
    if (this.isObject(obj)) {
      return !Object.keys(obj).length;
    }
    if (this.isArray(obj) || this.isString(obj)) {
      return !obj.length;
    }
    return false;
  },
  clone(obj) {
    if (!this.isObject(obj)) return obj;
    return this.isArray(obj) ? obj.slice() : Object.assign({}, obj);
  },
  has(_obj, path) {
    let obj = _obj;
    if (!this.isObject(obj)) {
      return false;
    }
    if (!this.isArray(path)) {
      return this.isObject(obj) && Object.prototype.hasOwnProperty.call(obj, path);
    }

    const length = path.length;
    for (let i = 0; i < length; i++) {
      if (!Object.prototype.hasOwnProperty.call(obj, path[i])) {
        return false;
      }
      obj = obj[path[i]];
    }
    return !!length;
  },
  omit(obj, ...keys) {
    const clear = Object.assign({}, obj);
    for (let i = keys.length - 1; i >= 0; i--) {
      delete clear[keys[i]];
    }

    return clear;
  },
  pick(obj, ...keys) {
    return Object.assign({}, ...keys.map(key => ({[key]: obj[key]})));
  },
  now: Date.now
};

const helpers = ['String', 'Number', 'Date'];
for (let i = 0; i < helpers.length; i++) {
  _app['is' + helpers[i]] = function (obj) {
    return Object.prototype.toString.call(obj) === '[object ' + helpers[i] + ']';
  };
}

export { _app, Collections };
