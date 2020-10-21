import { hljs } from 'meteor/simple:highlight.js';
import { Meteor } from 'meteor/meteor';
import { Reload } from 'meteor/reload';
import { Template } from 'meteor/templating';
import { filesize } from 'meteor/mrt:filesize';
import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
import { ReactiveVar } from 'meteor/reactive-var';
import { ClientStorage } from 'meteor/ostrio:cstorage';

import { _app, Collections } from '/imports/lib/core.js';
import { Markdown as marked } from 'meteor/perak:markdown';

import '/imports/client/components.sass';
import '/imports/client/files.collection.js';

import '/imports/client/_404/_404.jade';
import '/imports/client/layout/layout.js';
import '/imports/client/loading/loading.jade';
import '/imports/client/router/router.js';
import '/imports/client/router/routes.js';

// Pages:
import '/imports/client/index/index.js';
import '/imports/client/file/file.js';

window.IS_RENDERED = false;
Meteor.setTimeout(() => {
  window.IS_RENDERED = true;
}, 10240);

const addListener = (target, events, func) => {
  events.forEach((event) => {
    target.addEventListener(event, func, { passive: true, capture: false });
  });
};

_app.isFileOver = new ReactiveVar(false);
let _el = null;
addListener(window, ['dragenter', 'dragover'], (e) => {
  e.stopPropagation();
  _el = e.target;
  _app.isFileOver.set(true);
  return false;
});

addListener(window, ['dragleave'], (e) => {
  e.stopPropagation();
  if (_el === e.target) {
    _app.isFileOver.set(false);
  }
  return false;
});

addListener(window, ['drop'], (e) => {
  e.stopPropagation();
  _app.isFileOver.set(false);
  return false;
});

_app.isiOS = /iPad|iPhone|iPod/.test(navigator.userAgent || navigator.vendor || window.opera) && !window.MSStream;
_app.uploads  = new ReactiveVar(false);
_app.currentUrl = () => {
  return Meteor.absoluteUrl((FlowRouter.current().path || document.location.pathname).replace(/^\//g, '')).split('?')[0].split('#')[0].replace('!', '');
};
_app.showAbout = new ReactiveVar(false);
_app.serviceConfiguration = new ReactiveVar({});
_app.getElementFromView = function (parent, idClass) {
  let el;
  if (parent) {
    if (parent.getElementById) {
      el = parent.getElementById(idClass);
    }

    if (!el && parent.getElementsByClassName) {
      el = parent.getElementsByClassName(idClass)[0];
    }
  }

  if (!el) {
    return document.getElementById(idClass);
  }

  return el;
};

_app.persistentReactive = (name, initial) => {
  let reactive;
  if (ClientStorage.has(name)) {
    reactive = new ReactiveVar(ClientStorage.get(name));
  } else {
    ClientStorage.set(name, initial);
    reactive = new ReactiveVar(initial);
  }

  reactive.set = function (newValue) {
    let oldValue = reactive.curValue;
    if ((reactive.equalsFunc || ReactiveVar._isEqual)(oldValue, newValue)) {
      return;
    }
    reactive.curValue = newValue;
    ClientStorage.set(name, newValue);
    reactive.dep.changed();
  };

  return reactive;
};

_app.conf.uploadTransport = _app.persistentReactive('uploadTransport', 'http');
_app.conf.blamed = _app.persistentReactive('blamedUploads', []);

// UPON INITIAL LOAD:
// GET RECENTLY UPLOADED/SEEN FILES FROM PERSISTENT STORAGE
// ITERATE OVER FILE RECORDS TO EXCLUDE EXPIRED AND PUSH THE
// REST OF THE RECORDS TO `._files` COLLECTION
_app.conf.recentUploads = _app.persistentReactive('recentUploads', []);
const _recentUploads = _app.conf.recentUploads.get();
if (_recentUploads && _recentUploads.length) {
  const now = Date.now();
  const expired = [];
  _recentUploads.forEach((fileRef, i) => {
    if (+new Date(fileRef.meta.expireAt) < now) {
      expired.push(i);
    } else if (!Collections._files.findOne(fileRef._id)) {
      Collections._files.insert(fileRef);
    }
  });

  if (expired.length) {
    expired.forEach((expiredIndex) => {
      _recentUploads.splice(expiredIndex, 1);
    });

    _app.conf.recentUploads.set(_recentUploads);
  }
}

Template.registerHelper('isFileOver', () => {
  return _app.isFileOver.get();
});

Template.registerHelper('urlCurrent', () => {
  return _app.currentUrl();
});

Template.registerHelper('url', (string = null) => {
  return Meteor.absoluteUrl(string);
});

Template.registerHelper('filesize', (size = 0) => {
  return filesize(size);
});

Template.registerHelper('extless', (filename = '') => {
  const parts = filename.split('.');
  if (parts.length > 1 && parts[0].length) {
    parts.pop();
  }
  return parts.join('.');
});

Template.registerHelper('DateToISO', (_time = 0) => {
  let time = _time;
  if (_app.isString(time) || _app.isNumber(time)) {
    time = new Date(time);
  }
  return time.toISOString();
});

Template._404.onRendered(function() {
  window.IS_RENDERED = true;
});

marked.setOptions({
  highlight(code) {
    return hljs.highlightAuto(code).value;
  },
  renderer: new marked.Renderer(),
  gfm: true,
  tables: true,
  breaks: false,
  pedantic: false,
  sanitize: true,
  smartLists: true,
  smartypants: false
});

_app._SWRegistration = null;
try {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      try {
        navigator.serviceWorker.register(Meteor.absoluteUrl('sw.min.js')).then((registration) => {
          _app._SWRegistration = registration;
        }).catch((error) => {
          console.info('Can\'t load SW', error);
        });
      } catch (e) {
        // We're good here
        // Just an old browser
      }
    });
  }
} catch (e) {
  // We're good here
  // Just an old browser
}

const onReload = () => {
  try {
    window.caches.keys().then((keys) => {
      keys.forEach((name) => {
        window.caches.delete(name);
      });
    }).catch((err) => {
      console.error('window.caches.delete', err);
    });
  } catch (_error) {
    // We good here...
  }

  if (_app._SWRegistration) {
    try {
      _app._SWRegistration.unregister().catch((e) => {
        console.warn('[SW UNREGISTER] [CATCH IN PROMISE] [ERROR:]', e);
      });
      _app._SWRegistration = null;
    } catch (e) {
      console.warn('[SW UNREGISTER] [ERROR:]', e);
    }
  }

  setTimeout(() => {
    if (window.location.hash || window.location.href.endsWith('#')) {
      window.location.reload();
    } else {
      window.location.replace(window.location.href);
    }
  }, 128);
};

try {
  Reload._onMigrate(function (func, opts) {
    if (!opts.immediateMigration) {
      onReload();
      return [false];
    }
    return [true];
  });
} catch (e) {
  // We're good here
}

Meteor.startup(() => {
  document.documentElement.setAttribute('itemscope', '');
  document.documentElement.setAttribute('itemtype', 'http://schema.org/WebPage');
  document.documentElement.setAttribute('xmlns:og', 'http://ogp.me/ns#');
  document.documentElement.setAttribute('xml:lang', 'en');
  document.documentElement.setAttribute('lang', 'en');
});

export { _app, Collections };
