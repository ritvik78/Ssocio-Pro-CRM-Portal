import 'dotenv/config'
import cors from 'cors'
import express from 'express'
import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import multer from 'multer'
import nodemailer from 'nodemailer'
import { verifyAuth } from '@supabase/server/core'
import * as XLSX from 'xlsx'
import { getDatabasePool, isDatabaseConfigured } from './server/database.js'
import { getPrisma, isPrismaConfigured } from './server/prisma.js'
import { getSupabaseAdmin, isSupabaseServerConfigured } from './server/supabase.js'

const app = express()
const port = Number(process.env.PORT || process.env.API_PORT || 8787)

app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' }))
app.use(express.json({ limit: '1mb' }))

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const storageDir = path.join(__dirname, 'data')
const clientDistDir = path.join(__dirname, 'dist')
app.use(express.static(clientDistDir))
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } })
const audiences = new Set(['brand', 'influencer'])

const storagePaths = (audience) => ({
  xlsx: path.join(storageDir, `${audience}-submissions.xlsx`),
  csv: path.join(storageDir, `${audience}-submissions.csv`),
})

const validAudience = (audience) => audiences.has(audience)

const readStoredRows = async (audience) => {
  const { xlsx } = storagePaths(audience)
  try {
    const workbook = XLSX.read(await fs.readFile(xlsx), { type: 'buffer' })
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    return XLSX.utils.sheet_to_json(sheet, { defval: '' })
  } catch (error) {
    if (error.code === 'ENOENT') return []
    throw error
  }
}

const writeStoredRows = async (audience, rows) => {
  await fs.mkdir(storageDir, { recursive: true })
  const worksheet = XLSX.utils.json_to_sheet(rows)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Submissions')
  const { xlsx, csv } = storagePaths(audience)
  await fs.writeFile(xlsx, XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }))
  await fs.writeFile(csv, XLSX.utils.sheet_to_csv(worksheet), 'utf8')
}

const storageError = (response, error) => response.status(500).json({ ok: false, error: 'Could not save submission data', details: error.message })

const requiredSmtp = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'MAIL_FROM']
const missingSmtp = () => requiredSmtp.filter((key) => !process.env[key])
const escapeHtml = (value) => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;')

const transporter = () => nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: String(process.env.SMTP_SECURE).toLowerCase() === 'true',
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
})

const validRoles = new Set(['Ops / Admin', 'Brand', 'Influencer'])
const isValidUsername = (value) => /^[a-zA-Z0-9_.@]{3,50}$/.test(value)
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex')
const randomToken = () => crypto.randomBytes(32).toString('hex')
const hashPassword = (password) => new Promise((resolve, reject) => {
  const salt = crypto.randomBytes(16).toString('hex')
  crypto.scrypt(password, salt, 64, (error, derivedKey) => {
    if (error) return reject(error)
    resolve(`${salt}:${derivedKey.toString('hex')}`)
  })
})
const verifyPassword = (password, stored) => new Promise((resolve) => {
  const [salt, key] = String(stored).split(':')
  if (!salt || !key) return resolve(false)
  crypto.scrypt(password, salt, 64, (error, derivedKey) => {
    if (error) return resolve(false)
    const expected = Buffer.from(key, 'hex')
    resolve(derivedKey.length === expected.length && crypto.timingSafeEqual(derivedKey, expected))
  })
})
const bearerToken = (request) => {
  const authorization = request.headers.authorization || ''
  return authorization.startsWith('Bearer ') ? authorization.slice(7).trim() : ''
}
const authUnavailable = (response) => response.status(503).json({ ok: false, error: 'The authentication database is not configured. Add DATABASE_URL and DIRECT_URL to the backend .env, then create the users table from supabase-schema.sql.' })

app.get('/api/health', (_request, response) => {
  response.json({ ok: true, emailConfigured: missingSmtp().length === 0, supabaseConfigured: isSupabaseServerConfigured(), databaseConfigured: isDatabaseConfigured(), prismaConfigured: isPrismaConfigured() })
})

app.get('/api/prisma/status', async (_request, response) => {
  const prisma = getPrisma()
  if (!prisma) return response.json({ ok: true, configured: false, ready: false })
  try {
    await prisma.$queryRaw`SELECT 1`
    response.json({ ok: true, configured: true, ready: true })
  } catch (error) {
    console.error('Prisma connection check failed:', error.message)
    response.json({ ok: true, configured: true, ready: false })
  }
})

