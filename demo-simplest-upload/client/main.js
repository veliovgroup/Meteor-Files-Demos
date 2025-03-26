import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';
import Images from '/lib/images.collection.js';
import './main.html';

Template.uploadedFiles.helpers({
  uploadedFiles() {
    return Images.find();
  }
});

Template.uploadForm.onCreated(function () {
  this.currentUpload = new ReactiveVar(false);
});

Template.uploadForm.helpers({
  currentUpload() {
    return Template.instance().currentUpload.get();
  }
});

Template.uploadForm.events({
  async 'change #fileInput'(e, template) {
    if (e.currentTarget.files && e.currentTarget.files[0]) {
      // We upload only one file, in case
      // there was multiple files selected
      const file = e.currentTarget.files[0];
      if (file) {
        const uploadInstance = await Images.insertAsync({
          file: file,
          chunkSize: 'dynamic'
        }, false);

        uploadInstance.on('start', function() {
          template.currentUpload.set(this);
        });

        uploadInstance.on('end', function(error, fileObj) {
          if (error) {
            window.alert(`Error during upload: ${error.reason}`);
          } else {
            window.alert(`File "${fileObj.name}" successfully uploaded`);
          }
          template.currentUpload.set(false);
        });

        await uploadInstance.start();
      }
    }
  }
});
