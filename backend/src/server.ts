import express, { Request, Response, NextFunction } from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { prisma } from './lib/prisma.js'

// Import routes
import authRoutes from './routes/auth.routes.js'
import productRoutes from './routes/products.routes.js'
import cashierRoutes from './routes/cashier.routes.js'
import salesRoutes from './routes/sales.routes.js'
import customerRoutes from './routes/customers.routes.js'
import debtRoutes from './routes/debts.routes.js'
import nfeRoutes from './routes/nfe.routes.js'
import fiscalRoutes from './routes/fiscal.routes.js'

// Load environment variables
dotenv.config()

// Create Express app
const app = express()

// Middleware
app.use(cors({
    origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}))
app.use(express.json())

// ===== HEALTH CHECK =====
app.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// ===== ROUTES =====

app.use('/auth', authRoutes)
app.use('/products', productRoutes)
app.use('/cashier', cashierRoutes)
app.use('/sales', salesRoutes)
app.use('/customers', customerRoutes)
app.use('/debts', debtRoutes)
app.use('/nfe', nfeRoutes)
app.use('/fiscal', fiscalRoutes)

// ===== ERROR HANDLING =====

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error('Error:', err.message)
    res.status(500).json({ error: err.message || 'Internal server error' })
})

app.use((_req: Request, res: Response) => {
    res.status(404).json({ error: 'Not found' })
})

// ===== START SERVER =====

const PORT = process.env.PORT || 3333

async function main() {
    try {
        // Test database connection
        await prisma.$connect()
        console.log('✅ Database connected')

        app.listen(PORT, () => {
            console.log('')
            console.log('🚀 Comercial Matheus PDV - Backend')
            console.log(`📡 Server running on http://localhost:${PORT}`)
            console.log(`🔗 Health check: http://localhost:${PORT}/health`)
            console.log('🔄 Server Restarted with New Prisma Client!')
            console.log('')
        })
    } catch (error) {
        console.error('❌ Failed to start server:', error)
        process.exit(1)
    }
}

main()

// Graceful shutdown
process.on('SIGINT', async () => {
    await prisma.$disconnect()
    process.exit(0)
})

process.on('SIGTERM', async () => {
    await prisma.$disconnect()
    process.exit(0)
})
