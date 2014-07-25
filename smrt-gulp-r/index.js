/**
 * @license Copyright (c) 2014 Nicholas Kostelnik
 * @license Copyright (c) 2014 smrtlabs
 * For licensing, see LICENSE
 */

"use strict";

var path = require("path"),
    gutil = require("gulp-util"),
    OptimizerSettings = require(path.join(__dirname, "/OptimizerSettings")),
    PluginError = gutil.PluginError,
    PLUGIN_NAME = "gulp-r",
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
    return optimizeFile(file, encoding, options);
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
 * @param {smrt-gulp-r/OptimizerSettings} options valid optimizer options
 * @returns {Promise} resolved if optimized successfully, rejected otherwise
 */
function optimizeFile(file, encoding, options) {
    var fileOptions,
        include = path.basename(file.path).replace(path.extname(file.path), ""),
        optimizeFileDeferred = Q.defer(),
        optimizeFilePromise = optimizeFileDeferred.promise;

    fileOptions = {
        "baseUrl": options.baseUrl,
        "include": include,
        "out": function (text, sourceMapText) {
            // console.log(sourceMapText);
            file.contents = new Buffer(text, encoding);
        },
        "paths": options.paths
    };

    if (options.name) {
        fileOptions.name = path.relative(options.baseUrl, options.name);
    }

    function errback(err) {
        optimizeFileDeferred.reject(err);
    }

    try {
        process.chdir(options.baseUrl);
    } catch (err) {
        optimizeFileDeferred.reject(err);

        return optimizeFilePromise;
    }

    requirejs.optimize(fileOptions, function () {
        optimizeFileDeferred.resolve(file);
    }, errback);

    return optimizeFilePromise;
}

/**
 * @param {Object} options user input configuration
 * @returns {Promise} resolved if options are valid, rejected otherwise
 */
function validateOptions(options) {
    var validateOptionsDeferred = Q.defer(),
        validateOptionsPromise = validateOptionsDeferred.promise;

    try {
        validateOptionsDeferred.resolve(new OptimizerSettings(options));
    } catch (err) {
        validateOptionsDeferred.reject(err);
    }

    return validateOptionsPromise;
}

module.exports = function (options) {
    var validateOptionsPromise = validateOptions(options);

    return through.obj(function (file, encoding, callback) {
        var that = this;

        function onError(err) {
            callback(new PluginError(PLUGIN_NAME, err.message), file);
        }

        function onSuccess(optimized) {
            callback(null, optimized);
        }

        validateOptionsPromise
            .then(function (validatedOptions) {
                if (file.isNull()) {
                    return handleNullStream(that, file, encoding, validatedOptions);
                }

                return handleFileStream(that, file, encoding, validatedOptions);
            })
            .then(onSuccess, onError);
    });
};
