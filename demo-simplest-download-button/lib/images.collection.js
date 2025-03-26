import { Meteor } from 'meteor/meteor';
import SimpleSchema from 'simpl-schema';
import 'meteor/aldeed:collection2/static';
import { FilesCollection } from 'meteor/ostrio:files';

const Images = new FilesCollection({
  debug: true,
  collectionName: 'Images'
});

// To have sample image in DB we will upload it on server startup:
if (Meteor.isServer) {
  Images.denyClient();
  Images.collection.attachSchema(new SimpleSchema(Images.schema));

  Meteor.startup(async function () {
    if (!await Images.countDocuments()) {
      await Images.loadAsync('https://raw.githubusercontent.com/veliovgroup/Meteor-Files/master/logo.png', {
        fileName: 'logo.png',
        meta: {}
      });
    }
  });

  Meteor.publish('files.images.all', function () {
    return Images.find().cursor;
  });
} else {
  Meteor.subscribe('files.images.all');
}

export default Images;
