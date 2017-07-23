import { _ }                 from 'meteor/underscore';
import { Meteor }            from 'meteor/meteor';
import { moment }            from 'meteor/momentjs:moment';
import { filesize }          from 'meteor/mrt:filesize';
import { Template }          from 'meteor/templating';
import { FlowRouter }        from 'meteor/ostrio:flow-router-extra';
import { ReactiveVar }       from 'meteor/reactive-var';
import { ClientStorage }     from 'meteor/ostrio:cstorage';
import { _app, Collections } from '/imports/lib/core.js';
import '/imports/client/user-account/accounts.js';
import '/imports/client/upload/upload-form.jade';

Template.uploadForm.onCreated(function() {
  const self          = this;
  this.error          = new ReactiveVar(false);
  this.uploadQTY      = 0;
  this.showSettings   = new ReactiveVar(false);

  this.initiateUpload = (event, files) => {
    if (_app.uploads.get()) {
      return false;
    }
    if (!files.length) {
      this.error.set('Please select a file to upload');
      return false;
    }
    if (files.length > 6) {
      this.error.set('Please select up to 6 files');
      return false;
    }
    this.uploadQTY = files.length;
    const cleanUploaded = (current) => {
      const _uploads = _.clone(_app.uploads.get());
      if (_.isArray(_uploads)) {
        _.each(_uploads, (upInst, index) => {
          if (upInst.file.name === current.file.name) {
            _uploads.splice(index, 1);
            if (_uploads.length) {
              _app.uploads.set(_uploads);
            } else {
              this.uploadQTY = 0;
              _app.uploads.set(false);
            }
          }
        });
      }
    };

    let secured, unlisted, ttl;
    const uploads = [];
    const transport = ClientStorage.get('uploadTransport');
    const created_at = +new Date();
    if (Meteor.userId()) {
      secured = _app.secured.get();
      if (!_.isBoolean(secured)) {
        secured = false;
      }
      if (secured) {
        unlisted = true;
      } else {
        unlisted = _app.unlist.get();
        if (!_.isBoolean(unlisted)) {
          unlisted = true;
        }
      }
      ttl = new Date(created_at + _app.storeTTLUser);
    } else {
      unlisted = false;
      secured = false;
      ttl = new Date(created_at + _app.storeTTL);
    }

    _.each(files, (file, i) => {
      Collections.files.insert({
        file: file,
        meta: {
          blamed: 0,
          secured: secured,
          expireAt: ttl,
          unlisted: unlisted,
          downloads: 0,
          created_at: created_at - 1 - i
        },
        streams: 'dynamic',
        chunkSize: 'dynamic',
        transport: transport
      }, false).on('end', function (error, fileObj) {
        if (!error && files.length === 1) {
          FlowRouter.go('file', {
            _id: fileObj._id
          });
        }
        cleanUploaded(this);
      }).on('abort', function () {
        cleanUploaded(this);
      }).on('error', function (error) {
        console.error(error);
        self.error.set((self.error.get() ? self.error.get() + '<br />' : '') + this.file.name + ': ' + ((error != null ? error.reason : void 0) || error));
        Meteor.setTimeout( () => {
          self.error.set(false);
        }, 10000);
        cleanUploaded(this);
      }).on('start', function() {
        uploads.push(this);
        _app.uploads.set(uploads);
      }).start();
    });
    return true;
  };
});

