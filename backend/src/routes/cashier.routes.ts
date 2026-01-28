import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware.js'

const router = Router()

// GET /cashier/current - Get current cashier status
router.get('/current', authMiddleware, async (req, res) => {
    try {
        // Get the most recent cashier
        let cashier = await prisma.cashier.findFirst({
            orderBy: { id: 'desc' }
        })

        // If no cashier exists, create one
        if (!cashier) {
            cashier = await prisma.cashier.create({
                data: {
                    number: 1,
                    status: 'CLOSED',
                    openingBalance: 0,
                    operatorId: 1
                }
            })
        }

        res.json({
            id: cashier.id,
            number: cashier.number,
            status: cashier.status.toLowerCase(),
            openedAt: cashier.openedAt,
            closedAt: cashier.closedAt,
            openingBalance: cashier.openingBalance,
            expectedBalance: cashier.expectedBalance,
            actualBalance: cashier.actualBalance,
            difference: cashier.difference,
        })
    } catch (error) {
        console.error('Get current cashier error:', error)
        res.status(500).json({ error: 'Erro ao buscar caixa atual' })
    }
})

// POST /cashier/open - Open cashier
router.post('/open', authMiddleware, async (req: AuthRequest, res) => {
    try {
        const { openingBalance, observations } = req.body

        // Check if there's already an open cashier
        const existingOpen = await prisma.cashier.findFirst({
            where: { status: 'OPEN' }
        })

        if (existingOpen) {
            return res.status(400).json({ error: 'Já existe um caixa aberto' })
        }

        // Create new cashier session
        const cashier = await prisma.cashier.create({
            data: {
                number: 1,
                status: 'OPEN',
                openedAt: new Date(),
                openingBalance: openingBalance || 0,
                observations,
                operatorId: req.userId || 1
            }
        })

        res.status(201).json({
            id: cashier.id,
            number: cashier.number,
            status: 'open',
            openedAt: cashier.openedAt,
            openingBalance: cashier.openingBalance,
        })
    } catch (error) {
        console.error('Open cashier error:', error)
        res.status(500).json({ error: 'Erro ao abrir caixa' })
    }
})

// POST /cashier/close - Close cashier
router.post('/close', authMiddleware, async (req, res) => {
    try {
        const { actualBalance, observations } = req.body

        // Find open cashier
        const cashier = await prisma.cashier.findFirst({
            where: { status: 'OPEN' }
        })

        if (!cashier) {
            return res.status(400).json({ error: 'Não há caixa aberto' })
        }

        // Calculate expected balance
        const transactions = await prisma.cashierTransaction.findMany({
            where: { cashierId: cashier.id }
        })

        let expectedBalance = cashier.openingBalance
        for (const tx of transactions) {
            if (tx.type === 'SALE' || tx.type === 'SUPPLY') {
                expectedBalance += tx.amount
            } else if (tx.type === 'WITHDRAWAL') {
                expectedBalance -= tx.amount
            }
        }

        const difference = actualBalance - expectedBalance

        // Update cashier
        const updatedCashier = await prisma.cashier.update({
            where: { id: cashier.id },
            data: {
                status: 'CLOSED',
                closedAt: new Date(),
                expectedBalance,
                actualBalance,
                difference,
                observations,
            }
        })

        res.json({
            id: updatedCashier.id,
            status: 'closed',
            closedAt: updatedCashier.closedAt,
            expectedBalance,
            actualBalance,
            difference,
        })
    } catch (error) {
        console.error('Close cashier error:', error)
        res.status(500).json({ error: 'Erro ao fechar caixa' })
    }
})

// POST /cashier/transactions - Create transaction (withdrawal/supply)
router.post('/transactions', authMiddleware, async (req, res) => {
    try {
        const { type, amount, description, observations, localId } = req.body

        // Find open cashier
        const cashier = await prisma.cashier.findFirst({
            where: { status: 'OPEN' }
        })

        if (!cashier) {
            return res.status(400).json({ error: 'Não há caixa aberto' })
        }

        // Map type
        const typeMap: Record<string, 'WITHDRAWAL' | 'SUPPLY'> = {
            withdrawal: 'WITHDRAWAL',
            supply: 'SUPPLY'
        }

        const transaction = await prisma.cashierTransaction.create({
            data: {
                localId,
                cashierId: cashier.id,
                type: typeMap[type] || 'WITHDRAWAL',
                amount,
                description,
                observations,
            }
        })

        res.status(201).json(transaction)
    } catch (error) {
        console.error('Create transaction error:', error)
        res.status(500).json({ error: 'Erro ao criar transação' })
    }
})

// GET /cashier/:id/transactions - Get cashier transactions
router.get('/:id/transactions', authMiddleware, async (req, res) => {
    try {
        const cashierId = parseInt(req.params.id)

        const transactions = await prisma.cashierTransaction.findMany({
            where: { cashierId },
            orderBy: { createdAt: 'desc' }
        })

        res.json(transactions)
    } catch (error) {
        console.error('Get transactions error:', error)
        res.status(500).json({ error: 'Erro ao buscar transações' })
    }
})

// GET /cashier/:id/summary - Get cashier summary
router.get('/:id/summary', authMiddleware, async (req, res) => {
    try {
        const cashierId = parseInt(req.params.id)

        const cashier = await prisma.cashier.findUnique({
            where: { id: cashierId }
        })

        if (!cashier) {
            return res.status(404).json({ error: 'Caixa não encontrado' })
        }

        // Get sales by payment method
        const sales = await prisma.sale.findMany({
            where: { cashierId }
        })

        const salesCash = sales.filter(s => s.paymentMethod === 'CASH').reduce((sum, s) => sum + s.total, 0)
        const salesDebit = sales.filter(s => s.paymentMethod === 'DEBIT').reduce((sum, s) => sum + s.total, 0)
        const salesCredit = sales.filter(s => s.paymentMethod === 'CREDIT').reduce((sum, s) => sum + s.total, 0)
        const salesPix = sales.filter(s => s.paymentMethod === 'PIX').reduce((sum, s) => sum + s.total, 0)
        const salesInstallment = sales.filter(s => s.paymentMethod === 'INSTALLMENT').reduce((sum, s) => sum + s.total, 0)

        // Get transactions
        const transactions = await prisma.cashierTransaction.findMany({
            where: { cashierId }
        })

        const withdrawals = transactions.filter(t => t.type === 'WITHDRAWAL').reduce((sum, t) => sum + t.amount, 0)
        const supplies = transactions.filter(t => t.type === 'SUPPLY').reduce((sum, t) => sum + t.amount, 0)

        // Calculate expected balance (only cash goes to the register)
        const expectedBalance = cashier.openingBalance + salesCash + supplies - withdrawals

        res.json({
            openingBalance: cashier.openingBalance,
            salesCash,
            salesDebit,
            salesCredit,
            salesPix,
            salesInstallment,
            withdrawals,
            supplies,
            expectedBalance,
        })
    } catch (error) {
        console.error('Get summary error:', error)
        res.status(500).json({ error: 'Erro ao buscar resumo' })
    }
})

export default router
