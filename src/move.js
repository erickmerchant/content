const assert = require('assert')
const chalk = require('chalk')
const path = require('path')
const thenify = require('thenify')
const fs = require('fs')
const slugify = require('slugg')
const pathTo = require('path-to-regexp')
const readFile = thenify(fs.readFile)
const withCson = require('./with-cson')

module.exports = function (deps) {
  assert.equal(typeof deps.makeDir, 'function')

  assert.equal(typeof deps.writeFile, 'function')

  assert.equal(typeof deps.out, 'object')

  assert.equal(typeof deps.out.write, 'function')

  return function ({parameter, option}) {
    parameter('source', {
      description: 'the file to move',
      required: true
    })

    parameter('destination', {
      description: 'the directory to move it to',
      required: true
    })

    option('title', {
      description: 'a new title'
    })

    option('update', {
      description: 'update the time'
    })

    option('no-date', {
      description: 'do not include the time'
    })

    option('ext', {
      description: 'the extension to use',
      type: function ext (val) {
        return val
      }
    })

    return function (args) {
      const pathResult = pathTo(`:time(\\d+).:slug${path.extname(args.source)}`).exec(path.basename(args.source))
      let now
      let slug

      if (pathResult) {
        now = pathResult[1]

        slug = pathResult[2]
      } else {
        now = Date.now()

        slug = path.basename(args.source, (args.ext ? '.' + args.ext : path.extname(args.source)))
      }

      return readFile(args.source, 'utf-8').then(function (string) {
        const object = withCson.parse(string)

        if (args.update) {
          now = Date.now()
        }

        if (args.title != null) {
          slug = slugify(args.title)

          object.title = args.title
        }

        const file = path.join(args.destination, `${!now || args.noDate ? '' : now + '.'}${slug}${args.ext ? '.' + args.ext : path.extname(args.source)}`)

        return deps.makeDir(path.dirname(file)).then(function () {
          return deps.rename(args.source, file).then(function () {
            return deps.writeFile(file, withCson.stringify(object)).then(function () {
              deps.out.write(chalk.green('\u2714') + ' saved ' + file + '\n')
            })
          })
        })
      })
    }
  }
}
