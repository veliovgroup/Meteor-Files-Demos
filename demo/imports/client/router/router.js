import { _app }       from '/imports/lib/core.js';
import { Meteor }     from 'meteor/meteor';
import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
import { FlowRouterMeta, FlowRouterTitle } from 'meteor/ostrio:flow-router-meta';

// FlowRouter.Renderer.inMemoryRendering = true;
// FlowRouter.Renderer.getMemoryElement = () => {
//   return document.createDocumentFragment();
// };

FlowRouter.globals.push({
  title: 'Meteor Files: Upload and Share'
});

FlowRouter.globals.push({
  meta: {
    keywords: {
      name: 'keywords',
      itemprop: 'keywords',
      content: 'file, files, upload, store, storage, share, share files, meteor, open source, javascript'
    },
    'og:url': {
      name: 'url',
      property: 'og:url',
      content() {
        return _app.currentUrl();
      }
    },
    'og:title': {
      name: 'title',
      property: 'og:title',
      content() {
        return document.title;
      }
    },
    description: {
      name: 'description',
      itemprop: 'description',
      property: 'og:description',
      content: 'Upload, Store and Share files with speed of Meteor'
    },
    'twitter:description': 'Upload, Store and Share files with speed of Meteor',
    'twitter:title'() {
      return document.title;
    },
    'twitter:url'() {
      return _app.currentUrl();
    },
    'og:image': {
      name: 'image',
      property: 'og:image',
      content: Meteor.absoluteUrl('icon_1200x630.png')
    },
    'twitter:image': {
      name: 'twitter:image',
      content: Meteor.absoluteUrl('icon_750x560.png')
    }
  },
  link: {
    canonical: {
      rel: 'canonical',
      itemprop: 'url',
      href() {
        return _app.currentUrl();
      }
    },
    image: {
      itemprop: 'image',
      content() {
        return Meteor.absoluteUrl('icon_1200x630.png');
      },
      href() {
        return Meteor.absoluteUrl('icon_1200x630.png');
      }
    }
  }
});

new FlowRouterTitle(FlowRouter);
new FlowRouterMeta(FlowRouter);
