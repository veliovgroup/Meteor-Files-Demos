import { _ }             from 'meteor/underscore';
import { hljs }          from 'meteor/simple:highlight.js';
import { Meteor }        from 'meteor/meteor';
import { Reload }        from 'meteor/reload';
import { Tracker }       from 'meteor/tracker'
import { Template }      from 'meteor/templating';
import { filesize }      from 'meteor/mrt:filesize';
import { FlowRouter }    from 'meteor/ostrio:flow-router-extra';
import { ReactiveVar }   from 'meteor/reactive-var';
import { SubsManager }   from 'meteor/meteorhacks:subs-manager';
import { ClientStorage } from 'meteor/ostrio:cstorage';

import { _app, Collections }  from '/imports/lib/core.js';
import { Markdown as marked } from 'meteor/perak:markdown';

import '/imports/client/files.collection.js';
import '/imports/client/upload/upload-form.js';
import '/imports/client/misc/_404.jade';
import '/imports/client/misc/_layout.jade';
import '/imports/client/misc/_loading.jade';
import '/imports/client/misc/project-info.jade';
import '/imports/client/router/router.js';

window.IS_RENDERED = false;
Meteor.setTimeout(() => {
  window.IS_RENDERED = true;
}, 6144);

if (!window.requestAnimFrame) {
  window.requestAnimFrame = (() => {
    return window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || function (callback) {
      window.setTimeout(callback, 1000 / 60);
    };
  })();
}
if (!ClientStorage.has('blamed') || !_.isArray(ClientStorage.get('blamed'))) {
  ClientStorage.set('blamed', []);
}
if (!ClientStorage.has('unlist') || !_.isBoolean(ClientStorage.get('unlist'))) {
  ClientStorage.set('unlist', true);
}
if (!ClientStorage.has('secured') || !_.isBoolean(ClientStorage.get('secured'))) {
  ClientStorage.set('secured', false);
}
if (!ClientStorage.has('userOnly') || !_.isBoolean(ClientStorage.get('userOnly'))) {
  ClientStorage.set('userOnly', false);
}

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

_app.isiOS    = /iPad|iPhone|iPod/.test(navigator.userAgent || navigator.vendor || window.opera) && !window.MSStream;
_app.subs     = new SubsManager();
_app.blamed   = new ReactiveVar(ClientStorage.get('blamed'));
_app.unlist   = new ReactiveVar(ClientStorage.get('unlist'));
_app.secured  = new ReactiveVar(ClientStorage.get('secured'));
_app.uploads  = new ReactiveVar(false);
_app.userOnly = new ReactiveVar(ClientStorage.get('userOnly'));
_app.storeTTL = 86400000;
_app.currentUrl = () => {
  return Meteor.absoluteUrl((FlowRouter.current().path || document.location.pathname).replace(/^\//g, '')).split('?')[0].split('#')[0].replace('!', '');
};
_app.storeTTLUser = 432000000;
_app.showProjectInfo = new ReactiveVar(false);
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

Meteor.call('getServiceConfiguration', (error, serviceConfiguration) => {
  if (error) {
    console.error(error);
  } else {
    _app.serviceConfiguration.set(serviceConfiguration);
  }
});

Tracker.autorun(() => {
  ClientStorage.set('blamed', _app.blamed.get());
});

Tracker.autorun(() => {
  ClientStorage.set('unlist', _app.unlist.get());
});

Tracker.autorun(() => {
  ClientStorage.set('secured', _app.secured.get());
});

Tracker.autorun(() => {
  ClientStorage.set('userOnly', _app.userOnly.get());
});

if (!ClientStorage.has('uploadTransport')) {
  ClientStorage.set('uploadTransport', 'ddp');
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

Template.registerHelper('DateToISO', (time = 0) => {
  if (_.isString(time) || _.isNumber(time)) {
    time = new Date(time);
  }
  return time.toISOString();
});

Template._404.onRendered(function() {
  window.IS_RENDERED = true;
});

Template._layout.helpers({
  showProjectInfo() {
    return _app.showProjectInfo.get();
  }
});

Template._layout.events({
  'click [data-show-project-info]'(e) {
    e.preventDefault();
    _app.showProjectInfo.set(!_app.showProjectInfo.get());
    return false;
  }
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
