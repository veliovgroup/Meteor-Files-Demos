import { check }             from 'meteor/check';
import { Meteor }            from 'meteor/meteor';
import { _app, Collections } from '/imports/lib/core.js';

Meteor.methods({
  'file.unblame'(_id) {
    check(_id, String);

    Collections.files.update({
      _id
    }, {
      $inc: {
        'meta.blamed': -1
      }
    }, _app.NOOP);
    return true;
  },
  'file.blame'(_id) {
    check(_id, String);

    const file = Collections.files.findOne({ _id }, {
      fields: {
        'meta.blamed': 1
      }
    });

    if (!file) {
      return false;
    }

    if (file.meta.blamed >= 5) {
      Collections.files.remove({ _id });
      return true;
    }

    Collections.files.update({
      _id
    }, {
      $inc: {
        'meta.blamed': 1
      }
    }, _app.NOOP);
    return true;
  },
  'file.get'(_id) {
    check(_id, String);

    const cursor = Collections.files.findOne({ _id }, {
      fields: {
        _id: 1,
        name: 1,
        size: 1,
        type: 1,
        meta: 1,
        isPDF: 1,
        isText: 1,
        isJSON: 1,
        isVideo: 1,
        isAudio: 1,
        isImage: 1,
        extension: 1,
        _collectionName: 1,
        _downloadRoute: 1
      }
    });

    if (cursor) {
      return cursor.get();
    }

    return void 0;
  }
});
