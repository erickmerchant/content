const app = require('sergeant')()
const assert = require('assert')
const chalk = require('chalk')
const path = require('path')
const thenify = require('thenify')
const glob = thenify(require('glob'))
const fs = require('fs')
const readFile = thenify(fs.readFile)
const cson = require('cson-parser')
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

app.command('update')
.describe('Generate html from markdown content and js')
.parameter('destination', 'where to save to')
.option('require', 'a module to define your html (default ./html.js)')
.option('content', 'content directory (default ./content/)')
.option('watch', 'watch for changes')
.alias('w', 'watch')
.action(function (args) {
  assert.ok(args.has('destination'), 'destination is required')

  const contentDir = path.join(process.cwd(), args.has('content') ? args.get('content') : 'content')

  const required = require(path.join(process.cwd(), args.has('require') ? args.get('require') : 'html.js'))

  assert.equal(typeof required, 'function', 'the required module should be a function')

  required({define, template})

  return glob(contentDir + '/**/*.md').then(function (files) {
    return Promise.all(files.map((file) => {
      let location = path.relative(contentDir, file).split('.').slice(0, -1).join('.')

      return readFile(file, 'utf-8').then(function (blocks) {
        blocks = blocks.split('---').map((block) => block.trim())

        if (blocks[0] === '') {
          blocks = blocks.slice(1)

          Object.assign(object, cson.parse(blocks.shift()))
        }

        Object.assign(object, {content: remarkable.render(blocks.join('---'))})

        return object
      })
    }))
  })
  .then(function (objects) {

  })

  function define () {

  }

  function template () {

  }

  function save (file, content) {
    assert.equal(typeof file, 'string', 'file to save should be a string')

    assert.equal(typeof content, 'string', 'content to save should be a string')

    fs.writeFile(path.join(process.cwd(), args.get('destination'), file), content, function (err) {
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
