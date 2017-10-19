import { _ }                 from 'meteor/underscore';
import { Meteor }            from 'meteor/meteor';
import { Random }            from 'meteor/random';
import { filesize }          from 'meteor/mrt:filesize';
import { FilesCollection }   from 'meteor/ostrio:files';
import { _app, Collections } from '/imports/lib/core.js';

// DropBox usage:
// Read: https://github.com/VeliovGroup/Meteor-Files/wiki/DropBox-Integration
// env.var example: DROPBOX='{"dropbox":{"key": "xxx", "secret": "xxx", "token": "xxx"}}'
let useDropBox = false;

// AWS:S3 usage:
// Read: https://github.com/VeliovGroup/Meteor-Files/wiki/AWS-S3-Integration
// env.var example: S3='{"s3":{"key": "xxx", "secret": "xxx", "bucket": "xxx", "region": "xxx""}}'
let useS3 = false;
let client;
let sendToStorage;

const fs      = require('fs-extra');
const S3      = require('aws-sdk/clients/s3');
const stream  = require('stream');
const request = require('request');
const Dropbox = require('dropbox');
const bound   = Meteor.bindEnvironment((callback) => {
  return callback();
});

if (process.env.DROPBOX) {
  Meteor.settings.dropbox = JSON.parse(process.env.DROPBOX).dropbox;
} else if (process.env.S3) {
  Meteor.settings.s3 = JSON.parse(process.env.S3).s3;
}

const s3Conf = Meteor.settings.s3 || {};
const dbConf = Meteor.settings.dropbox || {};

if (dbConf && dbConf.key && dbConf.secret && dbConf.token) {
  useDropBox = true;
  client     = new Dropbox.Client({
    key: dbConf.key,
    secret: dbConf.secret,
    token: dbConf.token
  });
} else if (s3Conf && s3Conf.key && s3Conf.secret && s3Conf.bucket && s3Conf.region) {
  useS3  = true;
  client = new S3({
    secretAccessKey: s3Conf.secret,
    accessKeyId: s3Conf.key,
    region: s3Conf.region,
    sslEnabled: false,
    httpOptions: {
      timeout: 6000,
      agent: false
    }
  });
}

