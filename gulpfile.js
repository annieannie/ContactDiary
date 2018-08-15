var gulp =  require('gulp');
var browserSync = require('browser-sync');
var reload = browserSync.reload;
var autoprefixer = require('gulp-autoprefixer');
var clean = require('gulp-clean');
var concat = require('gulp-concat');
var browserify = require('gulp-browserify');
var merge = require('merge-stream');
var newer = require('gulp-newer');
var imagemin = require('gulp-imagemin');
var injectPartials = require('gulp-inject-partials');
var minify = require('gulp-minify');
var rename = require('gulp-rename');
var cssmin = require('gulp-cssmin');
var htmlmin = require('gulp-htmlmin');

var SOURCEPATHS = {
  cssApp: 'src/*.css',
  maincssApp: 'src/main.css',
  htmlSource: 'src/index.html',
  jsSource: 'src/main.js',
  tempFolder: 'src/templates/*.html'
};

var DOCPATH = {
  root: 'docs/',
  css: 'docs/css',
  js: 'docs/js',
  fonts: 'docs/fonts',
  img: 'docs/img',
  tempFolder: 'docs/templates'
}

/** start of PRODUCTION TASKS **/
gulp.task('compress', function () {
  var ngInfiniteScroll = gulp.src('./node_modules/ng-infinite-scroll/build/ng-infinite-scroll.min.js');
  var jsFiles = gulp.src(SOURCEPATHS.jsSource)
  return merge(jsFiles ,ngInfiniteScroll)
    .pipe(concat( 'app.js'))
    .pipe(gulp.dest(DOCPATH.js));
});

gulp.task('compresscss', function () {
  var bootStrapCss = gulp.src('./node_modules/bootStrap/dist/css/bootstrap.css');
  var sassFiles = gulp.src(SOURCEPATHS.cssApp)
  return merge(sassFiles, bootStrapCss)
    .pipe(concat( 'app.css'))
    .pipe(cssmin())
    .pipe(rename({suffix: '.min'}))
    .pipe(gulp.dest(DOCPATH.css));
});

gulp.task('minifyHtml', ['teplates'], function () {
  return gulp.src(SOURCEPATHS.htmlSource)
 .pipe(htmlmin({collapseWhitespace: true}))
  .pipe(gulp.dest(DOCPATH.root));
});

gulp.task('teplates', function(){
  return gulp.src(SOURCEPATHS.tempFolder)
  .pipe(gulp.dest(DOCPATH.root));
})

/** End of PRODUCTION TASKS **/

gulp.task('serve', function () {
  browserSync.init([DOCPATH.css + '/*.css', DOCPATH.root + '/*.html', DOCPATH.js + '/*.js'], {
    server: {
      baseDir: DOCPATH.root
    }
  })
});

gulp.task('production', [ 'serve', 'compresscss', 'minifyHtml', 'compress']);
