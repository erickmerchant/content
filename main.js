const app = require('sergeant')()
const assert = require('assert')
const chalk = require('chalk')
const path = require('path')
const thenify = require('thenify')
const minify = require('html-minifier').minify
const glob = thenify(require('glob'))
const fs = require('fs')
const escape = require('escape-html')
const cson = require('cson-parser')
const Highlights = require('highlights')
const Remarkable = require('remarkable')
const pathMatch = require('path-match')()
const pathCompile = require('path-to-regexp').compile
const mkdirp = thenify(require('mkdirp'))
const readFile = thenify(fs.readFile)
const writeFile = thenify(fs.writeFile)
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
const definitions = new Map()
const templates = []

app.command('generate')
.describe('Generate html from markdown content and js')
.parameter('destination', 'where to save to')
.option('require', 'a module to define your html (default ./html.js)')
.option('content', 'content directory (default ./content/)')
.option('no-min', 'do not minify')
.option('watch', 'watch for changes')
.alias('w', 'watch')
.action(function (args) {
  const contentDir = path.join(process.cwd(), args.has('content') ? args.get('content') : 'content')

  const required = require(path.join(process.cwd(), args.has('require') ? args.get('require') : 'html.js'))

  const guarded = new Map()

  assert.ok(args.has('destination'), 'destination is required')

  assert.equal(typeof required, 'function', 'the required module should be a function')

  required({define, template})

  return glob(contentDir + '/**/*.md').then(function (files) {
    return Promise.all(files.map((file) => {
      let location = path.relative(contentDir, file).split('.').slice(0, -1).join('.')

      let object = {}

      ;[...definitions].forEach(function ([collection, definition]) {
        let result = pathMatch(definition.route)(location)

        if (result) {
          object = result

          object.collection = collection
        }
      })

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
    templates.forEach(function (template) {
      template({objects, html, save})
    })
  })

  function html (strings, ...vals) {
    if (!Array.isArray(strings)) {
      let symbol = Symbol()

      guarded.set(symbol, strings)

      return symbol
    }

    let result = ''

    strings.forEach(function (str, key) {
      result += str

      if (vals[key]) {
        let val = vals[key]

        if (guarded.has(val)) {
          val = guarded.get(val)
        } else {
          val = escape(val)
        }

        result += val
      }
    })

    return result.trim()
  }

  function save (file, content) {
    assert.equal(typeof file, 'string', 'file to save should be a string')

    assert.equal(typeof content, 'string', 'content to save should be a string')

    if (file.endsWith('/')) {
      file = file + '/index.html'
    } else {
      file = file + '.html'
    }

    let fullFile = path.join(process.cwd(), args.get('destination'), file)

    if (!args.get('no-min')) {
      content = minify(content, {
        collapseWhitespace: true,
        removeComments: true,
        collapseBooleanAttributes: true,
        removeAttributeQuotes: true,
        // removeRedundantAttributes: true,
        removeEmptyAttributes: true,
        removeOptionalTags: true
      })
    }

    mkdirp(path.parse(fullFile).dir).then(function () {
      return writeFile(fullFile, content).then(function () {
        console.log(chalk.green(file + ' saved'))
      })
    })
    .catch(function (err) {
      if (err) {
        throw err
      }
    })
  }
})

app.command('create')
.describe('Create new markdown content')
.parameter('definition', 'what definition to use')
.option('require', 'a module to define your html (default ./html.js)')
.option('content', 'content directory (default ./content/)')
.action(function (args) {
  const contentDir = path.join(process.cwd(), args.has('content') ? args.get('content') : 'content')

  const required = require(path.join(process.cwd(), args.has('require') ? args.get('require') : 'html.js'))

  assert.ok(args.has('definition'), 'definition is required')

  assert.ok(definitions.has(args.get('definition')), 'definition not found')

  const definition = definitions.get(args.get('definition'))

  assert.ok(definition.create, 'definition has no create function')

  const object = definition.create(args) || {}


})

app.run().catch(function (err) {
  console.error(err)
})

function define (collection, definition) {
  assert.ok(definition.route, 'definitions require a route')

  definitions.set(collection, definition)
}

function template (template) {
  templates.push(template)
}
