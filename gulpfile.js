var gulp = require('gulp'),
    jshint = require('gulp-jshint'),
    jscs   = require('gulp-jscs'),
    jscpd = require('gulp-jscpd'),
    complexity = require('gulp-complexity'),
    minimist = require('minimist'),
    knownOptions, options, configCS, configCPD;

knownOptions = {
    string: [ 'target', 'reporter-lint', 'reporter-cs', 'output-cpd' ],
    default: { "target": '*.js', "reporter-lint": 'default' }
};

configCS = {
    configPath: '.jscsrc'
};
configCPD = {
    verbose: true
};

options = minimist(process.argv.slice(2), knownOptions);

if (options['reporter-cs']) {
    configCS.reporter = options['reporter-cs'];
}

if (options['output-cpd']) {
    configCPD.output = options['output-cpd'];
}

gulp.task('lint', function() {
    return gulp.src(options.target)
        .pipe(jshint())
        .pipe(jshint.reporter(options['reporter-lint']));
});

gulp.task('cs', function(cb) {
    return gulp.src(options.target)
        .pipe(jscs(configCS));

    cb();
});

gulp.task('cpd', function(cb) {
    return gulp.src(options.target)
        .pipe(jscpd(configCPD));
    cb();
});

gulp.task('pmd', function(cb) {
    return gulp.src(options.target)
        .pipe(complexity());

    cb();
});
