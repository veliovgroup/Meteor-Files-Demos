import { check }       from 'meteor/check';
import { Meteor }      from 'meteor/meteor';
import { Collections } from '/imports/lib/core.js';

Meteor.publish('latest', function(take = 10, userOnly = false) {
  check(take, Number);
  check(userOnly, Boolean);

  let selector;
  if (userOnly && this.userId) {
    selector = {
      userId: this.userId
    };
  } else {
    selector = {
      $or: [
        {
          'meta.unlisted': false,
          'meta.secured': false,
          'meta.blamed': {
            $lt: 3
          }
        }, {
          userId: this.userId
        }
      ]
    };
  }

  return Collections.files.find(selector, {
    limit: take,
    sort: {
      'meta.created_at': -1
    },
    fields: {
      _id: 1,
      name: 1,
      size: 1,
      meta: 1,
      type: 1,
      isPDF: 1,
      isText: 1,
      isJSON: 1,
      isVideo: 1,
      isAudio: 1,
      isImage: 1,
      userId: 1,
      'versions.thumbnail40.extension': 1,
      'versions.preview.extension': 1,
      extension: 1,
      _collectionName: 1,
      _downloadRoute: 1
    }
  }).cursor;
});

Meteor.publish('file', function(_id) {
  check(_id, String);
  return Collections.files.find({
    $or: [
      {
        _id: _id,
        'meta.secured': false
      }, {
        _id: _id,
        'meta.secured': true,
        userId: this.userId
      }
    ]
  }, {
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
      'versions.preview.extension': 1,
      _collectionName: 1,
      _downloadRoute: 1
    }
  }).cursor;
});
