# polacks-gulp-rjs

First, install `polacks-gulp-rjs` as a development dependency:

```shell
npm install --save-dev gulp-r
```

Then, use it in your `gulpfile.js`:

```javascript
var rjs = require("gulp-r");

gulp.src("app/scripts/*.js")
    .pipe(rjs({
        "baseUrl": "app/scripts"
    }))
    .pipe(gulp.dest("./dist/scripts"));
```

## Status

This fork is maintained independently from its origin.

---

[![Build Status](https://travis-ci.org/polacks/polacks-gulp-rjs.svg?branch=master)](https://travis-ci.org/polacks/polacks-gulp-rjs)
[![Code Climate](https://codeclimate.com/github/polacks/polacks-gulp-rjs.png)](https://codeclimate.com/github/polacks/polacks-gulp-rjs)
[![Dependency Status](https://david-dm.org/polacks/polacks-gulp-rjs.svg)](https://david-dm.org/polacks/polacks-gulp-rjs)
