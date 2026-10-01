import { Meteor } from 'meteor/meteor';
import SimpleSchema from 'meteor/aldeed:simple-schema';
import 'meteor/aldeed:collection2/static';
import { FilesCollection } from 'meteor/ostrio:files';

const Images = new FilesCollection({
  debug: true,
  collectionName: 'Images'
});

// Sample files with non-ASCII, spaces, and special characters in names
// to check Content-Disposition (RFC 6266 / RFC 8187) on download:
const sampleTextFiles = [{
  fileId: 'sampleUnicodeName',
  fileName: 'Résumé файл (final) 2026.txt',
  content: 'Sample file with non-ASCII and space characters in its name.\nПривет, мир!\n'
}, {
  fileId: 'sampleQuotedName',
  fileName: 'report "Q3" 50% done;v2.txt',
  content: 'Sample file with quotes, percent, and semicolon in its name.\n'
}];

// To have sample image in DB we will upload it on server startup:
if (Meteor.isServer) {
  Images.denyClient();
  Images.collection.attachSchema(new SimpleSchema(Images.schema));

  Meteor.startup(async function () {
    // Default `storagePath` is inside the build dir, which Meteor wipes on
    // rebuild. Remove records whose file is gone, so they are seeded again:
    const { existsSync } = await import('node:fs');
    for (const fileRef of await Images.collection.find({}, { fields: { path: 1 } }).fetchAsync()) {
      if (!existsSync(fileRef.path)) {
        await Images.removeAsync({ _id: fileRef._id });
      }
    }

    if (!await Images.countDocuments({ name: 'logo.png' })) {
      await Images.loadAsync('https://raw.githubusercontent.com/veliovgroup/Meteor-Files/master/logo.png', {
        fileName: 'logo.png',
        meta: {}
      });
    }

    for (const sample of sampleTextFiles) {
      if (!await Images.findOneAsync({ _id: sample.fileId })) {
        await Images.writeAsync(Buffer.from(sample.content, 'utf8'), {
          fileName: sample.fileName,
          fileId: sample.fileId,
          type: 'text/plain; charset=utf-8',
          meta: {}
        });
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
