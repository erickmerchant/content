const assert = require('assert')
const chalk = require('chalk')
const path = require('path')
const promisify = require('util').promisify
const fs = require('fs')
const slugify = require('slugg')
const pathTo = require('path-to-regexp')
const readFile = promisify(fs.readFile)
const cson = require('cson-parser')

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
      description: 'a new title',
      type: function title (val) {
        return val
      }
    })

    option('update', {
      description: 'update the time'
    })

    option('no-date', {
      description: 'do not include the time'
    })

    return function (args) {
      const pathResult = pathTo(`:time(\\d+).:slug.cson`).exec(path.basename(args.source))
      let now
      let slug

      if (pathResult) {
        now = pathResult[1]

        slug = pathResult[2]
      } else {
        now = Date.now()

        slug = path.basename(args.source, '.cson')
      }

      return readFile(args.source, 'utf-8').then(function (string) {
        const object = cson.parse(string)

        if (args.update) {
          now = Date.now()
        }

        if (args.title != null) {
          slug = slugify(args.title)

          object.title = args.title
        }

        const file = path.join(args.destination, `${!now || args.noDate ? '' : now + '.'}${slug}.cson`)

        return deps.makeDir(path.dirname(file)).then(function () {
          return deps.rename(args.source, file).then(function () {
            return deps.writeFile(file, cson.stringify(object, null, 2)).then(function () {
              deps.out.write(`${chalk.gray('[content move]')} ${chalk.green('\u2714')} saved ${file}\n`)
            })
          })
        })
      })
    }
  }
}
