const test = require('tape')
const execa = require('execa')
const path = require('path')
// const readFile = thenify(require('fs').readFile)
const stream = require('stream')
const out = new stream.Writable()
const withCson = require('./src/with-cson')

out._write = () => {}

const noopDeps = {
  makeDir () { return Promise.resolve(true) },
  writeFile () { return Promise.resolve(true) },
  rename () { return Promise.resolve(true) },
  watch () {},
  out
}
const noopDefiners = {
  parameter () {},
  option () {}
}

test('src/make - options and parameters', function (t) {
  t.plan(7)

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

  t.ok(options.date)

  t.equal(options.date.type, Boolean)

  t.equal(options.date.default.value, false)
})

test('src/make - no date', function (t) {
  t.plan(4)

  const args = {
    destination: './fixtures/',
    title: 'Testing'
  }
  const _file = path.join(args.destination, 'testing.md')

  require('./src/make')({
    makeDir (directory) {
      t.equal(directory, path.dirname(_file))

      return Promise.resolve(true)
    },
    writeFile (file, content) {
      t.equal(file, _file)

      t.equal(content, withCson.stringify({title: args.title}))

      return Promise.resolve(true)
    },
    out
  })(noopDefiners)(args)
    .then(function () {
      t.ok(1)
    })
})

test('src/make - date', function (t) {
  t.plan(4)

  const args = {
    destination: './fixtures/',
    title: 'Testing',
    date: true
  }

  require('./src/make')({
    makeDir (directory) {
      t.equal(directory, 'fixtures')

      return Promise.resolve(true)
    },
    writeFile (file, content) {
      t.ok(/^fixtures\/\d+.testing.md$/.test(file))

      t.equal(content, withCson.stringify({title: args.title}))

      return Promise.resolve(true)
    },
    out
  })(noopDefiners)(args)
    .then(function () {
      t.ok(1)
    })
})

test('src/move - options and parameters', function (t) {
  t.plan(10)

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

  t.ok(options['no-date'])

  t.equal(options['no-date'].type, Boolean)

  t.equal(options['no-date'].default.value, false)
})

test('src/move - no date', function (t) {
  t.plan(6)

  const args = {
    source: './fixtures/a-category/qux-post.md',
    destination: './fixtures/',
    noDate: true
  }

  require('./src/move')({
    makeDir (directory) {
      t.equal(directory, 'fixtures')

      return Promise.resolve(true)
    },
    rename (oldName, newName) {
      t.equal(oldName, args.source)

      t.ok('fixtures/qux-post.md', newName)

      return Promise.resolve(true)
    },
    writeFile (file, content) {
      t.ok('fixtures/qux-post.md', file)

      t.equal(content, withCson.stringify({title: 'Qux Post'}))

      return Promise.resolve(true)
    },
    out
  })(noopDefiners)(args)
    .then(function () {
      t.ok(1)
    })
})

test('src/move - title', function (t) {
  t.plan(6)

  const args = {
    source: './fixtures/a-category/qux-post.md',
    destination: './fixtures/',
    title: 'Baz Post',
    noDate: true
  }

  require('./src/move')({
    makeDir (directory) {
      t.equal(directory, 'fixtures')

      return Promise.resolve(true)
    },
    rename (oldName, newName) {
      t.equal(oldName, args.source)

      t.equal('fixtures/baz-post.md', newName)

      return Promise.resolve(true)
    },
    writeFile (file, content) {
      t.ok('fixtures/baz-post.md', file)

      t.equal(content, withCson.stringify({title: 'Baz Post'}))

      return Promise.resolve(true)
    },
    out
  })(noopDefiners)(args)
    .then(function () {
      t.ok(1)
    })
})

test('src/move - update', function (t) {
  t.plan(6)

  const args = {
    source: './fixtures/a-category/1515045199828.foo-post.md',
    destination: './fixtures/',
    update: true
  }

  require('./src/move')({
    makeDir (directory) {
      t.equal(directory, 'fixtures')

      return Promise.resolve(true)
    },
    rename (oldName, newName) {
      t.equal(oldName, args.source)

      t.ok(/^fixtures\/\d+\.foo-post.md$/.test(newName))

      return Promise.resolve(true)
    },
    writeFile (file, content) {
      t.ok(/^fixtures\/\d+\.foo-post.md$/.test(file))

      t.equal(content, withCson.stringify({
        title: 'Foo Post',
        content: `\`\`\`
 // foo
\`\`\``
      }))

      return Promise.resolve(true)
    },
    out
  })(noopDefiners)(args)
    .then(function () {
      t.ok(1)
    })
})

test('cli', async function (t) {
  t.plan(4)

  try {
    await execa('node', ['./cli.js', '-h'])
  } catch (e) {
    t.ok(e)

    t.equal(e.stderr.includes('Usage'), true)

    t.equal(e.stderr.includes('Options'), true)

    t.equal(e.stderr.includes('Commands'), true)
  }
})