Collections.files = new FilesCollection({
  // debug: true,
  storagePath: 'assets/app/uploads/uploadedFiles',
  collectionName: 'uploadedFiles',
  allowClientCode: true,
  // disableUpload: true,
  // disableDownload: true,
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
  onBeforeRemove(cursor) {
    const res = cursor.map((file) => {
      if (file && file.userId && _.isString(file.userId)) {
        return file.userId === this.userId;
      }
      return false;
    });
    return !~res.indexOf(false);
  },
  onBeforeUpload() {
    if (this.file.size <= 1024 * 1024 * 128) {
      return true;
    }
    return "Max. file size is 128MB you've tried to upload " + (filesize(this.file.size));
  },
  downloadCallback(fileObj) {
    if (this.params && this.params.query && this.params.query.download === 'true') {
      Collections.files.collection.update(fileObj._id, {
        $inc: {
          'meta.downloads': 1
        }
      }, _app.NOOP);
    }
    return true;
  },
  interceptDownload(http, fileRef, version) {
    let path;
    if (useDropBox) {
      path = (fileRef && fileRef.versions && fileRef.versions[version] && fileRef.versions[version].meta && fileRef.versions[version].meta.pipeFrom) ? fileRef.versions[version].meta.pipeFrom : void 0;
      if (path) {
        // If file is successfully moved to Storage
        // We will pipe request to Storage
        // So, original link will stay always secure

        // To force ?play and ?download parameters
        // and to keep original file name, content-type,
        // content-disposition and cache-control
        // we're using low-level .serve() method
        this.serve(http, fileRef, fileRef.versions[version], version, request({
          url: path,
          headers: _.pick(http.request.headers, 'range', 'cache-control', 'connection')
        }));
        return true;
      }
      // While file is not yet uploaded to Storage
      // We will serve file from FS
      return false;
    } else if (useS3) {
      path = (fileRef && fileRef.versions && fileRef.versions[version] && fileRef.versions[version].meta && fileRef.versions[version].meta.pipePath) ? fileRef.versions[version].meta.pipePath : void 0;
      if (path) {
        // If file is successfully moved to Storage
        // We will pipe request to Storage
        // So, original link will stay always secure

        // To force ?play and ?download parameters
        // and to keep original file name, content-type,
        // content-disposition and cache-control
        // we're using low-level .serve() method
        const opts = {
          Bucket: s3Conf.bucket,
          Key: path
        };

        if (http.request.headers.range) {
          const vRef  = fileRef.versions[version];
          let range   = _.clone(http.request.headers.range);
          const array = range.split(/bytes=([0-9]*)-([0-9]*)/);
          const start = parseInt(array[1]);
          let end     = parseInt(array[2]);
          if (isNaN(end)) {
            // Request data from AWS:S3 by small chunks
            end       = (start + this.chunkSize) - 1;
            if (end >= vRef.size) {
              end     = vRef.size - 1;
            }
          }
          opts.Range   = `bytes=${start}-${end}`;
          http.request.headers.range = `bytes=${start}-${end}`;
        }

        const fileColl = this;
        client.getObject(opts, function (error) {
          if (error) {
            console.error(error);
            if (!http.response.finished) {
              http.response.end();
            }
          } else {
            if (http.request.headers.range && this.httpResponse.headers['content-range']) {
              // Set proper range header in according to what is returned from AWS:S3
              http.request.headers.range = this.httpResponse.headers['content-range'].split('/')[0].replace('bytes ', 'bytes=');
            }

            const dataStream = new stream.PassThrough();
            fileColl.serve(http, fileRef, fileRef.versions[version], version, dataStream);
            dataStream.end(this.data.Body);
          }
        });

        return true;
      }
      // While file is not yet uploaded to Storage
      // We will serve file from FS
      return false;
    }
    return false;
  }
});

