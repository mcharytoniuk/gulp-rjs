/**
 * @license Copyright (c) 2014 Nicholas Kostelnik
 * @license Copyright (c) 2014 smrtlabs
 * For licensing, see LICENSE
 */

"use strict";

/* global after: false, before: false, describe: false, it: false */

var assert = require("chai").assert,
    path = require("path"),
    FS = require("q-io/fs"),
    gulp = require("gulp"),
    gulpr = require(path.join(global.paths.root, "/smrt-gulp-r")),
    mktemp = require("mktemp"),
    rimraf = require("rimraf"),
    Q = require("q"),
    through = require("through2");

/**
 * @param {String} pattern name of temporary directory to be created
 * @returns {Promise} resolved if created successfully, rejected otherwise
 */
function createTemporaryDirectory(pattern) {
    var temporaryDirectoryDeferred = Q.defer(),
        temporaryDirectoryPromise = temporaryDirectoryDeferred.promise;

    mktemp.createDir(pattern, function (err, directoryPath) {
        if (err) {
            temporaryDirectoryDeferred.reject(err);

            return;
        }

        directoryPath = path.resolve(directoryPath);
        temporaryDirectoryDeferred.resolve(directoryPath);
    });

    return temporaryDirectoryPromise;
}

/**
 * @param {String} testSuiteName test suite name
 * @param {Object} options test suite configuration
 * @returns {Function} ready to execute gulp test suite
 */
function createTestSuite(testSuiteName, options) {
    var destinationDirectory,
        expectedResults;

    after(function (done) {
        rimraf(destinationDirectory, done);
    });

    before(function (done) {
        var listDirectoryPromise,
            temporaryDirectoryPromise = createTemporaryDirectory("rjs-XXX.cache");

        temporaryDirectoryPromise.then(function (directoryName) {
            destinationDirectory = path.resolve(directoryName);
        }, assert.ifError);

        listDirectoryPromise = readExpectedFiles(options.expected).then(function (expectedFiles) {
            expectedResults = expectedFiles;
        });

        Q.all([listDirectoryPromise, temporaryDirectoryPromise]).then(function () {
            done();
        });
    });

    it(testSuiteName, function (done) {
        var actualResults = {};

        gulp.src(options.fixtures)
            .pipe(gulpr(options.optimizer))
            // .on("error", function (err) {
            //     console.error(err);
            // })
            .pipe(through.obj(function (file, enc, callback) {
                var actualResult = file.contents.toString(enc).trim(),
                    fileBaseName = path.basename(file.path);

                actualResults[fileBaseName] = actualResult.trim();

                this.push(file);

                callback();
            }))
            .pipe(gulp.dest(destinationDirectory))
            .on("end", function () {
                validateFiles(expectedResults, actualResults).then(function () {
                    done();
                }, done);
            });
    });
}

/**
 * @param {String} baseDirectory path to base directory
 * @returns {Promise} resolved if directory is read, rejected otherwise
 */
function readExpectedFiles(baseDirectory) {
    return FS
        .list(baseDirectory)
        .then(function (files) {
            return Q.all(files.map(function (file) {
                var filePath = path.join(baseDirectory, file);

                return FS
                    .read(filePath)
                    .then(function (contents) {
                        return {
                            "contents": contents,
                            "name": filePath
                        };
                    });
            }));
        })
        .then(function (results) {
            var i,
                ret = {};

            for (i = 0; i < results.length; i += 1) {
                ret[path.basename(results[i].name)] = results[i].contents;
            }

            return ret;
        });
}

/**
 * @param {String} fileBaseName base name of file to be validated
 * @param {String} expectedResult correct file content
 * @param {String} actualResult actual file content
 * @returns {Promise} resolved if files are correct, rejected otherwise
 */
function validateFile(fileBaseName, expectedResult, actualResult) {
    var validateFileDeferred = Q.defer(),
        validateFilePromise = validateFileDeferred.promise;

    try {
        assert.isString(actualResult, fileBaseName);
        assert.isString(expectedResult, fileBaseName);

        assert.strictEqual(actualResult.trim(), expectedResult.trim(), fileBaseName);
    } catch (err) {
        validateFileDeferred.reject(err);

        return validateFilePromise;
    }

    validateFileDeferred.resolve();

    return validateFilePromise;
}

/**
 * @param {Object} expectedResults list of correct files contents
 * @param {Object} actualResults list of actual files contents
 * @returns {Promise} resolved if files are correct, rejected otherwise
 */
function validateFiles(expectedResults, actualResults) {
    var property,
        validateFilesPromises = [];

    for (property in expectedResults) {
        if (expectedResults.hasOwnProperty(property)) {
            validateFilesPromises.push(validateFile(property, expectedResults[property], actualResults[property]));
        }
    }

    return Q.all(validateFilesPromises);
}

describe("smrt-gulp-r", function () {
    createTestSuite("concatenates files with gulp", {
        "expected": path.join(__dirname, "../fixtures/basic/out"),
        "fixtures": path.join(__dirname, "../fixtures/basic/app/*.js"),
        "optimizer": {
            "baseUrl": path.join(__dirname, "../fixtures/basic/app")
        }
    });

    createTestSuite("generates source maps", {
        "expected": path.join(__dirname, "../fixtures/sourcemap/out"),
        "fixtures": path.join(__dirname, "../fixtures/sourcemap/app/*.js"),
        "optimizer": {
            "baseUrl": path.join(__dirname, "../fixtures/sourcemap/app"),
            "generateSourceMaps": true,
            "optimize": "uglify2",
            "preserveLicenseComments": false
        }
    });

    createTestSuite("prepends files with almond loader", {
        "expected": path.join(__dirname, "../fixtures/almond/out"),
        "fixtures": path.join(__dirname, "../fixtures/almond/app/*.js"),
        "optimizer": {
            "baseUrl": path.join(__dirname, "../fixtures/almond/app"),
            "name": path.join(__dirname, "../fixtures/almond/myalmond.js")
            // "paths": {
            //     "almond": path.join(__dirname, "../fixtures/almond/myalmond.js")
            // }
        }
    });

    // createTestSuite("prepends files with almond loader", {
    //     "expected": path.join(__dirname, "../fixtures/almond/out"),
    //     "fixtures": path.join(__dirname, "../fixtures/almond/app/*.js"),
    //     "optimizer": {
    //         "baseUrl": path.join(__dirname, "../fixtures/almond/app"),
    //         "name": "almond",
    //         "paths": {
    //             "almond": path.join(__dirname, "../fixtures/almond/myalmond.js")
    //         }
    //     }
    // });
});
