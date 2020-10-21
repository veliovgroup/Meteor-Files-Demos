import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
import { _app, Collections } from '/imports/lib/core.js';
import './file.jade';

Template.file.onRendered(function() {
  window.IS_RENDERED = true;
});

Template.file.helpers({
  file() {
    return Collections.files.findOne(Template.instance().data.params._id);
  },
  isBlamed() {
    return _app.conf.blamed.get().includes(this._id);
  },
  canPreview() {
    return this.isPDF || this.isAudio || this.isVideo || this.isImage || false;
  }
});

Template.file.events({
  'click [data-show-file]'(e, template) {
    e.preventDefault();
    const container = template.$('.file-body.scroll-wrap');
    if (container) {
      container.animate({ scrollTop: 0 }, 256);
    }
    return false;
  },
  'click [data-show-info]'(e, template) {
    e.preventDefault();
    const container = template.$('.file-body.scroll-wrap');
    if (container && container[0]) {
      container.animate({ scrollTop: container[0].scrollHeight }, 256);
    }
    return false;
  },
  'click [data-blame]'(e) {
    e.preventDefault();
    const blamed = _app.conf.blamed.get();
    if (blamed.includes(this._id)) {
      blamed.splice(blamed.indexOf(this._id), 1);
      _app.conf.blamed.set(blamed);

      Collections._files.update(this._id, {
        $inc: {
          'meta.blamed': -1
        }
      });

      Meteor.call('file.unblame', this._id);
    } else {
      blamed.push(this._id);
      _app.conf.blamed.set(blamed);

      const file = Collections._files.findOne(this._id);

      if (file.meta.blamed >= 5) {
        Collections._files.remove(this._id);
        FlowRouter.go('/');
      } else {
        Collections._files.update(this._id, {
          $inc: {
            'meta.blamed': 1
          }
        });
      }

      Meteor.call('file.blame', this._id);
    }
    return false;
  }
});
