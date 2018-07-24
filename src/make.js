const assert = require('assert')
const chalk = require('chalk')
const path = require('path')
const slugify = require('slugg')
const cson = require('cson-parser')

module.exports = function (deps) {
  assert.equal(typeof deps.makeDir, 'function')

  assert.equal(typeof deps.writeFile, 'function')

  assert.equal(typeof deps.out, 'object')

  assert.equal(typeof deps.out.write, 'function')

  return function (args) {
    const slug = slugify(args.title)

    const object = {title: args.title, content: '\n'}

    const file = path.join(args.destination, `${args.date ? Date.now() + '.' : ''}${slug}.cson`)

    return deps.makeDir(path.dirname(file)).then(function () {
      return deps.writeFile(file, cson.stringify(object, null, 2)).then(function () {
        deps.out.write(`${chalk.gray('[content make]')} saved ${file}\n`)
      })
    })
  }
}
