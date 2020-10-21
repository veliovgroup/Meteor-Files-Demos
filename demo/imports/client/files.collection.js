import { _app }       from '/imports/lib/core.js';
import { Mongo } from 'meteor/mongo';
import { filesize } from 'meteor/mrt:filesize';
import { Collections } from '/imports/lib/core.js';
import { FilesCollection } from 'meteor/ostrio:files';

Collections._files = new Mongo.Collection(null);
Collections._files._name = 'uploadedFiles';

console.log(_app.conf)

Collections.files = new FilesCollection({
  debug: true,
  collection: Collections._files,
  allowClientCode: true,
  // disableUpload: true,
  onBeforeUpload() {
    if (this.file.size <= _app.conf.maxFileSize) {
      return true;
    }
    return `Max. file size is ${filesize(_app.conf.maxFileSize)} you've tried to upload ${filesize(this.file.size)}`;
  }
});
