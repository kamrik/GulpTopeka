var path = require('path');
var fs = require('fs');
var Q = require('q');
var gulp = require('gulp');
var vulcanize = require('gulp-vulcanize');
var sass = require('gulp-sass');
var jeditor = require("gulp-json-editor");
var bower = require("gulp-bower");
var merge = require('merge-stream');
var del = require('del');
var cdv = require('cordova-lib').cordova;

// TODO: export tis from cca to avoid 'require' from deep within a package
var createApp = require('cca/src/create-app');
var ccaRoot = path.dirname(path.dirname(require.resolve('cca')));

// CCA project lives in this dir, but is treated as build artifact.
var buildDir = path.join(__dirname, 'build');

var flags = {};
// Build for Android?
flags.android = true;
// Build for iOS?
flags.ios = false;
// Where html/js and the manifest files are for cca to link to.
flags['link-to'] = path.join(__dirname, 'vulcanized');

// TODO: synchronize appId with packageId in manifest.mobile.json.
var appId = 'org.examples.gulptopeka';
var pkg = require('./package.json');

// Note, most org.chromium.* plugins should be added by adding permissions to the manifest.
// Only use extra_plugins list to add plugins that can't be added via the manifest.
var extra_plugins = [];

gulp.task('clean', function(cb) {
    del(['build', 'vulcanized'], cb);
});

gulp.task('bower', function() {
  return bower({ cwd: './topeka' })
});

// Run vulcanize.
// If the src and dest dirs are different for vulcanize, it will adjust
// file references in the vulcanized index html file. This will break things
// unless the relative locations of index.html and componetns/ change accordingly.
gulp.task('vulcanize', ['statics'], function () {
    return gulp.src('./vulcanized/index.html')
        .pipe(vulcanize({dest: 'vulcanized', csp:true }))
        .pipe(gulp.dest('vulcanized'));
});

// Copy manifest files (with minor adjustments)
// Later we might filter them directly into Cordova's confix.xml
gulp.task('manifest', function () {
    var m2 =  gulp.src('./topeka/manifest.mobile.json')
                  .pipe(gulp.dest('./vulcanized'));

    // Set some fields in the manifest
    var m1 = gulp.src("./topeka/manifest.json")
                 .pipe(jeditor( {oauth2: {client_id: 'something'}} ))
                 .pipe(gulp.dest("./vulcanized"));
    return merge(m1, m2);
});

// Copy all static files.
// TODO: figure out if we can copy less things, especially considering the vulcanized main files.
gulp.task('statics', function () {
    staticFiles = [
        './topeka/icons/**/*.*', 'topeka/favicon.ico', 'topeka/images/**/*.*', 'topeka/background.js',
        'topeka/components/**/*.*', 'topeka/polyfills/**/*.*',
        'topeka/index.html'
    ];
    return gulp.src(staticFiles, { base: './topeka/' })
               .pipe(gulp.dest('./vulcanized'));
});

// Sass: Compile *.scss files.
// This is not really needed for Topeka because on doesn't use sass, but since
// scss syntax is a superset of css, it still works and give a good example of
// how to use sass.
gulp.task('sass', function () {
    gulp.src('./topeka/*.*css')
        .pipe(sass())
        .pipe(gulp.dest('./vulcanized'));
});

// Build a Chrome App with manifests and vulcanized index.html
gulp.task('app', ['statics', 'manifest', 'sass', 'vulcanize'] , function () {});


//////////////////// CCA TASKS /////////////////////////////////

// cca create
gulp.task('ccacreate', ['app'], function() {
    return createApp(buildDir, ccaRoot, __dirname, appId, pkg.name, flags)
    .then(function() {
        // Further Cordova commands must be run inside the cordova project dir.
        process.chdir(buildDir);
    })
    .then(function() {
    	if (extra_plugins.length) {
        	return cdv.plugins('add', extra_plugins);
        }
    });
});

// cca prepare
// Prepare is not really needed, but good for diagnostics
gulp.task('prepare', function() {
    process.chdir(buildDir);
    return cdv.prepare();
});

// cca build
gulp.task('build', function() {
    process.chdir(buildDir);
    return cdv.build();
});

// cca build --release
gulp.task('release', function() {
    process.chdir(buildDir);
    return cdv.build({options: ['--release']});
    // TODO: copy the apk file(s) out of ./build/.
});

// cca run
gulp.task('run', function() {
    process.chdir(buildDir);
    return cdv.run();
});
