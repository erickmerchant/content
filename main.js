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
  highlight: (code, lang) => {
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
const configFile = path.join(process.cwd(), 'html.js')
const contentDir = path.join(process.cwd(), 'content')

command('html', 'generate html from markdown and js', ({parameter, option, command}) => {
  let action = refresh()({collection})

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

  return (args) => {
    const dev = args.dev

    run()

    if (args.watch) {
      chokidar.watch([contentDir + '/**/*.md', configFile], {ignoreInitial: true}).on('all', () => {
        action = refresh()({collection})

        run()
      })
    }

    function run () {
      const guarded = new Map()

      action({get, save, html, safe, link, dev})

      function html (strings, ...vals) {
        let result = ''

        strings.forEach((str, key) => {
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

          mkdirp(path.parse(fullFile).dir).then(() => {
            return writeFile(fullFile, content).then(() => {
              console.log(chalk.green('\u2714') + ' saved ' + path.join(args.destination, file))
            })
          })
          .catch((err) => {
            if (err) {
              throw err
            }
          })
        }
      }

      function get (routes, template) {
        if (!Array.isArray(routes)) {
          routes = [routes]
        }

        glob(path.join(contentDir, '/**/*.md')).then((files) => {
          return Promise.all(files.map((file) => {
            let params = routes.reduce((result, route) => {
              if (!result) {
                let match = pathMatch(route + '.md')(path.relative(contentDir, file))

                if (match) {
                  return match
                }
              }

              return result
            }, null)

            if (params) {
              return load(file, params)
            }
          }))
        })
        .then((content) => {
          return content.filter((content) => content != null)
        })
        .then(template)
        .catch((err) => {
          if (err) {
            throw err
          }
        })
      }

      function link (route, object) {
        return pathCompile(route)(object)
      }
    }
  }

  function collection (name, definition) {
    definition({on, save, remove, read})

    function on (state, description, definition) {
      if (definition == null) {
        definition = description

        description = state + ' a ' + name
      }

      command(name + ':' + state, description, definition)
    }

    function save (route, object, action) {
      let location = pathCompile(route)(object)
      let file = location + '.md'

      const locationObject = pathMatch(route)(location)

      Object.keys(locationObject).forEach((key) => {
        delete object[key]
      })

      const fullFile = path.join(process.cwd(), 'content', file)

      let content = object.content || ''

      delete object.content

      const body = '---\n' + cson.stringify(object, null, 2) + '\n---\n' + content + '\n'

      mkdirp(path.parse(fullFile).dir).then(() => {
        return writeFile(fullFile, body).then(() => {
          console.log(chalk.green('\u2714') + ' saved ' + path.join('content', file))

          if (action != null) {
            action()
          }
        })
      })
      .catch((err) => {
        if (err) {
          throw err
        }
      })
    }

    function remove (file, action) {
      fs.unlink(file, (err) => {
        if (err) throw err

        if (action != null) {
          action()
        }
      })
    }

    function read (file, route, action) {
      let params = pathMatch(route + '.md')(path.relative(contentDir, file))

      if (params) {
        load(file, params, false).then(action)
      } else {
        action({})
      }
    }
  }
})(process.argv.slice(2))

function refresh () {
  try {
    delete require.cache[configFile]

    const required = require(configFile)

    assert.equal(typeof required, 'function', 'the required module should be a function')

    return required
  } catch (e) {
    error(e)

    process.exit(1)
  }
}

function load (file, params, parse = true) {
  return readFile(file, 'utf-8').then((blocks) => {
    let object = {}

    blocks = blocks.split('---').map((block) => block.trim())

    if (blocks[0] === '') {
      blocks = blocks.slice(1)

      Object.assign(object, cson.parse(blocks.shift()))
    }

    Object.assign(object, params)

    let content = blocks.join('---')

    if (parse) {
      content = remarkable.render(content)
    }

    Object.assign(object, {content})

    return object
  })
  .catch((err) => {
    if (err) {
      throw err
    }
  })
}
