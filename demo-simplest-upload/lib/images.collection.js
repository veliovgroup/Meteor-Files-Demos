import { Meteor }          from 'meteor/meteor';
import { FilesCollection } from 'meteor/ostrio:files';

const Images = new FilesCollection({
  debug: true,
  collectionName: 'Images',
  allowClientCode: false, // Disallow remove files from Client
  onBeforeUpload: function (file) {
    // Allow upload files under 10MB, and only in png/jpg/jpeg formats
    if (file.size <= 1024 * 1024 * 10 && /png|jpe?g/i.test(file.extension)) {
      return true;
    }
    return 'Please upload image, with size equal or less than 10MB';
  }
});

if (Meteor.isServer) {
  Images.denyClient();

  Meteor.startup(async () => {
    // Default `storagePath` is inside the build dir, which Meteor wipes on
    // rebuild. Remove records whose file is gone, so the list has no dead links:
    const { existsSync } = await import('node:fs');
    for (const fileRef of await Images.collection.find({}, { fields: { path: 1 } }).fetchAsync()) {
      if (!existsSync(fileRef.path)) {
        await Images.removeAsync({ _id: fileRef._id });
      }
    }
  });

  Meteor.publish('files.images.all', function () {
    return Images.find().cursor;
  });
} else {
  Meteor.subscribe('files.images.all');
}

export default Images;
