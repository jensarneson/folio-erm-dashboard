import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// CSP for dev/preview — no 'unsafe-eval', connect-src covers FOLIO API + localhost proxy
const CSP_HEADER = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'self' https://*.folio.ebsco.com https://*.folio.org",
  "frame-ancestors 'none'",
].join('; ')

// Production CSP — no 'self' on connect-src (no dev proxy)
const CSP_HEADER_PROD = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src https://*.folio.ebsco.com https://*.folio.org",
  "frame-ancestors 'none'",
].join('; ')

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'security-headers',
      configureServer(server) {
        server.middlewares.use((_req, res, next) => {
          res.setHeader('Content-Security-Policy', CSP_HEADER)
          res.setHeader('X-Content-Type-Options', 'nosniff')
          res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
          next()
        })
      },
      configurePreviewServer(server) {
        server.middlewares.use((_req, res, next) => {
          res.setHeader('Content-Security-Policy', CSP_HEADER_PROD)
          res.setHeader('X-Content-Type-Options', 'nosniff')
          res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
          next()
        })
      },
    },
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
