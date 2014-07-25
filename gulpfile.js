/**
 * @license Copyright (c) 2014, smrtlabs
 * For licensing, see LICENSE
 */

"use strict";

var assert = require("chai").assert,
    cached = require("gulp-cached"),
    esformatter = require("gulp-esformatter"),
    eslint = require("gulp-eslint"),
    fs = require("fs"),
    gulp = require("gulp"),
    istanbul = require("gulp-istanbul"),
    mocha = require("gulp-mocha"),
    path = require("path");

/*eslint no-sync: 0 */

global.paths = {
    "configs": {
        "esformatter": path.join(__dirname, ".esformatter"),
        "eslintrc": path.join(__dirname, ".eslintrc")
    },
    "coverage": {
        "root": path.join(__dirname, "node_coverage")
    },
    "gulpfile": __filename,
    "libs": {
        "files": path.join(__dirname, "smrt-*/{*.js,tests/**/*.js}")
    },
    "tests": {
        "files": path.join(__dirname, "smrt-*/**/*.test.js")
    },
    "root": __dirname
};

global.paths.all = [
    global.paths.gulpfile,
    global.paths.libs.files,
    global.paths.tests.files
];

gulp.task("beautify", function (done) {
    fs.readFile(global.paths.configs.esformatter, function (err, config) {
        assert.ifError(err);

        gulp.src(global.paths.all)
            .pipe(cached("beautifying"))
            .pipe(esformatter(JSON.parse(config.toString("utf8"))))
            .pipe(gulp.dest(global.paths.root))
            .on("end", done);
    });
});

gulp.task("cover", function (done) {
    gulp.src(global.paths.libs.files)
        .pipe(istanbul())
        .on("end", function () {
            gulp.src(global.paths.tests.files)
                .pipe(mocha())
                .pipe(istanbul.writeReports(global.paths.coverage.root))
                .on("end", done);
        });
});

gulp.task("lint", ["beautify"], function (done) {
    fs.readFile(global.paths.configs.eslintrc, function (err, config) {
        assert.ifError(err);

        gulp.src(global.paths.all)
            .pipe(eslint(JSON.parse(config.toString("utf8"))))
            .pipe(eslint.format())
            .on("end", done);
    });
});

gulp.task("test", ["lint"], function (done) {
    Error.stackTraceLimit = Infinity;

    gulp.src(global.paths.tests.files)
        .pipe(mocha())
        .on("end", done);
});

gulp.task("watch", function () {
    gulp.src(global.paths.all).pipe(cached("beautifying"));
    gulp.watch(global.paths.all, ["default"]);
});

gulp.task("default", ["beautify", "lint", "test"]);
