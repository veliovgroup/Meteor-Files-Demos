import { Template } from 'meteor/templating';
import Images from '/lib/images.collection.js';
import './main.html';

Template.file.helpers({
  file() {
    return Images.findOne();
  }
});
