import { _ }      from 'meteor/underscore';
import { _app }   from '/lib/__compatibility/__globals.js';
import { check }  from 'meteor/check';
import { Meteor } from 'meteor/meteor';

import fs from 'fs-extra';
import gm from 'gm';

const bound = Meteor.bindEnvironment((callback) => {
  return callback();
});

_app.createThumbnails = (collection, fileRef, cb) => {
  check(fileRef, Object);

  let isLast = false;
  const finish = (error) => {
    bound(() => {
      if (error) {
        console.error('[_app.createThumbnails] [finish]', error);
        cb && cb (error);
      } else {
        if (isLast) {
          cb && cb(void 0, fileRef);
        }
      }
      return true;
    });
  };

  fs.exists(fileRef.path, (exists) => {
    bound(() => {
      if (!exists) {
        throw Meteor.log.error('File ' + fileRef.path + ' not found in [createThumbnails] Method');
      }
      const image = gm(fileRef.path);
      const sizes = {
        preview: {
          width: 400
        },
        thumbnail40: {
          width: 40,
          square: true
        }
      };

      image.size((error, features) => {
        bound(() => {
          if (error) {
            console.error('[_app.createThumbnails] [_.each sizes]', error);
            finish(Meteor.Error('[_app.createThumbnails] [_.each sizes]', error));
            return;
          }

          let i = 0;
          collection.collection.update(fileRef._id, {
            $set: {
              'meta.width': features.width,
              'meta.height': features.height,
              'versions.original.meta.width': features.width,
              'versions.original.meta.height': features.height
            }
          }, _app.NOOP);

          _.each(sizes, (size, name) => {
            const path = (collection.storagePath(fileRef)) + '/' + name + '-' + fileRef._id + '.' + fileRef.extension;
            const copyPaste = () => {
              fs.copy(fileRef.path, path, (fsCopyError) => {
                bound(() => {
                  if (fsCopyError) {
                    console.error('[_app.createThumbnails] [_.each sizes] [fs.copy]', fsCopyError);
                    finish(fsCopyError);
                    return;
                  }

                  const upd = { $set: {} };
                  upd['$set']['versions.' + name] = {
                    path: path,
                    size: fileRef.size,
                    type: fileRef.type,
                    extension: fileRef.extension,
                    meta: {
                      width: features.width,
                      height: features.height
                    }
                  };
                  collection.collection.update(fileRef._id, upd, (colUpdError) => {
                    ++i;
                    if (i === Object.keys(sizes).length) {
                      isLast = true;
                    }
                    finish(colUpdError);
                  });
                });
              });
            };

            if (/png|jpe?g/i.test(fileRef.extension)) {
              const img = gm(fileRef.path)
                .quality(70)
                .define('filter:support=2')
                .define('jpeg:fancy-upsampling=false')
                .define('jpeg:fancy-upsampling=off')
                .define('png:compression-filter=5')
                .define('png:compression-level=9')
                .define('png:compression-strategy=1')
                .define('png:exclude-chunk=all')
                .autoOrient()
                .noProfile()
                .strip()
                .dither(false)
                .interlace('Line')
                .filter('Triangle');

              const updateAndSave = (upNSaveError) => {
                bound(() => {
                  if (upNSaveError) {
                    console.error('[_app.createThumbnails] [_.each sizes] [img.resize]', upNSaveError);
                    finish(upNSaveError);
                    return;
                  }
                  fs.stat(path, (fsStatError, stat) => {
                    bound(() => {
                      if (fsStatError) {
                        console.error('[_app.createThumbnails] [_.each sizes] [img.resize] [fs.stat]', fsStatError);
                        finish(fsStatError);
                        return;
                      }

                      gm(path).size((gmSizeError, imgInfo) => {
                        bound(() => {
                          if (gmSizeError) {
                            console.error('[_app.createThumbnails] [_.each sizes] [img.resize] [fs.stat] [gm(path).size]', gmSizeError);
                            finish(gmSizeError);
                            return;
                          }
                          const upd = { $set: {} };
                          upd['$set']['versions.' + name] = {
                            path: path,
                            size: stat.size,
                            type: fileRef.type,
                            extension: fileRef.extension,
                            meta: {
                              width: imgInfo.width,
                              height: imgInfo.height
                            }
                          };

                          collection.collection.update(fileRef._id, upd, (colUpdError) => {
                            ++i;
                            if (i === Object.keys(sizes).length) {
                              isLast = true;
                            }
                            finish(colUpdError);
                          });
                        });
                      });
                    });
                  });
                });
              };

              if (!size.square) {
                if (features.width > size.width) {
                  img.resize(size.width).interlace('Line').write(path, updateAndSave);
                } else {
                  copyPaste();
                }
              } else {
                let x = 0;
                let y = 0;
                const widthRatio  = features.width / size.width;
                const heightRatio = features.height / size.width;
                let widthNew      = size.width;
                let heightNew     = size.width;

                if (heightRatio < widthRatio) {
                  widthNew = (size.width * features.width) / features.height;
                  x = (widthNew - size.width) / 2;
                }

                if (heightRatio > widthRatio) {
                  heightNew = (size.width * features.height) / features.width;
                  y = (heightNew - size.width) / 2;
                }

                img
                  .resize(widthNew, heightNew)
                  .crop(size.width, size.width, x, y)
                  .interlace('Line')
                  .write(path, updateAndSave);
              }
            } else {
              copyPaste();
            }
          });
        });
      });
    });
  });
  return true;
};
