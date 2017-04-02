#!/usr/bin/env node
const command = require('sergeant')
const error = require('sergeant/error')
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
const collections = new Map()
const templates = []
const configFile = path.join(process.cwd(), 'html.js')

loadConfig()

command('html', 'generate html from markdown and js', function ({parameter, option, command}) {
  ;[...collections].forEach(function ([collection, definition]) {
    if (definition.singular != null) {
      command('new:' + definition.singular, 'make a new ' + definition.singular, (args) => {
        const create = definition.create(args)

        return (args) => {
          const object = create(args)
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

          return [...collections].reduce(function (collected, [collection, definition]) {
            if (collected == null) {
              let params = pathMatch(definition.route)(location)

              if (params) {
                return readFile(file, 'utf-8').then(function (blocks) {
                  blocks = blocks.split('---').map((block) => block.trim())

                  if (blocks[0] === '') {
                    blocks = blocks.slice(1)

                    Object.assign(object, cson.parse(blocks.shift()))
                  }

                  Object.assign(object, {content: remarkable.render(blocks.join('---'))})

                  return [collection, definition.read(Object.assign(object, params))]
                })
              }
            }
          }, null)
        }))
      })
      .then(function (content) {
        return content.filter((content) => content != null)
      })
      .then(function (content) {
        const tree = {}

        ;[...collections].forEach(function ([collection]) {
          tree[collection] = []
        })

        content.forEach(function ([collection, item]) {
          tree[collection].push(item)
        })

        return tree
      })
      .then(function (content) {
        templates.forEach(function (template) {
          template({content, html, safe, save})
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
      if (Array.isArray(file)) {
        file.forEach((file) => {
          save(file, content)
        })
      } else {
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
  }
})(process.argv.slice(2))

function loadConfig () {
  try {
    delete require.cache[configFile]

    const required = require(configFile)

    assert.equal(typeof required, 'function', 'the required module should be a function')

    required({collection, template})
  } catch (e) {
    error(e)

    process.exit(1)
  }
}

function collection (collection, definition) {
  assert.ok(definition.route, 'collections require a route setting')
  assert.ok(definition.create, 'collections require a create setting')
  assert.ok(definition.read, 'collections require a read setting')

  collections.set(collection, definition)
}

function template (template) {
  templates.push(template)
}
