const test = require('tape')
const execa = require('execa')
const path = require('path')
const stream = require('stream')
const out = new stream.Writable()
const cson = require('cson-parser')

out._write = () => {}

test('src/make - no date', function (t) {
  t.plan(4)

  const args = {
    destination: './fixtures/',
    title: 'Testing'
  }
  const _file = path.join(args.destination, 'testing.cson')

  require('./src/make')({
    makeDir (directory) {
      t.equal(directory, path.dirname(_file))

      return Promise.resolve(true)
    },
    writeFile (file, content) {
      t.equal(file, _file)

      t.equal(content, cson.stringify({title: args.title, content: '\n'}, null, 2))

      return Promise.resolve(true)
    },
    out
  })(args)
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
      t.ok(/^fixtures\/\d+.testing.cson$/.test(file))

      t.equal(content, cson.stringify({title: args.title, content: '\n'}, null, 2))

      return Promise.resolve(true)
    },
    out
  })(args)
    .then(function () {
      t.ok(1)
    })
})

test('src/move - no date', function (t) {
  t.plan(6)

  const args = {
    source: './fixtures/a-category/qux-post.cson',
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

      t.ok('fixtures/qux-post.cson', newName)

      return Promise.resolve(true)
    },
    writeFile (file, content) {
      t.ok('fixtures/qux-post.cson', file)

      t.equal(content, cson.stringify({title: 'Qux Post', content: '\n'}, null, 2))

      return Promise.resolve(true)
    },
    out
  })(args)
    .then(function () {
      t.ok(1)
    })
})

test('src/move - title', function (t) {
  t.plan(6)

  const args = {
    source: './fixtures/a-category/qux-post.cson',
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

      t.equal('fixtures/baz-post.cson', newName)

      return Promise.resolve(true)
    },
    writeFile (file, content) {
      t.ok('fixtures/baz-post.cson', file)

      t.equal(content, cson.stringify({title: 'Baz Post', content: '\n'}, null, 2))

      return Promise.resolve(true)
    },
    out
  })(args)
    .then(function () {
      t.ok(1)
    })
})

test('src/move - update', function (t) {
  t.plan(6)

  const args = {
    source: './fixtures/a-category/1515045199828.foo-post.cson',
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

      t.ok(/^fixtures\/\d+\.foo-post.cson$/.test(newName))

      return Promise.resolve(true)
    },
    writeFile (file, content) {
      t.ok(/^fixtures\/\d+\.foo-post.cson$/.test(file))

      t.equal(content, cson.stringify({
        title: 'Foo Post',
        content: `\`\`\`
 // foo
\`\`\``
      }, null, 2))

      return Promise.resolve(true)
    },
    out
  })(args)
    .then(function () {
      t.ok(1)
    })
})

test('cli', async function (t) {
  t.plan(3)

  try {
    await execa('node', ['./cli.js', '-h'])
  } catch (e) {
    t.ok(e)

    t.equal(e.stderr.includes('Usage'), true)

    t.equal(e.stderr.includes('Options'), true)
  }
})
