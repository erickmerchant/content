const test = require('tape')
const execa = require('execa')
// const path = require('path')
// const thenify = require('thenify')
// const readFile = thenify(require('fs').readFile)

const noopDeps = {
  makeDir: () => Promise.resolve(true),
  writeFile: () => Promise.resolve(true)
}
// const noopDefiners = {
//   parameter () {},
//   option () {}
// }

test.skip('index.js generate - options and parameters', function (t) {
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

test('cli.js', async function (t) {
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
