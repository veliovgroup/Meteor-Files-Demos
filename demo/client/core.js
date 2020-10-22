import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { filesize } from 'meteor/mrt:filesize';
import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
import { ReactiveVar } from 'meteor/reactive-var';
import { ClientStorage } from 'meteor/ostrio:cstorage';

import { _app, Collections } from '/imports/lib/core.js';

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

// Used by pre-rendering service:
window.IS_RENDERED = false;
Meteor.setTimeout(() => {
  window.IS_RENDERED = true;
}, 10240);

// HELPER FOR CREATING MULTIPLE LISTENERS
const addListener = (target, events, func) => {
  events.forEach((event) => {
    target.addEventListener(event, func, { passive: true, capture: false });
  });
};

// VARAIABLES AND LISTENERS USED TO TRIGGER UI
// UPON DRAG'n DROP ACTION
_app.isFileOver = new ReactiveVar(false);
let dndTarget = null;
addListener(window, ['dragenter', 'dragover'], (e) => {
  e.stopPropagation();
  dndTarget = e.target;
  _app.isFileOver.set(true);
  return false;
});

addListener(window, ['dragleave'], (e) => {
  e.stopPropagation();
  if (dndTarget === e.target) {
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
_app.uploads = new ReactiveVar(false);
_app.currentUrl = () => {
  return Meteor.absoluteUrl((FlowRouter.current().path || document.location.pathname).replace(/^\//g, '')).split('?')[0].split('#')[0].replace('!', '');
};

// PERSISTENT REACTIVE VARIABLE
// STATEFUL REACTIVE VARIABLE
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

// STORE USER'S CHOICE OF TRANSPORT
_app.conf.uploadTransport = _app.persistentReactive('uploadTransport', 'http');
// STORE FILES BLAMED BY THIS USER
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

Template.registerHelper('url', (string = null) => {
  return Meteor.absoluteUrl(string);
});

Template.registerHelper('filesize', (size = 0) => {
  return filesize(size);
});

Template._404.onRendered(function() {
  window.IS_RENDERED = true;
});

Meteor.startup(() => {
  // MINOR SEO OPTIMIZATION
  document.documentElement.setAttribute('itemscope', '');
  document.documentElement.setAttribute('itemtype', 'http://schema.org/WebPage');
  document.documentElement.setAttribute('lang', 'en');
});

export { _app, Collections };
