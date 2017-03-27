# @erickmerchant/html

Generate html from markdown and js. Could be part of a static site set-up. Install it globally with `npm install --global @erickmerchant/html`. Requires the following file structure.

```
├── content
│   ...
└── html.js
```

The content directory contains folders and your markdown content. The markdown should have CSON frontmatter.

## An example html.js

``` javascript
module.exports = ({define, template}) => {
  define('posts', {
    singular: 'post',
    route: 'posts/:time.:slug',
    define ({parameter, option}) {
      option('title', {
        description: 'the title',
        required: true
      })

      return function (args) {
        return {
          time: Date.now(),
          title: args.title,
          slug: args.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')
        }
      }
    },
    read (object) {
      object.time = new Date(object.time)

      return object
    }
  })

  template(({objects, html, save, safe}) => {
    save('/', html`<a href="/posts/">Go to Posts</a>`)
  })

  template(({objects, html, save, safe}) => {
    objects
    .filter((object) => object.collection === 'posts')
    .forEach(({slug, time, title, content}) => {
      save(`posts/${slug}`, html`
        <!doctype html>
        <html>
          <head>
            <title>${title}</title>
          </head>
          <body>
            <h1>
              ${title}
              <small><time>${new Date(Number(time))}</time></small>
            </h1>
            <main>
              ${safe(content)}
            </main>
          </body>
        </html>
      `)
    })
  })

  template(({objects, html, save, safe}) => {
    save('posts/', html`
      <!doctype html>
      <html>
        <head>
          <title>Post</title>
        </head>
        <body>
          <ul>
            ${safe(objects
            .filter((object) => object.collection === 'posts')
            .map(({slug, time, title, content}) => {
              return html`<li><a href="/posts/${slug}.html">${title}</a></li>`
            }))}
          </ul>
        </body>
      </html>
    `)
  })
}
```
