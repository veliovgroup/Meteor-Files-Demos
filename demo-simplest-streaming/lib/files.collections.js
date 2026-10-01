import { Meteor } from 'meteor/meteor';
import { FilesCollection } from 'meteor/ostrio:files';

const Images = new FilesCollection({
  debug: true,
  collectionName: 'Images',
  allowClientCode: false,
  // Disallow uploads from client
  disableUpload: true,
});

const Sounds = new FilesCollection({
  debug: true,
  collectionName: 'Sounds',
  allowClientCode: false,
  // Disallow uploads from client
  disableUpload: true,
});

// To have sample files in DB we will upload them on server startup:
if (Meteor.isServer) {
  Images.denyClient();
  Sounds.denyClient();

  // Load sample file, or reload it when its record exists but the file is gone.
  // Files in the default storagePath are lost when Meteor rebuilds the app
  const loadSample = async (collection, url, fileName) => {
    const fileRef = await collection.findOneAsync();
    if (fileRef) {
      const { existsSync } = await import('fs');
      if (existsSync(fileRef.path)) {
        return;
      }
      await collection.removeAsync({ _id: fileRef._id });
    }

    await collection.loadAsync(url, { fileName });
  };

  Meteor.startup(async () => {
    await loadSample(Images, 'https://raw.githubusercontent.com/VeliovGroup/Meteor-Files/master/logo.png', 'logo.png');
    await loadSample(Sounds, 'https://www.openmusicarchive.org/audio/Deep_Blue_Sea_Blues.mp3', 'Deep_Blue_Sea_Blues.mp3');
  });

  Meteor.publish('files.images.all', () => Images.find().cursor);
  Meteor.publish('files.sounds.all', () => Sounds.find().cursor);
} else {
  Meteor.subscribe('files.images.all');
  Meteor.subscribe('files.sounds.all');
}

export { Sounds, Images };
