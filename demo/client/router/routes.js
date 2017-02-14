FlowRouter.route('/', {
  name: 'index',
  action() {
    this.render('_layout', 'index');
  },
  waitOn() {
    return [_app.subs.subscribe('latest', 10, _app.userOnly.get())];
  },
  whileWaiting() {
    this.render('_layout', '_loading');
  }
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
  action: function() {
    this.render('_layout', 'login');
  }
});

FlowRouter.route('/:_id', {
  name: 'file',
  title: function(params, queryParams, file) {
    if (file) {
      return 'View File: ' + (file.get('name'));
    }
    return '404: Page not found';
  },
  meta: function(params, queryParams, file) {
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
  link: function(params, queryParams, file) {
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
    this.render('_layout', 'file', {
      file: file
    });
  },
  waitOn(params) {
    return [_app.subs.subscribe('file', params._id)];
  },
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
