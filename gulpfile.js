// heavily based on Eoin McGrath's Roboflip gulpfile
// https://github.com/eoinmcg/roboflip

var babel = require('rollup-plugin-babel'),
    browserSync = require('browser-sync').create(),
    fs = require('fs'),
    gulp = require('gulp'),
    htmlmin = require('gulp-htmlmin'),
    rimraf = require('rimraf'),
    replace = require('gulp-replace'),
    resolve = require('rollup-plugin-node-resolve'),
    rollup = require('rollup').rollup,
    uglify = require('rollup-plugin-uglify'),
    zip = require('gulp-zip'),
    exclude_min = [ /* 'js/jsfxr.min.js' */],
    config = { js: [] };

gulp.task('build', ['clean', 'jsmin', 'inlinejs', 'zip', 'report']);

gulp.task('reload', ['build'], function() {
  // TODO figure out a way to reload after 'jsmin', but still have 'report' going after that
  browserSync.reload();
});

gulp.task('serve', ['build'], function() {
  browserSync.init({
    server: ['build', 'src']
  });
  gulp.watch(['src/*.html', 'src/js/*.js'], ['reload']);
});


gulp.task('clean', function(done) {
  rimraf.sync('build/');
  rimraf('dist/', done);
});

gulp.task('jsmin', ['clean'], async function() {

  // rollup converts imported ES6 modules into ES5 functions with tree-shaking
  const bundle = await rollup({
    input: 'src/js/game.js',
    plugins: [
      resolve(),
      // babels convert ES6 down to ES5
      babel({
        presets: [
          [
            'es2015', {
              modules: false
            }
          ]
        ],
        plugins: ['external-helpers']
      }),
      // uglify shrinks JS code down
      uglify()
    ]
  });
  await bundle.write({
    file: 'build/js/game.js',
    // wrap global variables/functions into in IIFE so uglify will rename them
    format: 'iife',
    sourcemap: true
  });
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
    // strip the <body> tag inserted by htmlmin, browsers give this tag for free
    .pipe(replace(/<body>/, ''))
    .pipe(replace(/<\/body>/, ''))
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
    // { image: 'img/tileset.png', property: 'tileset' },
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
