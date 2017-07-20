import { _ }             from 'meteor/underscore';
import { $ }             from 'meteor/jquery';
import { hljs }          from 'meteor/simple:highlight.js';
import { Meteor }        from 'meteor/meteor';
import { FPSMeter }      from 'meteor/ostrio:fps-meter';
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
import '/imports/client/router/routes.js';

window.IS_RENDERED = false;
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

let _el = null;
$(window).on('dragenter dragover', (e) => {
  e.preventDefault();
  e.stopPropagation();
  _el = e.target;
  const uf = document.getElementById('uploadFile');
  if (!~uf.className.indexOf('file-over')) {
    uf.className += ' file-over';
  }
  return false;
});

$(window).on('dragleave', (e) => {
  e.preventDefault();
  e.stopPropagation();
  if (_el === e.target) {
    const uf = document.getElementById('uploadFile');
    if (!!~uf.className.indexOf('file-over')) {
      uf.className = uf.className.replace(' file-over', '');
    }
  }
  return false;
});

$(window).on('drop', (e) => {
  e.preventDefault();
  e.stopPropagation();
  const uf = document.getElementById('uploadFile');
  if (!!~uf.className.indexOf('file-over')) {
    uf.className = uf.className.replace(' file-over', '');
  }
  return false;
});

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

Meteor.call('getServiceConfiguration', (error, serviceConfiguration) => {
  if (error) {
    console.error(error);
  } else {
    _app.serviceConfiguration.set(serviceConfiguration);
  }
});

Meteor.autorun(() => {
  ClientStorage.set('blamed', _app.blamed.get());
});

Meteor.autorun(() => {
  ClientStorage.set('unlist', _app.unlist.get());
});

Meteor.autorun(() => {
  ClientStorage.set('secured', _app.secured.get());
});

Meteor.autorun(() => {
  ClientStorage.set('userOnly', _app.userOnly.get());
});

if (!ClientStorage.has('uploadTransport')) {
  ClientStorage.set('uploadTransport', 'ddp');
}

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
  if (parts.length > 1) {
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

Meteor.startup(() => {
  $('html').attr('itemscope', '');
  $('html').attr('itemtype', 'http://schema.org/WebPage');
  $('html').attr('xmlns:og', 'http://ogp.me/ns#');
  $('html').attr('xml:lang', 'en');
  $('html').attr('lang', 'en');

  const FPS = new FPSMeter({
    ui: true,
    reactive: false
  });

  FPS.start();
  const regStop = () => {
    $('#__FPSMeter').click(() => {
      if (FPS.isRunning) {
        FPS.isRunning = false;
      } else {
        FPS.stop();
        window.requestAnimFrame(() => {
          FPS.start();
          regStop();
        });
      }
    });
  };

  regStop();
});

export { _app, Collections };
