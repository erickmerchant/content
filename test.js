const test = require('tape')
const execa = require('execa')
const path = require('path')
// const readFile = thenify(require('fs').readFile)
const stream = require('stream')
const out = new stream.Writable()
const cson = require('./src/cson')

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

test('src/generate - functionality', function (t) {
  t.plan(3)

  const args = {
    template: './fixtures/template.js',
    watch: false,
    content: './fixtures/',
    destination: './build/',
    noMin: false
  }
  const directories = []
  const writes = []

  require('./src/generate')({
    makeDir (directory) {
      directories.push(directory)

      return Promise.resolve(true)
    },
    writeFile (file, content) {
      writes.push([file, content])

      return Promise.resolve(true)
    },
    watch (watch, directory, cb) {
      t.deepEqual(directory, [path.join(process.cwd(), args.template), args.content])

      return cb()
    },
    out
  })(noopDefiners)(args)
  .then(function () {
    t.deepEqual(directories, [
      'build',
      'build/posts/qux-post',
      'build/posts/bar-post',
      'build/posts/foo-post',
      'build/posts',
      'build'
    ])

    t.deepEqual(writes, [
      [
        'build/index.html',
        '<!doctype html><title>Qux Post</title><h1>/</h1><main><h2>Qux Post</h2></main>'
      ],
      [
        'build/posts/qux-post/index.html',
        '<!doctype html><title>Qux Post</title><h1>/posts/qux-post/</h1><main><h2>Qux Post</h2></main>'
      ],
      [
        'build/posts/bar-post/index.html',
        '<!doctype html><title>Bar Post</title><h1>/posts/bar-post/</h1><main><h2>Bar Post</h2><pre><code class=language-javascript><span class="token keyword">let</span> bar <span class="token operator">=</span> <span class="token boolean">true</span>\n</code></pre></main>'
      ],
      [
        'build/posts/foo-post/index.html',
        '<!doctype html><title>Foo Post</title><h1>/posts/foo-post/</h1><main><h2>Foo Post</h2><pre><code> // foo\n</code></pre></main>'
      ],
      [
        'build/posts/index.html',
        '<!doctype html><title>Posts</title><h1>/posts/</h1><main><ol><li><a href=/posts/qux-post/ >Qux Post</a><li><a href=/posts/bar-post/ >Bar Post</a><li><a href=/posts/foo-post/ >Foo Post</a></ol></main>'
      ],
      [
        'build/404.html',
        '<!doctype html><title>Page Not Found</title><h1>/404.html</h1><main><h2>Page Not Found</h2></main>'
      ]
    ])
  })
})

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

      t.equal(content, cson.stringify({title: args.title}))

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

      t.equal(content, cson.stringify({title: args.title}))

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
    source: './fixtures/qux-post.md',
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

      t.equal(content, cson.stringify({title: 'Qux Post'}))

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
    source: './fixtures/qux-post.md',
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

      t.equal(content, cson.stringify({title: 'Baz Post'}))

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
    source: './fixtures/1515045199828.foo-post.md',
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

      t.equal(content, cson.stringify({
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
