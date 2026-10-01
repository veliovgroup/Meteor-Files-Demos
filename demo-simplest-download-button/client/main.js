import { Template } from 'meteor/templating';
import Images from '/lib/images.collection.js';
import './main.html';

Template.file.helpers({
  files() {
    return Images.find({}, { sort: { name: 1 } }).each();
  }
});
