const assert = require('assert')
const chalk = require('chalk')
const path = require('path')
const slugify = require('slugg')
const cson = require('./cson')

module.exports = function (deps) {
  assert.equal(typeof deps.makeDir, 'function')

  assert.equal(typeof deps.writeFile, 'function')

  assert.equal(typeof deps.out, 'object')

  assert.equal(typeof deps.out.write, 'function')

  return function ({parameter, option}) {
    parameter('destination', {
      description: 'the directory to save to',
      required: true
    })

    option('title', {
      description: 'the title',
      required: true
    })

    option('date', {
      description: 'add the current time',
      type: Boolean,
      default: { value: false }
    })

    return function (args) {
      const slug = slugify(args.title)

      const object = {title: args.title}

      const file = path.join(args.destination, `${args.date ? Date.now() + '.' : ''}${slug}.md`)

      return deps.makeDir(path.dirname(file)).then(function () {
        return deps.writeFile(file, cson.stringify(object)).then(function () {
          deps.out.write(chalk.green('\u2714') + ' saved ' + file + '\n')
        })
      })
    }
  }
}
