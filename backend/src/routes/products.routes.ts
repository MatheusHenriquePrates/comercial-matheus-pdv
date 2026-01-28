
import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { authMiddleware } from '../middleware/auth.middleware.js'

const router = Router()

// GET /api/products - List products with search, pagination and filtering
router.get('/', authMiddleware, async (req, res) => {
    try {
        const {
            search,
            marca,
            categoria,
            estoqueBaixo,
            semEstoque,
            page = '1',
            limit = '20',
            orderBy = 'name'
        } = req.query as any

        const where: any = { active: true }

        // Search by name, EAN or code
        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { barcode: { contains: search, mode: 'insensitive' } },
                { code: { contains: search, mode: 'insensitive' } },
            ]
        }

        // Filters
        if (marca) where.brand = marca
        if (categoria) where.category = categoria
        if (estoqueBaixo === 'true') {
            where.stock = { lt: prisma.product.fields.minStock }
        }
        if (semEstoque === 'true') {
            where.stock = 0
        }

        const skip = (parseInt(page) - 1) * parseInt(limit)

        // Sorting
        // Map frontend sort keys to database columns if needed, or use direct
        const orderByKey = orderBy === 'preco' ? 'price' : orderBy === 'estoque' ? 'stock' : 'name'

        const [products, total] = await Promise.all([
            prisma.product.findMany({
                where,
                skip,
                take: parseInt(limit),
                orderBy: { [orderByKey]: 'asc' }
            }),
            prisma.product.count({ where })
        ])

        res.json({
            products,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            }
        })

    } catch (error) {
        console.error('Error fetching products:', error)
        res.status(500).json({ error: 'Erro ao buscar produtos' })
    }
})

// PUT /api/products/:id - Update product
router.put('/:id', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params
        const { price, profitMargin, minStock, brand, category, name, cost } = req.body

        // Optional: Recalculate margin if price changed but margin didn't, or vice-versa?
        // For now trusting frontend payload

        const product = await prisma.product.update({
            where: { id: parseInt(id) },
            data: {
                name,
                price: parseFloat(price),
                cost: parseFloat(cost),
                profitMargin: parseFloat(profitMargin),
                minStock: parseInt(minStock),
                brand,
                category
            }
        })

        res.json(product)

    } catch (error) {
        console.error('Error updating product:', error)
        res.status(500).json({ error: 'Erro ao atualizar produto' })
    }
})

// POST /api/products/:id/adjust-stock - Adjust stock
router.post('/:id/adjust-stock', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params
        const { quantity, reason } = req.body // quantity can be positive or negative

        const productId = parseInt(id)

        const product = await prisma.product.findUnique({ where: { id: productId } })
        if (!product) return res.status(404).json({ error: 'Produto não encontrado' })

        const newQuantity = product.stock + parseFloat(quantity)
        if (newQuantity < 0) {
            return res.status(400).json({ error: 'Quantidade insuficiente em estoque para esta operação' })
        }

        // Transaction to ensure data integrity
        await prisma.$transaction(async (tx) => {
            await tx.product.update({
                where: { id: productId },
                data: { stock: newQuantity }
            })

            await tx.stockMovement.create({
                data: {
                    productId: productId,
                    type: 'ajuste_manual',
                    quantity: parseFloat(quantity),
                    reason: reason || 'Ajuste manual de estoque'
                }
            })
        })

        res.json({ success: true, newStock: newQuantity })

    } catch (error) {
        console.error('Error adjusting stock:', error)
        res.status(500).json({ error: 'Erro ao ajustar estoque' })
    }
})

// GET /api/products/stock/summary - Stock Summary
router.get('/stock-summary', authMiddleware, async (req, res) => {
    try {
        const [total, semEstoque, estoqueBaixo] = await Promise.all([
            prisma.product.count({ where: { active: true } }),
            prisma.product.count({ where: { active: true, stock: 0 } }),
            prisma.product.count({
                where: {
                    active: true,
                    stock: { lt: prisma.product.fields.minStock }
                }
            })
        ])

        // Calculate total value
        // Note: For large datasets, this might be heavy. 
        // Ideally should assume specific query or aggregation.
        const allProducts = await prisma.product.findMany({
            where: { active: true },
            select: { stock: true, cost: true, price: true }
        })

        const valorTotalCusto = allProducts.reduce((acc, p) => acc + (p.stock * (p.cost || 0)), 0)
        const valorTotalVenda = allProducts.reduce((acc, p) => acc + (p.stock * p.price), 0)

        res.json({
            totalProdutos: total,
            semEstoque,
            estoqueBaixo,
            valorTotalCusto,
            valorTotalVenda
        })

    } catch (error) {
        console.error('Error fetching stock summary:', error)
        res.status(500).json({ error: 'Erro ao buscar resumo de estoque' })
    }
})

// POST /api/products - Create new product manually
router.post('/', authMiddleware, async (req, res) => {
    try {
        const { name, barcode, brand, category, cost, price, profitMargin, minStock, stock } = req.body

        // Check if barcode already exists
        if (barcode) {
            const existing = await prisma.product.findUnique({ where: { barcode } })
            if (existing) {
                return res.status(400).json({ error: 'Já existe um produto com este código de barras (EAN)' })
            }
        }

        const newProduct = await prisma.product.create({
            data: {
                name,
                barcode: barcode || null,
                brand,
                category,
                cost: parseFloat(cost || 0),
                price: parseFloat(price),
                profitMargin: parseFloat(profitMargin),
                minStock: parseInt(minStock),
                stock: parseInt(stock || 0),
                unit: 'UN' // Default
            }
        })

        // Initial stock movement if stock > 0
        if (stock > 0) {
            await prisma.stockMovement.create({
                data: {
                    productId: newProduct.id,
                    type: 'ajuste_manual',
                    quantity: parseInt(stock),
                    reason: 'Estoque Inicial (Cadastro Manual)'
                }
            })
        }

        res.json(newProduct)

    } catch (error) {
        console.error('Error creating product:', error)
        res.status(500).json({ error: 'Erro ao cadastrar produto' })
    }
})

export default router