app.get('/api/database/status', async (_request, response) => {
  const database = getDatabasePool()
  if (!database) return response.json({ ok: true, configured: false, ready: false })
  try {
    await database.query('select 1')
    response.json({ ok: true, configured: true, ready: true })
  } catch (error) {
    console.error('Database connection check failed:', error.message)
    response.json({ ok: true, configured: true, ready: false })
  }
})

app.get('/api/supabase/status', async (_request, response) => {
  const supabase = getSupabaseAdmin()
  if (!supabase) return response.json({ ok: true, configured: false, ready: false })
  try {
    const { error } = await supabase.from('submissions').select('id').limit(1)
    if (error) throw error
    response.json({ ok: true, configured: true, ready: true })
  } catch (error) {
    console.error('Supabase server check failed:', error.message)
    response.json({ ok: true, configured: true, ready: false })
  }
})

app.get('/api/auth/me', async (request, response) => {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_PUBLISHABLE_KEY || !process.env.SUPABASE_JWKS_URL) {
    return response.status(503).json({ ok: false, error: 'Supabase user verification is not configured' })
  }
  const authRequest = new Request('http://localhost/api/auth/me', {
    headers: {
      authorization: request.headers.authorization || '',
      apikey: request.headers.apikey || '',
    },
  })
  const result = await verifyAuth(authRequest, {
    auth: 'user',
    env: {
      SUPABASE_URL: process.env.SUPABASE_URL,
      SUPABASE_PUBLISHABLE_KEY: process.env.SUPABASE_PUBLISHABLE_KEY,
      SUPABASE_JWKS_URL: process.env.SUPABASE_JWKS_URL,
    },
  })
  if (result.error) return response.status(401).json({ ok: false, error: 'Authentication required' })
  response.json({ ok: true, user: result.data.userClaims })
})

app.get('/api/auth/session', async (request, response) => {
  const token = bearerToken(request)
  if (!token) return response.status(401).json({ ok: false, error: 'Sign in required' })
  const database = getDatabasePool()
  if (!database) return authUnavailable(response)
  try {
    const result = await database.query('select username, role from users where token_hash = $1', [sha256(token)])
    if (!result.rows.length) return response.status(401).json({ ok: false, error: 'Session expired. Sign in again.' })
    response.json({ ok: true, user: result.rows[0] })
  } catch (error) {
    console.error('Auth session check failed:', error.message)
    response.status(500).json({ ok: false, error: 'Could not verify your session' })
  }
})

app.post('/api/auth/signup', async (request, response) => {
  const { username, password, role } = request.body || {}
  const cleanUsername = String(username || '').trim()
  if (!isValidUsername(cleanUsername)) return response.status(400).json({ ok: false, error: 'Username must be 3-50 characters using letters, numbers, dots, underscores, or an @' })
  if (String(password || '').length < 6) return response.status(400).json({ ok: false, error: 'Password must be at least 6 characters' })
  if (!validRoles.has(role)) return response.status(400).json({ ok: false, error: 'Choose a valid role' })
  const database = getDatabasePool()
  if (!database) return authUnavailable(response)
  try {
    const existing = await database.query('select id from users where username = $1', [cleanUsername])
    if (existing.rows.length) return response.status(409).json({ ok: false, error: 'Username is already taken' })
    const token = randomToken()
    const passwordHash = await hashPassword(String(password))
    await database.query(
      'insert into users (username, password_hash, role, token_hash) values ($1, $2, $3, $4)',
      [cleanUsername, passwordHash, role, sha256(token)],
    )
    response.json({ ok: true, user: { username: cleanUsername, role }, token })
  } catch (error) {
    console.error('Sign up failed:', error.message)
    response.status(500).json({ ok: false, error: 'Could not create your account. Check that the users table exists in the database.' })
  }
})

app.post('/api/auth/login', async (request, response) => {
  const { username, password } = request.body || {}
  const cleanUsername = String(username || '').trim()
  if (!cleanUsername || !password) return response.status(400).json({ ok: false, error: 'Enter your username and password' })
  const database = getDatabasePool()
  if (!database) return authUnavailable(response)
  try {
    const result = await database.query('select id, username, role, password_hash from users where username = $1', [cleanUsername])
    const user = result.rows[0]
    if (!user || !(await verifyPassword(String(password), user.password_hash))) {
      return response.status(401).json({ ok: false, error: 'Invalid username or password' })
    }
    const token = randomToken()
    await database.query('update users set token_hash = $1 where id = $2', [sha256(token), user.id])
    response.json({ ok: true, user: { username: user.username, role: user.role }, token })
  } catch (error) {
    console.error('Sign in failed:', error.message)
    response.status(500).json({ ok: false, error: 'Could not sign you in. Check that the users table exists in the database.' })
  }
})

