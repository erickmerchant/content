const test = require('tape')
const execa = require('execa')
// const thenify = require('thenify')
// const readFile = thenify(require('fs').readFile)
const stream = require('stream')
const out = new stream.Writable()

out._write = () => {}

const noopDeps = {
  makeDir: () => Promise.resolve(true),
  writeFile: () => Promise.resolve(true),
  watch: () => {},
  out
}
const noopDefiners = {
  parameter () {},
  option () {}
}

test('src/generate - options and parameters', function (t) {
  t.plan(13)

  const parameters = {}
  const options = {}

  require('./src/generate')(noopDeps)({
    parameter (name, args) {
      parameters[name] = args
    },
    option (name, args) {
      options[name] = args
    }
  })

  t.ok(parameters.content)

  t.equal(parameters.content.required, true)

  t.ok(parameters.template)

  t.equal(parameters.template.required, true)

  t.ok(parameters.destination)

  t.equal(parameters.destination.required, true)

  t.ok(options['no-min'])

  t.equal(options['no-min'].type, Boolean)

  t.equal(options['no-min'].default.value, false)

  t.ok(options.watch)

  t.equal(options.watch.type, Boolean)

  t.equal(options.watch.default.value, false)

  t.deepEqual(options.watch.aliases, ['w'])
})

test('src/generate', function (t) {
  t.plan(0)

  require('./src/generate')({
    makeDir: () => Promise.resolve(true),
    writeFile: () => Promise.resolve(true),
    watch: (watch, directory, cb) => {
      cb()
    },
    out
  })(noopDefiners)({
    template: './fixtures/template.js',
    watch: false,
    content: './fixtures/',
    destination: './build/',
    noMin: false
  })
})

test('src/make - options and parameters', function (t) {
  t.plan(4)

  const parameters = {}
  const options = {}

  require('./src/make')(noopDeps)({
    parameter (name, args) {
      parameters[name] = args
    },
    option (name, args) {
      options[name] = args
    }
  })

  t.ok(parameters.destination)

  t.equal(parameters.destination.required, true)

  t.ok(options.title)

  t.equal(options.title.required, true)
})

test('src/move - options and parameters', function (t) {
  t.plan(7)

  const parameters = {}
  const options = {}

  require('./src/move')(noopDeps)({
    parameter (name, args) {
      parameters[name] = args
    },
    option (name, args) {
      options[name] = args
    }
  })

  t.ok(parameters.source)

  t.equal(parameters.source.required, true)

  t.ok(parameters.destination)

  t.equal(parameters.destination.required, true)

  t.ok(options.update)

  t.equal(options.update.type, Boolean)

  t.equal(options.update.default.value, false)
})

test('cli', async function (t) {
  t.plan(5)

  try {
    await execa('node', ['./cli.js', '-h'])
  } catch (e) {
    t.ok(e)

    t.equal(e.stderr.includes('Usage'), true)

    t.equal(e.stderr.includes('Options'), true)

    t.equal(e.stderr.includes('Parameters'), true)

    t.equal(e.stderr.includes('Commands'), true)
  }
})
