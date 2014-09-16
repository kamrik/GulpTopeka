var path = require('path');
var fs = require('fs');
var Q = require('q');
var gulp = require('gulp');
var del = require('del');
var cdv = require('cordova-lib').cordova;

// TODO: export tis from cca to avoid the hackish 'require'
var createApp = require('cca/src/create-app');
var ccaRoot = path.dirname(path.dirname(require.resolve('cca')));

var buildDir = path.join(__dirname, 'build');
var srcDir = path.join(__dirname, 'src');

var flags = {};
// Build for Android?
flags.android = true;
// Build for iOS?
flags.ios = false;
// Where html/js and the manifest files are for cca to link to.
flags['link-to'] = path.join(srcDir, 'www');

var manifest = require('./src/www/manifest.mobile.json');
var appId = manifest.packageId;
var pkg = require('./package.json');

// Note, most org.chromium.* plugins should be added by adding permissions to the manifest.
// Only use extra_plugins list to add plugins that can't be added via the manifest.
var extra_plugins = [];
// TODO: add a check here to verify empty intersection with cca.pluginMap

gulp.task('clean', function(cb) {
  	del(['build'], cb);
});

gulp.task('ccacreate', ['clean'], function() {
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

// Prepare is not really needed
gulp.task('prepare', function() {
    process.chdir(buildDir);
    return cdv.prepare();
});

gulp.task('build', function() {
    process.chdir(buildDir);
    return cdv.build();
});

gulp.task('release', function() {
    process.chdir(buildDir);
    return cdv.build({options: ['--release']});
    // TODO: copy the apk file(s) out of ./build/.
});
