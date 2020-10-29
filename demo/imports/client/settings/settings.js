import { _app } from '/imports/lib/core.js';
import { Template } from 'meteor/templating';

import './settings.jade';

Template.settings.onRendered(function() {
  window.IS_RENDERED = true;
});

Template.settings.helpers({
  uploadTransport() {
    return _app.conf.uploadTransport.get();
  }
});

Template.settings.events({
  'click input[type="radio"]'(e) {
    _app.conf.uploadTransport.set(e.currentTarget.value);
    return true;
  }
});
