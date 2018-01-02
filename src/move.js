const chalk = require('chalk')
const path = require('path')
const thenify = require('thenify')
const fs = require('fs')
const slugify = require('slugg')
const pathTo = require('path-to-regexp')
const readFile = thenify(fs.readFile)
const cson = require('./cson')

module.exports = function (deps) {
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
      description: 'update the date and time',
      type: Boolean,
      default: { value: false }
    })

    return function (args) {
      const pathResult = pathTo(':time(\\d+).:slug.md').exec(path.basename(args.source))
      let now
      let slug

      if (pathResult) {
        now = pathResult[1]

        slug = pathResult[2]
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

        if (!now) {
          return Promise.reject(new Error('time not set'))
        }

        if (!slug) {
          return Promise.reject(new Error('slug not set'))
        }

        const file = path.join(args.destination, `${now}.${slug}.md`)

        return deps.makeDir(path.dirname(file)).then(function () {
          return deps.rename(args.source, file).then(function () {
            return deps.writeFile(file, cson.stringify(object)).then(function () {
              deps.out(chalk.green('\u2714') + ' saved ' + file + '\n')
            })
          })
        })
      })
    }
  }
}
