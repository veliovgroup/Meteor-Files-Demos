import { Template } from 'meteor/templating';
import { Sounds, Images } from '/lib/files.collections.js';
import './main.html';

Template.file.helpers({
  imageFile() {
    return Images.findOne();
  },
  audioFile() {
    return Sounds.findOne();
  }
});
