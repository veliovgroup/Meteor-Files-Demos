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
