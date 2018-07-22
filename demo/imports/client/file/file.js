import { HTTP }              from 'meteor/http';
import { Meteor }            from 'meteor/meteor';
import { Template }          from 'meteor/templating';
import { ReactiveVar }       from 'meteor/reactive-var';
import { _app, Collections } from '/imports/lib/core.js';
import './file.jade';

let timer = false;
const showOriginal = new ReactiveVar(false);
const fetchedText  = new ReactiveVar(false);
const showPreview  = new ReactiveVar(false);
const showError    = new ReactiveVar(false);
const showInfo     = new ReactiveVar(false);
const warning      = new ReactiveVar(false);

Template.file.onRendered(function() {
  warning.set(false);
  fetchedText.set(false);

  if (!this.data.file) {
    window.IS_RENDERED = true;
    return;
  }

  if (this.data.file.isText || this.data.file.isJSON) {
    if (this.data.file.size < 1024 * 64) {
      HTTP.call('GET', this.data.file.link(), (error, resp) => {
        showPreview.set(true);
        if (error) {
          console.error(error);
        } else {
          if (!~[500, 404, 400].indexOf(resp.statusCode)) {
            if (resp.content.length < 1024 * 64) {
              fetchedText.set(resp.content);
            } else {
              warning.set(true);
            }
          }
        }
      });
    } else {
      warning.set(true);
    }
  } else if (this.data.file.isImage) {
    const img = new Image();
    if (/png|jpe?g/i.test(this.data.file.type)) {
      let handle;
      img.onload = () => {
        showPreview.set(true);
      };
      img.onerror = () => {
        showError.set(true);
      };

      if (this.data.file.versions != null && this.data.file.versions.preview != null && this.data.file.versions.preview.extension) {
        img.src = this.data.file.link('preview');
      } else {
        handle = Collections.files.find(this.data.file._id).observeChanges({
          changed: (_id, fields) => {
            if (fields != null && fields.versions != null && fields.versions.preview != null && fields.versions.preview.extension) {
              img.src = this.data.file.link('preview');
              handle.stop();
            }
          }
        });
      }
    } else {
      img.onload = () => {
        showOriginal.set(true);
      };
      img.onerror = () => {
        showError.set(true);
      };
      img.src = this.data.file.link();
    }
  } else if (this.data.file.isVideo) {
    const video = _app.getElementFromView(this.view._domrange.parentElement, this.data.file._id);
    if (!video) {
      return;
    }

    if (!video.canPlayType(this.data.file.type)) {
      showError.set(true);
    } else {
      const promise = video.play();
      if (Object.prototype.toString.call(promise) === '[object Promise]' || (Object.prototype.toString.call(promise) === '[object Object]' && promise.then && Object.prototype.toString.call(promise.then) === '[object Function]')) {
        promise.then(_app.NOOP).catch(_app.NOOP);
      }
    }
  } else if (this.data.file.isAudio) {
    const audio = _app.getElementFromView(this.view._domrange.parentElement, this.data.file._id);
    if (!audio) {
      return;
    }

    if (!audio.canPlayType(this.data.file.type)) {
      showError.set(true);
    } else {
      const promise = audio.play();
      if (Object.prototype.toString.call(promise) === '[object Promise]' || (Object.prototype.toString.call(promise) === '[object Object]' && promise.then && Object.prototype.toString.call(promise.then) === '[object Function]')) {
        promise.then(_app.NOOP).catch(_app.NOOP);
      }
    }
  }
  window.IS_RENDERED = true;
});

Template.file.helpers({
  warning() {
    return warning.get();
  },
  getCode() {
    if (this.type && !!~this.type.indexOf('/')) {
      return this.type.split('/')[1];
    }
    return '';
  },
  isBlamed() {
    return !!~_app.blamed.get().indexOf(this._id);
  },
  showInfo() {
    return showInfo.get();
  },
  showError() {
    return showError.get();
  },
  fetchedText() {
    return fetchedText.get();
  },
  showPreview() {
    return showPreview.get();
  },
  showOriginal() {
    return showOriginal.get();
  }
});

Template.file.events({
  'click [data-blame]'(e) {
    e.preventDefault();
    const blamed = _app.blamed.get();
    if (!!~blamed.indexOf(this._id)) {
      blamed.splice(blamed.indexOf(this._id), 1);
      _app.blamed.set(blamed);
      Meteor.call('unblame', this._id);
    } else {
      blamed.push(this._id);
      _app.blamed.set(blamed);
      Meteor.call('blame', this._id);
    }
    return false;
  },
  'click [data-show-info]'(e) {
    e.preventDefault();
    showInfo.set(!showInfo.get());
    return false;
  },
  'touchmove .file-overlay'(e) {
    e.preventDefault();
    return false;
  },
  'touchmove .file'(e, template) {
    if (template.$(e.currentTarget).height() < template.$('.file-table').height()) {
      template.$('a.show-info').hide();
      template.$('h1.file-title').hide();
      template.$('a.download-file').hide();
      if (timer) {
        Meteor.clearTimeout(timer);
      }
      timer = Meteor.setTimeout(() => {
        template.$('a.show-info').show();
        template.$('h1.file-title').show();
        template.$('a.download-file').show();
      }, 768);
    }
  }
});
