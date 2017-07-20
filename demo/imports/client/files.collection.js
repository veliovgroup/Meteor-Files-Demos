import { filesize }        from 'meteor/mrt:filesize';
import { Collections }     from '/imports/lib/core.js';
import { FilesCollection } from 'meteor/ostrio:files';

Collections.files = new FilesCollection({
  // debug: true,
  // throttle: false,
  chunkSize: 1024 * 768,
  collectionName: 'uploadedFiles',
  allowClientCode: true,
  protected(fileObj) {
    if (fileObj) {
      if (!(fileObj.meta && fileObj.meta.secured)) {
        return true;
      } else if ((fileObj.meta && fileObj.meta.secured === true) && this.userId === fileObj.userId) {
        return true;
      }
    }
    return false;
  },
  onBeforeUpload() {
    if (this.file.size <= 1024 * 1024 * 128) {
      return true;
    }
    return "Max. file size is 128MB you've tried to upload " + (filesize(this.file.size));
  }
});
