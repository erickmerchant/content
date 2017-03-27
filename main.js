#!/usr/bin/env node
const command = require('sergeant')
const assert = require('assert')
const chalk = require('chalk')
const chokidar = require('chokidar')
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
const configFile = path.join(process.cwd(), 'html.js')

loadConfig()

command('html', 'generate html from markdown and js', function ({parameter, option, command}) {
  ;[...definitions].forEach(function ([collection, definition]) {
    if (definition.singular != null) {
      command('new:' + definition.singular, 'make a new ' + definition.singular, (definers) => {
        const write = definition.define(definers)

        return (args) => {
          const object = write(args)
          const compiler = pathCompile(definition.route)
          const location = compiler(object)
          const file = location + '.md'
          const locationObject = pathMatch(definition.route)(location)

          Object.keys(locationObject).forEach(function (key) {
            delete object[key]
          })

          const fullFile = path.join(process.cwd(), 'content', file)

          let content = object.content || ''

          delete object.content

          const body = '---\n' + cson.stringify(object, null, 2) + '\n---\n' + content + '\n'

          mkdirp(path.parse(fullFile).dir).then(function () {
            return writeFile(fullFile, body).then(function () {
              console.log(chalk.green(file + ' saved'))
            })
          })
        }
      })
    }
  })

  parameter('destination', {
    description: 'where to save to',
    required: true
  })

  option('no-min', {
    description: 'do not minify',
    type: Boolean
  })

  option('watch', {
    description: 'watch for changes',
    type: Boolean,
    aliases: ['w']
  })

  return function (args) {
    const guarded = new Map()

    const contentDir = path.join(process.cwd(), 'content')

    run()

    if (args.watch) {
      chokidar.watch([contentDir + '/**/*.md', configFile], {ignoreInitial: true}).on('all', function () {
        loadConfig()

        run()
      })
    }

    function run () {
      glob(contentDir + '/**/*.md').then(function (files) {
        return Promise.all(files.map((file) => {
          let location = path.relative(contentDir, file).split('.').slice(0, -1).join('.')

          let object = {}

          ;[...definitions].forEach(function ([collection, definition]) {
            let result = pathMatch(definition.route)(location)

            if (result) {
              result.collection = collection

              object = definition.read(result)
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
          template({objects, html, safe, save})
        })
      })
    }

    function html (strings, ...vals) {
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

          if (Array.isArray(val)) {
            val = val.join('')
          }

          result += val
        }
      })

      return result.trim()
    }

    function safe (val) {
      let symbol = Symbol('safe')

      guarded.set(symbol, val)

      return symbol
    }

    function save (file, content) {
      assert.equal(typeof file, 'string', 'file to save should be a string')

      assert.equal(typeof content, 'string', 'content to save should be a string')

      if (file.endsWith('/')) {
        file = file + 'index.html'
      } else {
        file = file + '.html'
      }

      let fullFile = path.join(process.cwd(), args.destination, file)

      if (!args.noMin) {
        content = minify(content, {
          collapseWhitespace: true,
          removeComments: true,
          collapseBooleanAttributes: true,
          removeAttributeQuotes: true,
          removeRedundantAttributes: true,
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
  }
})(process.argv.slice(2))

function loadConfig () {
  delete require.cache[configFile]

  const required = require(configFile)

  assert.equal(typeof required, 'function', 'the required module should be a function')

  required({define, template})
}

function define (collection, definition) {
  assert.ok(definition.route, 'definitions require a route setting')
  assert.ok(definition.define, 'definitions require a define setting')
  assert.ok(definition.read, 'definitions require a read setting')

  definitions.set(collection, definition)
}

function template (template) {
  templates.push(template)
}
