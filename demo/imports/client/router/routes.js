import { Meteor } from 'meteor/meteor';
import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
import { Collections } from '/imports/lib/core.js';

const meta404 = {
  robots: 'noindex, nofollow',
  title: '404: Page not found',
  keywords: {
    name: 'keywords',
    itemprop: 'keywords',
    content: '404, page, not found'
  },
  description: {
    name: 'description',
    itemprop: 'description',
    property: 'og:description',
    content: '404: No such page'
  },
  'twitter:description': '404: No such page',
  'og:image': {
    property: 'og:image',
    content: Meteor.absoluteUrl('icon_1200x630.png')
  },
  'twitter:image': {
    name: 'twitter:image',
    content: Meteor.absoluteUrl('icon_750x560.png')
  }
};

const promiseMethod = (name, args, sharedObj, key) => {
  return new Promise((resolve) => {
    Meteor.apply(name, args, (error, result) => {
      if (error) {
        console.error(`[promiseMethod] [${name}]`, error);
        sharedObj[key] = void 0;
      } else {
        sharedObj[key] = result || void 0;
      }
      resolve();
    });
  });
};

FlowRouter.route('/', {
  name: 'index',
  action() {
    this.render('layout', 'index');
  }
});

FlowRouter.route('/:_id', {
  name: 'file',
  title(params, queryParams, file) {
    if (file) {
      return `Download file: ${file.get('name')}`;
    }
    return meta404.title;
  },
  meta(params, queryParams, _file) {
    if (_file) {
      const file = _file.get();
      return {
        robots: 'noindex, nofollow',
        keywords: {
          name: 'keywords',
          itemprop: 'keywords',
          content: `file, download, shared, ${file.name}, ${file.extension}, ${file.type}`
        },
        description: {
          name: 'description',
          itemprop: 'description',
          property: 'og:description',
          content: `Download shared file: ${file.name}`
        },
        'twitter:description': `Download shared file: ${file.name}`
      };
    }

    return meta404;
  },
  action(params) {
    this.render('layout', 'file', { params });
  },
  waitOn(params) {
    if (!Collections.files.findOne(params._id)) {
      return promiseMethod('file.get', [params._id], this.conf, 'file');
    }
    return [];
  },
  whileWaiting() {
    this.render('layout', 'loading');
  },
  onNoData() {
    this.render('layout', '_404');
  },
  data(params) {
    // CHECK IF FILE EXISTS IN LOCAL STORAGE
    const file = Collections.files.findOne(params._id);
    if (file) {
      return file;
    }

    // CHECK IF FILE EXISTS ON SERVER
    if (this.conf.file) {
      // INSERT RECORD TO LOCAL COLLECTION
      Collections._files.insert(this.conf.file);

      // GET *FileCursor* FROM *FilesCollection*
      // WITH REACTIVITY AND METHODS LIKE `.link()`
      return Collections.files.findOne(this.conf.file._id);
    }

    // TRIGGER 404 PAGE
    return void 0;
  }
});

// 404 route (catch all)
FlowRouter.route('*', {
  action() {
    this.render('layout', '_404');
  },
  title: '404: Page not found',
  meta: meta404
});