Collections.files.denyClient();
Collections.files.on('afterUpload', function(_fileRef) {
  if (useDropBox) {
    const makeUrl = (stat, fileRef, version, triesUrl = 0) => {
      client.makeUrl(stat.path, {
        long: true,
        downloadHack: true
      }, (error, xml) => {
        bound(() => {
          // Store downloadable link in file's meta object
          if (error) {
            if (triesUrl < 10) {
              Meteor.setTimeout(() => {
                makeUrl(stat, fileRef, version, ++triesUrl);
              }, 2048);
            } else {
              console.error(error, {
                triesUrl: triesUrl
              });
            }
          } else if (xml) {
            const upd = { $set: {} };
            upd['$set']['versions.' + version + '.meta.pipeFrom'] = xml.url;
            upd['$set']['versions.' + version + '.meta.pipePath'] = stat.path;
            this.collection.update({
              _id: fileRef._id
            }, upd, (updError) => {
              if (updError) {
                console.error(updError);
              } else {
                // Unlink original files from FS
                // after successful upload to DropBox
                this.unlink(this.collection.findOne(fileRef._id), version);
              }
            });
          } else {
            if (triesUrl < 10) {
              Meteor.setTimeout(() => {
                // Generate downloadable link
                makeUrl(stat, fileRef, version, ++triesUrl);
              }, 2048);
            } else {
              console.error("client.makeUrl doesn't returns xml", {
                triesUrl: triesUrl
              });
            }
          }
        });
      });
    };

    const writeToDB = (fileRef, version, data, triesSend = 0) => {
      // DropBox already uses random URLs
      // No need to use random file names
      client.writeFile(fileRef._id + '-' + version + '.' + fileRef.extension, data, (error, stat) => {
        bound(() => {
          if (error) {
            if (triesSend < 10) {
              Meteor.setTimeout(() => {
                // Write file to DropBox
                writeToDB(fileRef, version, data, ++triesSend);
              }, 2048);
            } else {
              console.error(error, {
                triesSend: triesSend
              });
            }
          } else {
            makeUrl(stat, fileRef, version);
          }
        });
      });
    };

    const readFile = (fileRef, vRef, version, triesRead = 0) => {
      fs.readFile(vRef.path, (error, data) => {
        bound(() => {
          if (error) {
            if (triesRead < 10) {
              readFile(fileRef, vRef, version, ++triesRead);
            } else {
              console.error(error);
            }
          } else {
            writeToDB(fileRef, version, data);
          }
        });
      });
    };

    sendToStorage = (fileRef) => {
      _.each(fileRef.versions, (vRef, version) => {
        readFile(fileRef, vRef, version);
      });
    };
  } else if (useS3) {
    sendToStorage = (fileRef) => {
      _.each(fileRef.versions, (vRef, version) => {
        // We use Random.id() instead of real file's _id
        // to secure files from reverse engineering
        // As after viewing this code it will be easy
        // to get access to unlisted and protected files
        const filePath = 'files/' + (Random.id()) + '-' + version + '.' + fileRef.extension;

        client.putObject({
          StorageClass: 'STANDARD',
          Bucket: s3Conf.bucket,
          Key: filePath,
          Body: fs.createReadStream(vRef.path),
          ContentType: vRef.type,
        }, (error) => {
          bound(() => {
            if (error) {
              console.error(error);
            } else {
              const upd = { $set: {} };
              upd['$set']['versions.' + version + '.meta.pipePath'] = filePath;
              this.collection.update({
                _id: fileRef._id
              }, upd, (updError) => {
                if (updError) {
                  console.error(updError);
                } else {
                  // Unlink original file from FS
                  // after successful upload to AWS:S3
                  this.unlink(this.collection.findOne(fileRef._id), version);
                }
              });
            }
          });
        });
      });
    };
  }

  if (/png|jpe?g/i.test(_fileRef.extension || '')) {
    Meteor.setTimeout( () => {
      _app.createThumbnails(this, _fileRef, (error) => {
        if (error) {
          console.error(error);
        }

        if (useDropBox || useS3) {
          sendToStorage(this.collection.findOne(_fileRef._id));
        }
      });
    }, 1024);
  } else {
    if (useDropBox || useS3) {
      sendToStorage(_fileRef);
    }
  }
});

// This line now commented due to Heroku usage
// Collections.files.collection._ensureIndex {'meta.expireAt': 1}, {expireAfterSeconds: 0, background: true}

// Intercept FileCollection's remove method
// to remove file from DropBox or AWS S3
if (useDropBox || useS3) {
  const _origRemove = Collections.files.remove;
  Collections.files.remove = function(search) {
    const cursor = this.collection.find(search);
    cursor.forEach((fileRef) => {
      _.each(fileRef.versions, (vRef) => {
        if (vRef && vRef.meta && vRef.meta.pipePath != null) {
          if (useDropBox) {
            // DropBox usage:
            client.remove(vRef.meta.pipePath, (error) => {
              bound(() => {
                if (error) {
                  console.error(error);
                }
              });
            });
          } else {
            // AWS:S3 usage:
            client.deleteObject({
              Bucket: s3Conf.bucket,
              Key: vRef.meta.pipePath,
            }, (error) => {
              bound(() => {
                if (error) {
                  console.error(error);
                }
              });
            });
          }
        }
      });
    });
    // Call original method
    _origRemove.call(this, search);
  };
}

// Remove all files on server load/reload, useful while testing/development
// Meteor.startup -> Collections.files.remove {}

// Remove files along with MongoDB records two minutes before expiration date
// If we have 'expireAfterSeconds' index on 'meta.expireAt' field,
// it won't remove files themselves.
Meteor.setInterval(() => {
  Collections.files.remove({
    'meta.expireAt': {
      $lte: new Date(+new Date() + 120000)
    }
  }, _app.NOOP);
}, 120000);
