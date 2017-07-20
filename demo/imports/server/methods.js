import { check }             from 'meteor/check';
import { Meteor }            from 'meteor/meteor';
import { _app, Collections } from '/imports/lib/core.js';

Meteor.methods({
  filesLenght(userOnly = false) {
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
    return Collections.files.find(selector).count();
  },
  unblame(_id) {
    check(_id, String);
    Collections.files.update({
      _id: _id
    }, {
      $inc: {
        'meta.blamed': -1
      }
    }, _app.NOOP);
    return true;
  },
  blame(_id) {
    check(_id, String);
    Collections.files.update({
      _id: _id
    }, {
      $inc: {
        'meta.blamed': 1
      }
    }, _app.NOOP);
    return true;
  },
  changeAccess(_id) {
    check(_id, String);
    if (Meteor.userId()) {
      const file = Collections.files.findOne({
        _id: _id,
        userId: Meteor.userId()
      });

      if (file) {
        Collections.files.update(_id, {
          $set: {
            'meta.unlisted': file.meta.unlisted ? false : true
          }
        }, _app.NOOP);
        return true;
      }
    }
    throw new Meteor.Error(401, 'Access denied!');
  },
  changePrivacy(_id) {
    check(_id, String);
    if (Meteor.userId()) {
      const file = Collections.files.findOne({
        _id: _id,
        userId: Meteor.userId()
      });

      if (file) {
        Collections.files.update(_id, {
          $set: {
            'meta.unlisted': true,
            'meta.secured': file.meta.secured ? false : true
          }
        }, _app.NOOP);
        return true;
      }
    }
    throw new Meteor.Error(401, 'Access denied!');
  },
  getServiceConfiguration() {
    return _app.sc;
  }
});
