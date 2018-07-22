import { Mongo }             from 'meteor/mongo';
import { Meteor }            from 'meteor/meteor';
import { Template }          from 'meteor/templating';
import { ReactiveVar }       from 'meteor/reactive-var';
import { _app, Collections } from '/imports/lib/core.js';
import '/imports/client/listing/listing-row.js';
import '/imports/client/upload/upload-row.js';
import './index.jade';

const take           = new ReactiveVar(10);
const latest         = new ReactiveVar(new Mongo.Cursor);
const loadMore       = new ReactiveVar(false);
const filesLength    = new ReactiveVar(0);

Template.index.onCreated(function() {
  let timer           = false;
  this.getFilesLenght = () => {
    if (timer) {
      Meteor.clearTimeout(timer);
    }
    timer = Meteor.setTimeout(() => {
      Meteor.call('filesLenght', _app.userOnly.get(), (error, length) => {
        if (error) {
          console.error(error);
        } else {
          filesLength.set(length);
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
      filesLength.set(filesLength.get() - 1);
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
    latest.set(cursor);
  });

  this.autorun(() => {
    _app.subs.subscribe('latest', take.get(), _app.userOnly.get(), () => {
      loadMore.set(false);
    });
  });
});

Template.index.onRendered(function() {
  window.IS_RENDERED = true;
});

Template.index.helpers({
  take() {
    return take.get();
  },
  latest() {
    return latest.get();
  },
  uploads() {
    return _app.uploads.get();
  },
  userOnly() {
    return _app.userOnly.get();
  },
  loadMore() {
    return loadMore.get();
  },
  filesLength() {
    return filesLength.get();
  }
});

Template.index.events({
  'click [data-load-more]'() {
    loadMore.set(true);
    take.set(take.get() + 10);
  }
});
