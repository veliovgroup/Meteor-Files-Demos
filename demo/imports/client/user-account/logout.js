import { Meteor }   from 'meteor/meteor';
import { Template } from 'meteor/templating';
import './logout.jade';

Template.logout.events({
  'click [data-logout]'(e) {
    e.preventDefault();
    Meteor.logout();
  }
});
