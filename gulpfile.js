// heavily based on Eoin McGrath's Roboflip gulpfile
// https://github.com/eoinmcg/roboflip

var babel = require('gulp-babel'),
    buffer = require('vinyl-buffer')
    cheerio = require('cheerio'),
    concat = require('gulp-concat'),
    connect = require('gulp-connect'),
    fs = require('fs'),
    gulp = require('gulp'),
    gutil = require('gulp-util'),
    htmlmin = require('gulp-htmlmin'),
    rimraf = require('gulp-rimraf'),
    rename = require('gulp-rename'),
    replace = require('gulp-replace'),
    rollup = require('rollup-stream'),
    source = require('vinyl-source-stream'),
    sourcemaps = require('gulp-sourcemaps'),
    uglify = require('gulp-uglify'),
    zip = require('gulp-zip'),
    exclude_min = [ /* 'js/jsfxr.min.js' */],
    config = { js: [] };


gulp.task('build', ['clean', 'jsmin', 'inlinejs', 'zip', 'report']);

gulp.task('watch', function() {
  gulp.watch(['./src/*.html', './src/js/*.js'], ['reload']);
});

gulp.task('reload', ['report'], function() {
  gulp.src('./src/*.html')
    .pipe(connect.reload());
})

gulp.task('connect', ['build'], function() {
  connect.server({
    livereload: true,
    root: ['build', 'src']
  });
});

gulp.task('serve', ['connect', 'watch']);

gulp.task('clean', function() {
  // delete prev files
  gulp.src('dist/*')
    .pipe(rimraf())

  return gulp.src('build/*')
        .pipe(rimraf());
});

gulp.task('jsmin', ['clean'], function() {

  // rollup converts imported ES6 modules into ES5 functions with tree-shaking
  return rollup({
      entry: './src/js/game.js',
      // wrap global variables/functions into in IIFE so uglify will rename them
      format: 'iife',
      sourceMap: true
    })
    .pipe(source('game.js', './src'))
    .pipe(buffer())
    .pipe(sourcemaps.init({ loadMaps: true}))
    // babels convert ES6 down to ES5
    .pipe(babel({
       presets: ['es2015']
     }))
    // uglify shrinks JS code down
    .pipe(uglify())
    // drop strict mode to allow the use of onresize=onrotate=... but that throws off the sourcemaps by 2 lines
    .pipe(replace('"use strict";', ''))
    .pipe(replace("'use strict';", ''))
    .pipe(sourcemaps.write('.'))
    .pipe(gulp.dest('./build/js/'));
});

gulp.task('inlinejs', ['jsmin'], function() {

  var js = fs.readFileSync('./build/js/game.js', 'utf-8', function(e, data) {
    return data;
  });

  var i, extra_js = '';

  for (i = 0; i < exclude_min.length; i += 1) {
    console.log(exclude_min[i])
    extra_js += fs.readFileSync('./src/' + exclude_min[i], 'utf-8', function(e, data) {
      return data;
    });
  }
  console.log(extra_js.length, 'OK', exclude_min);

  return gulp.src('./src/index.html')
    .pipe(replace(/<script.*>(.|\n)*<\/script>/i, function() { return '<script>'+extra_js+' '+js+'</script>' }))
    .pipe(htmlmin({collapseWhitespace: true}))
    .pipe(gulp.dest('./dist'))

});

gulp.task('zip', ['inlinejs'], function() {

  return gulp.src('./dist/index.html')
      .pipe(zip('game.zip'))
      .pipe(gulp.dest('./dist'));

});


gulp.task('report', ['zip'], function() {

  var stat = fs.statSync('dist/game.zip'),
      limit = 1024 * 13,
      size = stat.size,
      remaining = limit - size,
      percentage = (remaining / limit) * 100;

  percentage = Math.round(percentage * 100) / 100

  console.log('\n\n-------------');
  console.log('BYTES USED: ' + stat.size);
  console.log('BYTES REMAINING: ' + remaining);
  console.log(percentage +'%');
  console.log('-------------\n\n');

});


// base64 encode png spritesheet asset and inline it in js
gulp.task('encode', function()  {

  var assets = [
    { image: 'img/tileset.png', property: 'tileset' },
    { image: 'img/charset.png', property: 'charset' }
  ];

  var loaders = [];
  assets.forEach(function(asset) {
    loaders.push(new Promise(function(resolve) {
      fs.readFile('src/' + asset.image, function(err, data) {
        asset.data = 'data:image/png;base64,' + data.toString('base64');
        resolve(asset);
      });
    }));
  });

  return Promise.all(loaders).then(function(values) {
    var stream = gulp.src('src/js/game.js');

    values.forEach(function(value) {
      stream.pipe(replace(new RegExp(value.property + ' = \'.*\'', 'gm'),
                          value.property + ' = \'' + value.data + '\''));
    });

    return stream.pipe(gulp.dest('./src/js/'));
  });

});
