import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'redirect-base-no-trailing-slash',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url === '/folio-erm-dashboard') {
            res.writeHead(301, { Location: '/folio-erm-dashboard/' })
            res.end()
          } else {
            next()
          }
        })
      },
      configurePreviewServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url === '/folio-erm-dashboard') {
            res.writeHead(301, { Location: '/folio-erm-dashboard/' })
            res.end()
          } else {
            next()
          }
        })
      },
    },
  ],
  base: '/folio-erm-dashboard/',
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  server: {
    historyApiFallback: {
      rewrites: [
        { from: /^\/folio-erm-dashboard\/.*/, to: '/folio-erm-dashboard/index.html' },
        { from: /^\/.*/, to: '/folio-erm-dashboard/index.html' },
      ],
    },
    proxy: {
      '/okapi': {
        target: 'https://api-eku.folio.ebsco.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/okapi/, ''),
      },
      '/erm': {
        target: 'https://api-eku.folio.ebsco.com',
        changeOrigin: true,
      },
    },
  },
})
