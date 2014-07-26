/**
 * @license Copyright (c) 2014 Nicholas Kostelnik
 * @license Copyright (c) 2014 smrtlabs
 * For licensing, see LICENSE
 */

"use strict";

var path = require("path"),
    _ = require("lodash"),
    gutil = require("gulp-util"),
    OptimizerSettings = require(path.join(__dirname, "/OptimizerSettings")),
    PLUGIN_NAME = "gulp-r",
    PluginError = gutil.PluginError,
    Q = require("q"),
    requirejs = require("requirejs"),
    through = require("through2");

/**
 * @param {*} stream through2 stream object
 * @param {*} file through2 file stream
 * @param {String} encoding file encoding
 * @param {smrt-gulp-r/OptimizerSettings} options valid optimizer options
 * @returns {Promise} resolved if handled successfully, rejected otherwise
 */
function handleFileStream(stream, file, encoding, options) {
    var doOptimizeFile = _.curry(optimizeFile)(file, encoding, options);

    return normalizeFileOptions(file, encoding, options).then(doOptimizeFile);
}

/**
 * @param {*} stream through2 stream object
 * @param {*} file through2 file stream
 * @param {String} encoding file encoding
 * @param {smrt-gulp-r/OptimizerSettings} options valid optimizer options
 * @returns {Promise} resolved if handled successfully, rejected otherwise
 */
function handleNullStream(stream, file) {
    var handleNullStreamDeferred = Q.defer();

    handleNullStreamDeferred.resolve(file);

    return handleNullStreamDeferred.promise;
}

/**
 * @param {*} file through2 file stream
 * @param {String} encoding file encoding
 * @param {Object} options user input configuration
 * @returns {Promise} resolved if options are valid, rejected otherwise
 */
function normalizeFileOptions(file, encoding, options) {
    var fileOptions = _.clone(options),
        include = path.basename(file.path).replace(path.extname(file.path), ""),
        normalizeFileOptionsDeferred = Q.defer(),
        normalizeFileOptionsPromise = normalizeFileOptionsDeferred.promise;

    fileOptions.out = function (text, sourceMapText) {
        // console.log(sourceMapText);
        file.contents = new Buffer(text, encoding);
    };

    if (fileOptions.name) {
        fileOptions.name = path.relative(fileOptions.baseUrl, fileOptions.name);
        fileOptions.include = include;
    } else {
        fileOptions.name = include;
    }

    normalizeFileOptionsDeferred.resolve(fileOptions);

    return normalizeFileOptionsPromise;
}

/**
 * @param {Object} options user input configuration
 * @returns {Promise} resolved if options are valid, rejected otherwise
 */
function normalizeStreamOptions(options) {
    var normalizeStreamOptionsDeferred = Q.defer(),
        normalizeStreamOptionsPromise = normalizeStreamOptionsDeferred.promise;

    try {
        normalizeStreamOptionsDeferred.resolve(new OptimizerSettings(options));
    } catch (err) {
        normalizeStreamOptionsDeferred.reject(err);
    }

    return normalizeStreamOptionsPromise;
}

/**
 * @param {*} file through2 file stream
 * @param {String} encoding file encoding
 * @param {smrt-gulp-r/OptimizerSettings} options valid optimizer options
 * @param {smrt-gulp-r/OptimizerSettings} fileOptions valid file options
 * @returns {Promise} resolved if optimized successfully, rejected otherwise
 */
function optimizeFile(file, encoding, options, fileOptions) {
    var optimizeFileDeferred = Q.defer(),
        optimizeFilePromise = optimizeFileDeferred.promise;

    function errback(err) {
        optimizeFileDeferred.reject(err);
    }

    try {
        // r.js goes nuts sometimes without changing CWD
        // this prevents some edge case failures
        process.chdir(options.baseUrl);
    } catch (err) {
        errback(err);

        return optimizeFilePromise;
    }

    requirejs.optimize(fileOptions, function () {
        optimizeFileDeferred.resolve(file);
    }, errback);

    return optimizeFilePromise;
}

module.exports = function (options) {
    var normalizeStreamOptionsPromise = normalizeStreamOptions(options);

    return through.obj(function (file, encoding, callback) {
        var that = this;

        function onError(err) {
            callback(new PluginError(PLUGIN_NAME, err.message), file);
        }

        function onSuccess(optimized) {
            callback(null, optimized);
        }

        normalizeStreamOptionsPromise
            .then(function (validatedOptions) {
                if (file.isNull()) {
                    return handleNullStream(that, file, encoding, validatedOptions);
                }

                return handleFileStream(that, file, encoding, validatedOptions);
            })
            .then(onSuccess, onError);
    });
};
