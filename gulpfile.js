var gulp = require('gulp');
var jscs = require('gulp-jscs');
var jshint = require('gulp-jshint');
var babel = require('gulp-babel');
var browserify = require('browserify');
var babelify = require('babelify');
var source = require('vinyl-source-stream');
var buffer = require('vinyl-buffer');
var sourcemaps = require('gulp-sourcemaps');
var uglify = require('gulp-uglify');
var rename = require('gulp-rename');
var del = require('del');
var karma = require('karma');
var esdoc = require('gulp-esdoc');

gulp.task('lint', function() {
   return gulp.src('src/*.js')
      .pipe(jscs({
         fix: true
      }))
      .pipe(jscs.reporter())
      .pipe(jscs.reporter('fail'))
      .pipe(jshint())
      .pipe(jshint.reporter('default'))
      .pipe(jshint.reporter('fail'))
      .pipe(gulp.dest('src'));
});

gulp.task('test', function(done) {
   new karma.Server({
      configFile: __dirname + '/karma.conf.js'
   }, done).start();
});

gulp.task('documentation', function () {
   return gulp.src('src')
      .pipe(esdoc());
});

gulp.task('clean', function () {
   return del([
      'dist/*',
      'doc/**/*',
      'coverage/**/*'
   ]);
});

gulp.task('build', function() {
   var browserifyInstance = browserify({
         entries: 'src/github-extended.js',
         standalone: 'Github',
         transform: [babelify]
      });

   browserifyInstance
      .bundle()
      .pipe(source('github-extended.js'))
      .pipe(buffer())
      .pipe(uglify())
      .pipe(rename({
         extname: '.bundle.min.js'
      }))
      .pipe(gulp.dest('demo'));

   return gulp.src('src/github-extended.js')
      .pipe(sourcemaps.init())
      .pipe(babel())
      .pipe(rename({
         extname: '.min.js'
      }))
      .pipe(uglify())
      .pipe(sourcemaps.write('.'))
      .pipe(gulp.dest('dist'));
});

gulp.task('default', ['clean', 'lint', 'test', 'documentation', 'build']);