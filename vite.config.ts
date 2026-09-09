import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import fs from 'fs'

function saveCau1Plugin() {
  return {
    name: 'save-cau1-plugin',
    configureServer(server: any) {
      server.middlewares.use('/api/save-cau1', (req: any, res: any, next: any) => {
        if (req.method === 'POST') {
          let body = ''
          req.on('data', (chunk: any) => { body += chunk })
          req.on('end', () => {
            try {
              const { content } = JSON.parse(body)
              const targetPath = path.resolve(__dirname, '1. MAIN/data/Cau1.tex')
              fs.writeFileSync(targetPath, content, 'utf-8')
              res.statusCode = 200
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ success: true, path: targetPath }))
            } catch (err: any) {
              res.statusCode = 500
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ success: false, error: err.message }))
            }
          })
        } else {
          next()
        }
      })
    }
  }
}

export default defineConfig({
  plugins: [react(), saveCau1Plugin()],
  server: {
    watch: {
      ignored: ['**/.zalo_session/**', '**/1. MAIN/data/**']
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})

