const test = require('tape')
const execa = require('execa')
const cson = require('cson-parser')
const path = require('path')
const fs = require('fs')
const stream = require('stream')
const out = new stream.Writable()

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

      t.equal(content, cson.stringify({title: 'Qux Post', content: 'qux qux qux'}, null, 2))

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

      t.equal(content, cson.stringify({title: 'Baz Post', content: 'qux qux qux'}, null, 2))

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
        content: 'foo foo foo'
      }, null, 2))

      return Promise.resolve(true)
    },
    out
  })(args)
    .then(function () {
      t.ok(1)
    })
})

test('index - with date', function (t) {
  t.plan(1)

  const file = './fixtures/a-category/1515045199828.foo-post.cson'

  const expected = require('./index.js')(file, fs.readFileSync(file, 'utf8'))

  t.deepEqual({
    data: {
      title: 'Foo Post',
      content: 'foo foo foo'
    },
    date: new Date(1515045199828),
    slug: 'foo-post',
    categories: [ 'fixtures', 'a-category' ]
  }, expected)
})

test('index - without date', function (t) {
  t.plan(1)

  const file = 'fixtures/a-category/qux-post.cson'

  const now = new Date()

  const expected = require('./index.js')(file, fs.readFileSync(file, 'utf8'), now)

  t.deepEqual({
    data: {
      title: 'Qux Post',
      content: 'qux qux qux'
    },
    date: now,
    slug: 'qux-post',
    categories: [ 'fixtures', 'a-category' ]
  }, expected)
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
