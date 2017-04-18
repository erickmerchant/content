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
let action = () => {}
const configFile = path.join(process.cwd(), 'html.js')
const contentDir = path.join(process.cwd(), 'content')

loadConfig()

command('html', 'generate html from markdown and js', function ({parameter, option, command}) {
  ;[...collections].forEach(function ([collection, definition]) {
    if (collection != null) {
      command('new:' + collection, 'make a new ' + collection, (args) => {
        const create = definition.command(args)

        return (args) => {
          const object = create(args)
          const location = link(definition.route, object)
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
              console.log(chalk.green('\u2714') + ' saved ' + path.join('content', file))
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
    type: Boolean,
    default: false
  })

  option('dev', {
    description: 'run in dev mode',
    type: Boolean,
    default: false
  })

  option('watch', {
    description: 'watch for changes',
    type: Boolean,
    aliases: ['w']
  })

  return function (args) {
    const dev = args.dev

    const guarded = new Map()

    run()

    if (args.watch) {
      chokidar.watch([contentDir + '/**/*.md', configFile], {ignoreInitial: true}).on('all', function () {
        loadConfig()

        run()
      })
    }

    function run () {
      action({get, save, html, safe, link, dev})
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
            console.log(chalk.green('\u2714') + ' saved ' + path.join(args.destination, file))
          })
        })
        .catch(function (err) {
          if (err) {
            throw err
          }
        })
      }
    }

    function get (files, template) {
      glob(contentDir + files + '.md').then(function (files) {
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

                  Object.assign(object, params, {content: remarkable.render(blocks.join('---'))})

                  Object.keys(definition.fields).forEach((field) => {
                    object[field] = definition.fields[field](object[field], object)
                  })

                  return object
                })
              }
            }
          }, null)
        }))
      })
      .then(function (content) {
        return content.filter((content) => content != null)
      })
      .then(template)
    }
  }

  function link (route, object) {
    return pathCompile(route)(object)
  }
})(process.argv.slice(2))

function loadConfig () {
  try {
    delete require.cache[configFile]

    const required = require(configFile)

    assert.equal(typeof required, 'function', 'the required module should be a function')

    collections.clear()

    action = required({collection})
  } catch (e) {
    error(e)

    process.exit(1)
  }
}

function collection (name, route, defintion) {
  assert.ok(name, 'collections require a name')
  assert.ok(route, 'collections require a route')
  assert.ok(defintion, 'collections require a defintion')
  assert.equal(typeof defintion, 'function', 'the defintion must be a function')

  let collection = {
    route,
    fields: { },
    command: () => {}
  }

  collection.command = defintion({field})

  collections.set(name, collection)

  function field (prop, modifier) {
    const splitProp = prop.split('-')
    prop = splitProp[0] + splitProp.slice(1).map((part) => part.substr(0, 1).toUpperCase() + part.substr(1)).join('')

    collection.fields[prop] = modifier
  }
}
