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

  Meteor.startup(async () => {
    if (!await Images.findOneAsync()) {
      await Images.loadAsync('https://raw.githubusercontent.com/VeliovGroup/Meteor-Files/master/logo.png', {
        fileName: 'logo.png'
      });
    }

    if (!await Sounds.findOneAsync()) {
      await Sounds.loadAsync('http://www.openmusicarchive.org/audio/Deep_Blue_Sea_Blues.mp3', {
        fileName: 'Deep_Blue_Sea_Blues.mp3'
      });
    }
  });

  Meteor.publish('files.images.all', () => Images.find().cursor);
  Meteor.publish('files.sounds.all', () => Sounds.find().cursor);
} else {
  Meteor.subscribe('files.images.all');
  Meteor.subscribe('files.sounds.all');
}

export { Sounds, Images };
