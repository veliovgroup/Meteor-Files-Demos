Template.login.onRendered(function() {
  window.IS_RENDERED = true;
});

Template.login.helpers({
  unlist() {
    return _app.unlist.get();
  },
  secured() {
    return _app.secured.get();
  },
  serviceConfiguration() {
    return _app.serviceConfiguration.get();
  }
});

Template.login.events({
  'click [data-login-meteor]'(e) {
    e.preventDefault();
    Meteor.loginWithMeteorDeveloperAccount();
  },
  'click [data-login-github]'(e) {
    e.preventDefault();
    Meteor.loginWithGithub();
  },
  'click [data-login-twitter]'(e) {
    e.preventDefault();
    Meteor.loginWithTwitter({});
  },
  'click [data-login-facebook]'(e) {
    e.preventDefault();
    Meteor.loginWithFacebook({});
  },
  'click [data-change-unlist]'(e) {
    e.preventDefault();
    _app.unlist.set(!_app.unlist.get());
    return false;
  },
  'click [data-change-secured]'(e) {
    e.preventDefault();
    _app.secured.set(!_app.secured.get());
    return false;
  }
});
