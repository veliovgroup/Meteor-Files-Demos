import { $ }           from 'meteor/jquery';
import { Meteor }      from 'meteor/meteor';
import { moment }      from 'meteor/momentjs:moment';
import { Template }    from 'meteor/templating';
import { FlowRouter }  from 'meteor/ostrio:flow-router-extra';
import { ReactiveVar } from 'meteor/reactive-var';
import './listing-row.jade';

Template.listingRow.onCreated(function() {
  this.showSettings = new ReactiveVar(false);
  this.showPreview  = () => {
    if (this.data.isImage && /png|jpe?g/i.test(this.data.extension)) {
      if (this.data.versions.thumbnail40) {
        return true;
      }
    }
    return false;
  };
});

Template.listingRow.helpers({
  removedIn() {
    return moment(this.meta.expireAt).fromNow();
  },
  showPreview() {
    return Template.instance().showPreview();
  },
  showSettings() {
    return Template.instance().showSettings.get() === this._id;
  }
});

Template.listingRow.events({
  'click [data-remove-file]'(e) {
    e.stopPropagation();
    e.preventDefault();
    const icon = $(e.currentTarget).find('i.la');
    icon.removeClass('la-trash-o').addClass('la-circle-o-notch la-spin');
    this.remove((error) => {
      if (error) {
        console.log(error);
        icon.addClass('la-trash-o').removeClass('la-circle-o-notch la-spin');
      }
    });
  },
  'click [data-change-access]'(e) {
    e.stopPropagation();
    e.preventDefault();
    const icon = $(e.currentTarget).find('i.la');
    icon.removeClass('la-eye-slash la-eye').addClass('la-circle-o-notch la-spin');
    Meteor.call('changeAccess', this._id, (error) => {
      if (error) {
        console.log(error);
      }
    });
  },
  'click [data-change-privacy]'(e) {
    e.stopPropagation();
    e.preventDefault();
    const icon = $(e.currentTarget).find('i.la');
    icon.removeClass('la-lock la-unlock').addClass('la-spin la-spinner');
    Meteor.call('changePrivacy', this._id, (error) => {
      if (error) {
        console.log(error);
      }
    });
  },
  'click [data-show-file]'(e) {
    e.preventDefault();
    FlowRouter.go('file', {
      _id: this._id
    });
    return false;
  },
  'click [data-show-settings]'(e, template) {
    e.stopPropagation();
    e.preventDefault();
    template.showSettings.set(template.showSettings.get() === this._id ? false : this._id);
    return false;
  },
  'click [data-close-settings]'(e, template) {
    e.stopPropagation();
    e.preventDefault();
    template.showSettings.set(false);
    return false;
  }
});
