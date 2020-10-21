import { moment }   from 'meteor/momentjs:moment';
import { filesize } from 'meteor/mrt:filesize';
import { Template } from 'meteor/templating';
import './upload-row.jade';

Template.uploadRow.helpers({
  estimatedBitrate: function() {
    return filesize(this.estimateSpeed.get(), { bits: true }) + '/s';
  },
  getProgressClass: function() {
    let progress = Math.ceil(this.progress.get() / 5) * 5;
    if (progress > 100) {
      progress = 100;
    }
    return progress;
  },
  estimatedDuration: function() {
    const duration = moment.duration(this.estimateTime.get());
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
  }
});

Template.uploadRow.events({
  'click [data-toggle-upload]'(e) {
    e.preventDefault();
    this.toggle();
    return false;
  }
});
