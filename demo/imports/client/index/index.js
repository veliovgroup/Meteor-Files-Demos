import { Mongo }             from 'meteor/mongo';
import { Meteor }            from 'meteor/meteor';
import { Template }          from 'meteor/templating';
import { ReactiveVar }       from 'meteor/reactive-var';
import { _app, Collections } from '/imports/lib/core.js';
import '/imports/client/listing/listing-row.js';
import '/imports/client/upload/upload-row.js';
import './index.jade';

Template.index.onCreated(function() {
  let timer           = false;
  this.take           = new ReactiveVar(10);
  this.latest         = new ReactiveVar(new Mongo.Cursor);
  this.loadMore       = new ReactiveVar(false);
  this.filesLength    = new ReactiveVar(0);
  this.getFilesLenght = () => {
    if (timer) {
      Meteor.clearTimeout(timer);
    }
    timer = Meteor.setTimeout(() => {
      Meteor.call('filesLenght', _app.userOnly.get(), (error, length) => {
        if (error) {
          console.error(error);
        } else {
          this.filesLength.set(length);
        }
        timer = false;
      });
    }, 512);
  };

  const observers = {
    added: () => {
      this.getFilesLenght();
    },
    removed: () => {
      this.filesLength.set(this.filesLength.get() - 1);
      this.getFilesLenght();
    }
  };

  this.autorun(() => {
    let cursor;
    if (_app.userOnly.get() && Meteor.userId()) {
      cursor = Collections.files.find({
        userId: Meteor.userId()
      }, {
        sort: {
          'meta.created_at': -1
        }
      });
    } else {
      cursor = Collections.files.find({}, {
        sort: {
          'meta.created_at': -1
        }
      });
    }
    cursor.observeChanges(observers);
    this.latest.set(cursor);
  });

  this.autorun(() => {
    _app.subs.subscribe('latest', this.take.get(), _app.userOnly.get(), () => {
      this.loadMore.set(false);
    });
  });
});

Template.index.onRendered(function() {
  window.IS_RENDERED = true;
});

Template.index.helpers({
  take() {
    return Template.instance().take.get();
  },
  latest() {
    return Template.instance().latest.get();
  },
  uploads() {
    return _app.uploads.get();
  },
  userOnly() {
    return _app.userOnly.get();
  },
  loadMore() {
    return Template.instance().loadMore.get();
  },
  filesLength() {
    return Template.instance().filesLength.get();
  }
});

Template.index.events({
  'click [data-load-more]'(e, template) {
    template.loadMore.set(true);
    template.take.set(template.take.get() + 10);
  }
});