Template.uploadForm.helpers({
  error() {
    return Template.instance().error.get();
  },
  uploads() {
    return _app.uploads.get();
  },
  status() {
    let i                = 0;
    const uploads        = _app.uploads.get();
    let progress         = 0;
    const uploadQTY      = Template.instance().uploadQTY;
    let estimateBitrate  = 0;
    let estimateDuration = 0;
    let onPause          = false;

    if (uploads) {
      for (let j = 0; j < uploads.length; j++) {
        onPause = uploads[j].onPause.get();
        progress += uploads[j].progress.get();
        estimateBitrate += uploads[j].estimateSpeed.get();
        estimateDuration += uploads[j].estimateTime.get();
        i++;
      }

      if (i < uploadQTY) {
        progress += 100 * (uploadQTY - i);
      }

      progress         = Math.ceil(progress / uploadQTY);
      estimateBitrate  = filesize(Math.ceil(estimateBitrate / i), { bits: true }) + '/s';
      estimateDuration = (() => {
        const duration = moment.duration(Math.ceil(estimateDuration / i));
        let hours = '' + (duration.hours());
        if (hours.length <= 1) {
          hours = '0' + hours;
        }

        let minutes = '' + (duration.minutes());
        if (minutes.length <= 1) {
          minutes = '0' + minutes;
        }

        let seconds = '' + (duration.seconds());
        if (seconds.length <= 1) {
          seconds = '0' + seconds;
        }
        return hours + ':' + minutes + ':' + seconds;
      })();
    }
    return {
      progress: progress,
      estimateBitrate: estimateBitrate,
      estimateDuration: estimateDuration,
      onPause: onPause
    };
  },
  showSettings() {
    return Template.instance().showSettings.get();
  },
  showProjectInfo() {
    return _app.showProjectInfo.get();
  },
  uploadTransport() {
    return ClientStorage.get('uploadTransport');
  }
});

Template.uploadForm.events({
  'click input[type="radio"]'(e) {
    ClientStorage.set('uploadTransport', e.currentTarget.value);
    return true;
  },
  'click [data-pause-all]'(e) {
    e.preventDefault();
    const uploads = _app.uploads.get();
    if (uploads) {
      for (let j = 0; j < uploads.length; j++) {
        uploads[j].pause();
      }
    }
    return false;
  },
  'click [data-abort-all]'(e, template) {
    e.preventDefault();
    const uploads = _app.uploads.get();
    if (uploads) {
      for (let j = 0; j < uploads.length; j++) {
        uploads[j].abort();
      }
    }
    template.error.set(false);
    return false;
  },
  'click [data-continue-all]'(e) {
    e.preventDefault();
    const uploads = _app.uploads.get();
    if (uploads) {
      for (let j = 0; j < uploads.length; j++) {
        uploads[j].continue();
      }
    }
    return false;
  },
  'click #fakeUpload'(e, template) {
    if (!_app.isiOS) {
      e.preventDefault();
    }
    template.$('#userfile').trigger('click');
    if (!_app.isiOS) {
      return false;
    }
  },
  'dragover #uploadFile, dragenter #uploadFile'(e) {
    e.preventDefault();
    e.stopPropagation();
    const uf = document.getElementById('uploadFile');
    if (!~uf.className.indexOf('file-over')) {
      uf.className += ' file-over';
    }
    e.originalEvent.dataTransfer.dropEffect = 'copy';
  },
  'drop #uploadFile.file-over'(e, template) {
    e.preventDefault();
    e.stopPropagation();
    template.error.set(false);
    const uf = document.getElementById('uploadFile');
    if (!!~uf.className.indexOf('file-over')) {
      uf.className = uf.className.replace(' file-over', '');
    }
    e.originalEvent.dataTransfer.dropEffect = 'copy';
    template.initiateUpload(e, e.originalEvent.dataTransfer.files, template);
    return false;
  },
  'change #userfile'(e, template) {
    template.$('form#uploadFile').submit();
  },
  'submit form#uploadFile'(e, template) {
    e.preventDefault();
    template.error.set(false);
    template.initiateUpload(e, e.currentTarget.userfile.files);
    return false;
  },
  'click [data-show-settings]'(e, template) {
    e.preventDefault();
    template.showSettings.set(!template.showSettings.get());
    return false;
  },
  'click [data-show-project-info]'(e) {
    e.preventDefault();
    _app.showProjectInfo.set(!_app.showProjectInfo.get());
    return false;
  }
});
