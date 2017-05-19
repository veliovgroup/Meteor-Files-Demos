import { _app }     from '/lib/__compatibility/__globals.js';
import { Template } from 'meteor/templating';
import './accounts.jade';

Template.accounts.helpers({
  userOnly() {
    return _app.userOnly.get();
  }
});

Template.accounts.events({
  'click [data-show-user-only]'(e) {
    e.preventDefault();
    _app.userOnly.set(!_app.userOnly.get());
  }
});
