const app = require('sergeant')()
const assert = require('assert')
const chalk = require('chalk')
const path = require('path')
const thenify = require('thenify')
const glob = thenify(require('glob'))
const fs = require('fs')
const readFile = thenify(fs.readFile)
const pathMatch = require('path-match')()
const cson = require('cson-parser')
const matcher = pathMatch(':categories+/:time.:slug.md')
const Highlights = require('highlights')
const Remarkable = require('remarkable')
const highlighter = new Highlights()
const remarkable = new Remarkable({
  highlight: function (code, lang) {
    if (!lang) {
      return escape(code)
    }

    code = highlighter.highlightSync({
      fileContents: code.trim(),
      scopeName: 'source.js'
    })

    return code
  },
  langPrefix: 'language-'
})

app.command('publish')
.describe('Generate html from markdown content and a js template')
.parameter('destination', 'html destination')
.option('template', 'template module (default ./template.js)')
.option('content', 'content directory (default ./content/)')
.option('watch', 'watch for changes')
.alias('w', 'watch')
.action(function (args) {
  assert.equal(typeof args.get('destination'), 'string', 'destination expects a string')

  ;['template', 'content'].forEach(function (directory) {
    if (!args.has(directory)) {
      args.set(directory, path.join(process.cwd(), directory))
    }
  })

  return glob(args.get('content') + '/**/*.md').then(function (files) {
    return Promise.all(files.map((file) => {
      let object = matcher(path.relative(args.get('content'), file)) || {}

      if (object.time) {
        object.time = new Date(Number(object.time))
      }

      return readFile(file, 'utf-8').then(function (blocks) {
        blocks = blocks.split('---').map((block) => block.trim())

        if (blocks[0] === '') {
          blocks = blocks.slice(1)
        }

        if (blocks.length > 1) {
          Object.assign(object, cson.parse(blocks.shift()))
        }

        Object.assign(object, {content: remarkable.render(blocks.join('---'))})

        return object
      })
    }))
  })
  .then(function (objects) {
    const template = require(args.get('template'))

    assert.equal(typeof template, 'function', 'template expects a function')

    template(objects, save)
  })

  function save (file, html) {
    assert.equal(typeof file, 'string', 'path expects a string')

    assert.equal(typeof html, 'string', 'html expects a string')

    fs.writeFile(path.join(process.cwd(), args.get('destination'), file), html, function (err) {
      if (err) {
        throw err
      }

      console.log(chalk.green(file + ' saved'))
    })
  }
})

app.run().catch(function (err) {
  console.error(chalk.red(err.message))
})
