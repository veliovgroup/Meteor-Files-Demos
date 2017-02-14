const bound = Meteor.bindEnvironment(function(callback) {
  return callback();
});

const fs = Npm.require('fs-extra');
const gm = Npm.require('gm');

_app.createThumbnails = (collection, fileRef, cb) => {
  check(fileRef, Object);

  let isLast = false;
  const finish = (error) => {
    bound(() => {
      if (error) {
        console.error('[_app.createThumbnails] [finish]', error);
        cb && cb (void 0, error);
      } else {
        if (isLast) {
          cb && cb(fileRef);
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

      image.size(function(error, features) {
        bound(() => {
          if (error) {
            return finish(Meteor.Error('[_app.createThumbnails] [_.each sizes]', error));
          }

          let i = 0;
          collection.collection.update(fileRef._id, {
            $set: {
              'meta.width': features.width,
              'meta.height': features.height
            }
          }, _app.NOOP);

          _.each(sizes, (size, name) => {
            const path = (collection.storagePath(fileRef)) + '/' + name + '-' + fileRef._id + '.' + fileRef.extension;
            const copyPaste = () => {
              fs.copy(fileRef.path, path, (error) => {
                bound(() => {
                  var upd;
                  if (error) {
                    console.error('[_app.createThumbnails] [_.each sizes] [fs.copy]', error);
                  } else {
                    upd = {
                      $set: {}
                    };
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
                    collection.collection.update(fileRef._id, upd, (error) => {
                      ++i;
                      if (i === Object.keys(sizes).length) {
                        isLast = true;
                      }
                      return finish(error);
                    });
                  }
                });
              });
            };

            if (!!~['jpg', 'jpeg', 'png'].indexOf(fileRef.extension.toLowerCase())) {
              const img = gm(fileRef.path)
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
                .filter('Triangle');

              const updateAndSave = (error) => {
                bound(() => {
                  if (error) {
                    console.error('[_app.createThumbnails] [_.each sizes] [img.resize]', error);
                  } else {
                    fs.stat(path, (err, stat) => {
                      bound(() => {
                        gm(path).size((error, imgInfo) => {
                          bound(() => {
                            if (error) {
                              console.error('[_app.createThumbnails] [_.each sizes] [img.resize] [fs.stat] [gm(path).size]', error);
                            } else {
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
                              collection.collection.update(fileRef._id, upd, (error) => {
                                ++i;
                                if (i === Object.keys(sizes).length) {
                                  isLast = true;
                                }
                                return finish(error);
                              });
                            }
                          });
                        });
                      });
                    });
                  }
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