app.post('/api/auth/logout', async (request, response) => {
  const token = bearerToken(request)
  const database = getDatabasePool()
  if (token && database) {
    try {
      await database.query('update users set token_hash = null where token_hash = $1', [sha256(token)])
    } catch (error) {
      console.error('Could not revoke session:', error.message)
    }
  }
  response.json({ ok: true })
})

app.get('/api/email/status', async (_request, response) => {
  if (missingSmtp().length) return response.json({ ok: true, configured: false, ready: false })
  try {
    await transporter().verify()
    response.json({ ok: true, configured: true, ready: true })
  } catch (error) {
    console.error('Email service check failed:', error.message)
    response.json({ ok: true, configured: true, ready: false })
  }
})

app.get('/api/storage/submissions/:audience', async (request, response) => {
  const { audience } = request.params
  if (!validAudience(audience)) return response.status(400).json({ ok: false, error: 'Audience must be brand or influencer' })
  try { response.json({ ok: true, audience, rows: await readStoredRows(audience) }) } catch (error) { storageError(response, error) }
})

app.put('/api/storage/submissions/:audience', async (request, response) => {
  const { audience } = request.params
  const { rows } = request.body || {}
  if (!validAudience(audience)) return response.status(400).json({ ok: false, error: 'Audience must be brand or influencer' })
  if (!Array.isArray(rows)) return response.status(400).json({ ok: false, error: 'rows must be an array' })
  try { await writeStoredRows(audience, rows); response.json({ ok: true, audience, count: rows.length }) } catch (error) { storageError(response, error) }
})

app.get('/api/storage/submissions/:audience/download/:format', async (request, response) => {
  const { audience, format } = request.params
  if (!validAudience(audience) || !['csv', 'xlsx'].includes(format)) return response.status(400).json({ ok: false, error: 'Use a valid audience and csv or xlsx format' })
  try {
    const filePath = storagePaths(audience)[format]
    await fs.access(filePath)
    response.download(filePath, `${audience}-submissions.${format}`)
  } catch (error) {
    if (error.code === 'ENOENT') return response.status(404).json({ ok: false, error: 'No stored data file exists yet' })
    storageError(response, error)
  }
})

app.post('/api/storage/submissions/:audience/upload', upload.single('file'), async (request, response) => {
  const { audience } = request.params
  if (!validAudience(audience)) return response.status(400).json({ ok: false, error: 'Audience must be brand or influencer' })
  if (!request.file) return response.status(400).json({ ok: false, error: 'Attach a CSV or XLSX file as file' })
  try {
    const workbook = XLSX.read(request.file.buffer, { type: 'buffer' })
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    const imported = XLSX.utils.sheet_to_json(sheet, { defval: '' })
    const rows = [...imported, ...(await readStoredRows(audience))]
    await writeStoredRows(audience, rows)
    response.json({ ok: true, audience, imported: imported.length, count: rows.length, rows })
  } catch (error) { storageError(response, error) }
})

app.post('/api/email/send', async (request, response) => {
  const { recipient, subject, body } = request.body || {}
  const cleanRecipient = String(recipient || '').trim()
  const cleanSubject = String(subject || '').trim()
  const cleanBody = String(body || '').trim()
  if (!cleanRecipient || !cleanSubject || !cleanBody) return response.status(400).json({ ok: false, error: 'recipient, subject, and body are required' })
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanRecipient)) return response.status(400).json({ ok: false, error: 'Enter a valid recipient email address' })
  const missing = missingSmtp()
  if (missing.length) return response.status(503).json({ ok: false, error: 'Email service is not configured. Add SMTP settings to .env.', missing })

  try {
    const result = await transporter().sendMail({
      from: process.env.MAIL_FROM,
      to: cleanRecipient,
      subject: cleanSubject,
      text: cleanBody,
      html: escapeHtml(cleanBody).replace(/\n/g, '<br>'),
    })
    response.json({ ok: true, messageId: result.messageId, recipient: cleanRecipient, sentAt: new Date().toISOString() })
  } catch (error) {
    console.error('Email delivery failed:', error.message)
    response.status(502).json({ ok: false, error: 'Email delivery failed. Check your SMTP settings.' })
  }
})

app.get('/', (_request, response) => response.sendFile(path.join(clientDistDir, 'index.html')))

app.listen(port, () => console.log(`Ssocio Pro email API listening on http://localhost:${port}`))
