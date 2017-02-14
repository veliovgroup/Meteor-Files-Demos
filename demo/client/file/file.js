let timer = false;

Template.file.onCreated(function() {
  this.showOriginal = new ReactiveVar(false);
  this.fetchedText  = new ReactiveVar(false);
  this.showPreview  = new ReactiveVar(false);
  this.showError    = new ReactiveVar(false);
  this.showInfo     = new ReactiveVar(false);
  this.warning      = new ReactiveVar(false);
});

Template.file.onRendered(function() {
  this.warning.set(false);
  this.fetchedText.set(false);
  if (this.data.file.isText || this.data.file.isJSON) {
    if (this.data.file.size < 1024 * 64) {
      HTTP.call('GET', this.data.file.link(), (error, resp) => {
        this.showPreview.set(true);
        if (error) {
          console.error(error);
        } else {
          if (!~[500, 404, 400].indexOf(resp.statusCode)) {
            if (resp.content.length < 1024 * 64) {
              this.fetchedText.set(resp.content);
            } else {
              this.warning.set(true);
            }
          }
        }
      });
    } else {
      this.warning.set(true);
    }
  } else if (this.data.file.isImage) {
    const img = new Image();
    if (/png|jpe?g/i.test(this.data.file.type)) {
      let handle;
      img.onload = () => {
        this.showPreview.set(true);
      };
      img.onerror = () => {
        this.showError.set(true);
      };
      if (this.data.file.versions != null && this.data.file.versions.preview != null && this.data.file.versions.preview.extension) {
        img.src = this.data.file.link('preview');
      } else {
        handle = Collections.files.find(this.data.file._id).observeChanges({
          changed: (_id, fileds) => {
            if (fileds != null && fileds.versions != null && fileds.versions.preview != null && fileds.versions.preview.extension) {
              img.src = this.data.file.link('preview');
              handle.stop();
            }
          }
        });
      }
    } else {
      img.onload = () => {
        this.showOriginal.set(true);
      };
      img.onerror = () => {
        this.showError.set(true);
      };
      img.src = this.data.file.link();
    }
  } else if (this.data.file.isVideo) {
    const video = document.getElementById(this.data.file._id);
    if (!video.canPlayType(this.data.file.type)) {
      this.showError.set(true);
    } else {
      video.play();
    }
  } else if (this.data.file.isAudio) {
    const audio = document.getElementById(this.data.file._id);
    if (!audio.canPlayType(this.data.file.type)) {
      this.showError.set(true);
    } else {
      audio.play();
    }
  }
  window.IS_RENDERED = true;
});

Template.file.helpers({
  warning() {
    return Template.instance().warning.get();
  },
  getCode() {
    if (this.type && !!~this.type.indexOf('/')) {
      return this.type.split('/')[1];
    }
    return '';
  },
  isBlamed() {
    return !!~_app.blamed.get().indexOf(this._id);
  },
  showInfo() {
    return Template.instance().showInfo.get();
  },
  showError() {
    return Template.instance().showError.get();
  },
  fetchedText() {
    return Template.instance().fetchedText.get();
  },
  showPreview() {
    return Template.instance().showPreview.get();
  },
  showOriginal() {
    return Template.instance().showOriginal.get();
  }
});

Template.file.events({
  'click [data-blame]'(e) {
    e.preventDefault();
    const blamed = _app.blamed.get();
    if (!!~blamed.indexOf(this._id)) {
      blamed.splice(blamed.indexOf(this._id), 1);
      _app.blamed.set(blamed);
      Meteor.call('unblame', this._id);
    } else {
      blamed.push(this._id);
      _app.blamed.set(blamed);
      Meteor.call('blame', this._id);
    }
    return false;
  },
  'click [data-show-info]'(e, template) {
    e.preventDefault();
    template.showInfo.set(!template.showInfo.get());
    return false;
  },
  'touchmove .file-overlay'(e) {
    e.preventDefault();
    return false;
  },
  'touchmove .file'(e, template) {
    if (template.$(e.currentTarget).height() < template.$('.file-table').height()) {
      template.$('a.show-info').hide();
      template.$('h1.file-title').hide();
      template.$('a.download-file').hide();
      if (timer) {
        Meteor.clearTimeout(timer);
      }
      timer = Meteor.setTimeout(() => {
        template.$('a.show-info').show();
        template.$('h1.file-title').show();
        template.$('a.download-file').show();
      }, 768);
    }
  }
});
