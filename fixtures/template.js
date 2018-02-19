module.exports = function ({content, route, html, safe, link}) {
  return html`
  <!doctype html>
  <html>
    <head>
      <title>${route((on) => {
    on('/', content[0].title)

    content.forEach((post) => on(link('/posts/:slug/', post), post.title))

    on('/posts/', 'Posts')

    on('/404.html', 'Page Not Found')
  })}</title>
    </head>
    <body>
      <h1>${route()}</h1>
      <main>
        ${route((on) => {
    on('/', html`
            <h2>${content[0].title}</h2>
            ${safe(content[0].content)}
          `)

    content.forEach((post) => on(link('/posts/:slug/', post), html`
            <h2>${post.title}</h2>
            ${safe(post.content)}
          `))

    on('/posts/', html`
            <ol>
              ${content.map((post) => html`<li><a href="${link('/posts/:slug/', post)}">${post.title}</a></li>`)}
            </ol>
          `)

    on('/404.html', html`<h2>Page Not Found</h2>`)
  })}
      </main>
    </body>
  </html>
  `
}
