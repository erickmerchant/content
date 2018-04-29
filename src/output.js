const assert = require('assert')
const chalk = require('chalk')
const path = require('path')
const thenify = require('thenify')
const glob = thenify(require('glob'))
const fs = require('fs')
const pathTo = require('path-to-regexp')
const extensions = require('markdown-extensions').join(',')
const withCson = require('./with-cson')
const readFile = thenify(fs.readFile)

module.exports = function (deps) {
  assert.equal(typeof deps.date, 'object')

  assert.ok(deps.date instanceof Date)

  assert.equal(typeof deps.watch, 'function')

  assert.equal(typeof deps.makeDir, 'function')

  assert.equal(typeof deps.writeFile, 'function')

  assert.equal(typeof deps.out, 'object')

  assert.equal(typeof deps.out.write, 'function')

  return function ({parameter, option}) {
    parameter('content', {
      description: 'directory containing your markdown',
      required: true
    })

    parameter('destination', {
      description: 'the directory to save to',
      required: true
    })

    option('watch', {
      description: 'watch for changes',
      aliases: ['w']
    })

    return function (args) {
      return deps.watch(args.watch, [args.content], function () {
        return glob(path.join(args.content, '**/*.{' + extensions + '}')).then(function (files) {
          files = files.reverse()

          return Promise.all(files.map(function (file) {
            const pathResult = pathTo(`:time(\\d+).:slug${path.extname(file)}`).exec(path.basename(file))
            let object = {}

            if (pathResult) {
              object.date = new Date(Number(pathResult[1]))

              object.slug = pathResult[2]
            } else {
              object.date = deps.date

              object.slug = path.basename(file, path.extname(file))
            }

            object.categories = path.dirname(path.relative(args.content, file)).split('/')

            if (object.categories.length && object.categories[0] === '.') {
              object.categories = object.categories.slice(1)
            }

            return readFile(file, 'utf-8').then(function (string) {
              object = Object.assign(withCson.parse(string), object)

              const json = JSON.stringify(object)
              const file = path.join(args.destination, object.categories.join('/'), object.slug + '.json')

              return deps.makeDir(path.dirname(file)).then(function () {
                return deps.writeFile(file, json).then(function () {
                  deps.out.write(chalk.green('\u2714') + ' saved ' + file + '\n')

                  return {
                    link: path.relative(args.destination, file),
                    title: object.title,
                    slug: object.slug,
                    categories: object.categories,
                    date: object.date
                  }
                })
              })
            })
          }))
            .then(function (results) {
              const file = path.join(args.destination, 'index.json')
              return deps.makeDir(path.dirname(file)).then(function () {
                return deps.writeFile(file, JSON.stringify(results)).then(function () {
                  deps.out.write(chalk.green('\u2714') + ' saved ' + file + '\n')
                })
              })
            })
        })
      })
    }
  }
}
