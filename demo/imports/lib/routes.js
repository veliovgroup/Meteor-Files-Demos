import { _ }                 from 'meteor/underscore';
import { Meteor }            from 'meteor/meteor';
import { FlowRouter }        from 'meteor/ostrio:flow-router-extra';
import { _app, Collections } from '/imports/lib/core.js';

FlowRouter.route('/', {
  name: 'index',
  action() {
    this.render('_layout', 'index');
  },
  waitOn() {
    if (Meteor.isClient) {
      return [_app.subs.subscribe('latest', 10, _app.userOnly.get()), import('/imports/client/index/index.js')];
    }
  },
  whileWaiting() {
    this.render('_layout', '_loading');
  },
  subscriptions(params) {
    if (Meteor.isServer) {
      this.register('latest', Meteor.subscribe('latest', 10, false));
    }
  },
  fastRender: true
});

FlowRouter.route('/login', {
  name: 'login',
  title() {
    if (Meteor.userId()) {
      return 'Your account settings';
    }
    return 'Login into Meteor Files';
  },
  meta: {
    keywords: {
      name: 'keywords',
      itemprop: 'keywords',
      content: 'private, unlisted, files, upload, meteor, open source, javascript'
    },
    description: {
      name: 'description',
      itemprop: 'description',
      property: 'og:description',
      content: 'Login into Meteor files. After you logged in you can make files private and unlisted'
    },
    'twitter:description': 'Login into Meteor files. After you logged in you can make files private and unlisted'
  },
  action() {
    this.render('_layout', 'login');
  },
  waitOn() {
    return import('/imports/client/user-account/login.js');
  },
  whileWaiting() {
    this.render('_layout', '_loading');
  }
});

FlowRouter.route('/:_id', {
  name: 'file',
  title(params, queryParams, file) {
    if (file) {
      return 'View File: ' + (file.get('name'));
    }
    return '404: Page not found';
  },
  meta(params, queryParams, file) {
    return {
      keywords: {
        name: 'keywords',
        itemprop: 'keywords',
        content: file ? 'file, view, preview, uploaded, shared, ' + (file.get('name')) + ', ' + (file.get('extension')) + ', ' + (file.get('type')) + ', meteor, open source, javascript' : '404, page, not found'
      },
      description: {
        name: 'description',
        itemprop: 'description',
        property: 'og:description',
        content: file ? 'View uploaded and shared file: ' + (file.get('name')) : '404: No such page'
      },
      'twitter:description': file ? 'View uploaded and shared file: ' + (file.get('name')) : '404: No such page',
      'og:image': {
        property: 'og:image',
        content: file && file.get('isImage') ? file.link('preview') : Meteor.absoluteUrl('icon_1200x630.png')
      },
      'twitter:image': {
        name: 'twitter:image',
        content: file && file.get('isImage') ? file.link('preview') : Meteor.absoluteUrl('icon_750x560.png')
      }
    };
  },
  link(params, queryParams, file) {
    return {
      image: {
        itemprop: 'image',
        content() {
          if (file && file.get('isImage')) {
            return file.link('preview');
          }
          return Meteor.absoluteUrl('icon_1200x630.png');
        },
        href() {
          if (file && file.get('isImage')) {
            return file.link('preview');
          }
          return Meteor.absoluteUrl('icon_1200x630.png');
        }
      }
    };
  },
  action(params, queryParams, file) {
    if (_.isObject(file) && !_.isEmpty(file)) {
      this.render('_layout', 'file', {
        file: file
      });
    }
  },
  waitOn(params) {
    if (Meteor.isClient) {
      return [_app.subs.subscribe('file', params._id), import('/imports/client/file/file.js')];
    }
  },
  subscriptions(params) {
    if (Meteor.isServer) {
      this.register('file', Meteor.subscribe('file', params._id));
    }
  },
  fastRender: true,
  whileWaiting() {
    this.render('_layout', '_loading');
  },
  onNoData() {
    this.render('_layout', '_404');
  },
  data(params) {
    return Collections.files.findOne(params._id) || false;
  }
});

// 404 route (catch all)
FlowRouter.route('*', {
  action() {
    this.render('_layout', '_404');
  },
  title: '404: Page not found'
});
