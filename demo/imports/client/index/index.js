import { _app, Collections } from '/imports/lib/core.js';
import { Template } from 'meteor/templating';

import '/imports/client/upload/upload-row.js';
import '/imports/client/listing/listing-row.js';
import './index.jade';

Template.index.onRendered(function() {
  window.IS_RENDERED = true;
});

Template.index.helpers({
  uploads() {
    return _app.uploads.get();
  },
  recent() {
    return Collections.files.find({}, {
      sort: {
        'meta.createdAt': -1
      }
    });
  }
});
