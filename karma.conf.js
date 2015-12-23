'use strict';

module.exports = function(config) {
   config.set({
      browserify: {
         debug: true,
         transform: [
            'babelify',
            'browserify-istanbul'
         ]
      },
      browsers: ['PhantomJS'],
      browserNoActivityTimeout: 15000,
      captureTimeout: 3000,
      client: {
         mocha: {
            timeout: 15000,
            ui: 'bdd'
         }
      },
      coverageReporter: {
         type : 'html',
         dir : 'coverage/'
      },
      files: [
         'node_modules/babel-polyfill/dist/polyfill.js',
         'test/spec/*.js'
      ],
      frameworks: [
         'browserify',
         'mocha',
         'chai-as-promised',
         'chai'
      ],
      port: 9001,
      preprocessors: {
         'test/spec/*.js': ['browserify']
      },
      reporters: [
         'mocha',
         'coverage'
      ],
      reportSlowerThan: 800,
      singleRun: true
   });
};