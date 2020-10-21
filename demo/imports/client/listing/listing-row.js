import { moment } from 'meteor/momentjs:moment';
import { Template } from 'meteor/templating';
import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
import { ReactiveVar } from 'meteor/reactive-var';
import { _app, Collections } from '/imports/lib/core.js';
import './listing-row.jade';

const showSettings = new ReactiveVar(false);

Template.listingRow.helpers({
  removedIn() {
    return moment(this.meta.expireAt).fromNow();
  },
  showSettings() {
    return showSettings.get() === this._id;
  }
});

Template.listingRow.events({
  'click [data-download-file]'(e) {
    e.stopPropagation();
  },
  'click [data-show-file]'(e) {
    e.preventDefault();
    FlowRouter.go('file', { _id: this._id });
    return false;
  },
  'click [data-hide]'(e) {
    e.preventDefault();
    Collections._files.remove(this._id);

    const _recentUploads = _app.conf.recentUploads.get();
    if (_recentUploads && _recentUploads.length) {
      for (const fileRef of _recentUploads) {
        if (fileRef._id === this._id) {
          _recentUploads.splice(_recentUploads.indexOf(fileRef), 1);
          _app.conf.recentUploads.set(_recentUploads);
          break;
        }
      }
    }
    return false;
  }
});
