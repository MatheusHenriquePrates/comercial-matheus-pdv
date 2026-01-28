
import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { authMiddleware } from '../middleware/auth.middleware.js'
import fs from 'fs'
import path from 'path'

const router = Router()

// POST /nfe/import - Import NFE products and update stock
router.post('/import', authMiddleware, async (req, res) => {
    try {
        const { nfe, products } = req.body

        if (!products || !Array.isArray(products)) {
            return res.status(400).json({ error: 'Lista de produtos inválida' })
        }

        console.log(`[NFE Import] Processing ${products.length} products from NFE ${nfe.numero}`)

        const report = {
            novos: 0,
            atualizados: 0,
            total: products.length,
            totalAdicionado: 0
        }

        await prisma.$transaction(async (tx) => {
            for (const [index, item] of products.entries()) {
                try {
                    // Ensure identifiers are strings
                    const ean = item.ean ? String(item.ean) : null
                    const codigo = item.codigo ? String(item.codigo) : null

                    // Try to find existing product by Code or EAN
                    let product = null

                    if (ean && ean !== 'SEM GTIN') {
                        product = await tx.product.findUnique({ where: { barcode: ean } })
                    }

                    if (!product && codigo) {
                        product = await tx.product.findUnique({ where: { code: codigo } })
                    }

                    const safeParseFloat = (val: any) => {
                        const num = parseFloat(val)
                        return isNaN(num) ? 0 : num
                    }

                    const quantity = safeParseFloat(item.quantidade)
                    const cost = safeParseFloat(item.valorUnitario)
                    // If price not provided, apply 70% margin default
                    const price = item.price ? safeParseFloat(item.price) : cost * 1.70

                    if (product) {
                        // Update existing
                        await tx.product.update({
                            where: { id: product.id },
                            data: {
                                cost: cost,
                                price: price,
                                stock: { increment: quantity }, // Must be Int
                                ncm: item.ncm ? String(item.ncm) : product.ncm,
                                brand: item.marca ? String(item.marca) : product.brand,
                                taxICMS: item.icms || product.taxICMS,
                                taxIPI: item.ipi || product.taxIPI,
                                taxPIS: item.pis || product.taxPIS,
                                taxCOFINS: item.cofins || product.taxCOFINS,
                                unidadeEmbalagem: item.unidadeEmbalagem || product.unidadeEmbalagem,
                                unidadesPorEmbalagem: item.unidadesPorEmbalagem || product.unidadesPorEmbalagem
                            }
                        })

                        await tx.stockMovement.create({
                            data: {
                                productId: product.id,
                                type: 'entrada_nfe',
                                quantity: quantity,
                                reason: `Importação NFE ${nfe.numero}`,
                                nfeNumber: String(nfe.numero)
                            }
                        })

                        report.atualizados++
                        report.totalAdicionado += quantity
                    } else {
                        // Create new
                        const newProduct = await tx.product.create({
                            data: {
                                code: codigo,
                                barcode: (ean && ean !== 'SEM GTIN') ? ean : null,
                                name: item.nome,
                                description: item.nome,
                                unit: item.unidade || 'UN',
                                price: price,
                                cost: cost,
                                stock: quantity,
                                ncm: item.ncm ? String(item.ncm) : null,
                                category: 'Geral',
                                taxICMS: item.icms,
                                taxIPI: item.ipi,
                                taxPIS: item.pis,
                                taxCOFINS: item.cofins,
                                unidadeEmbalagem: item.unidadeEmbalagem,
                                unidadesPorEmbalagem: item.unidadesPorEmbalagem || 1
                            }
                        })

                        await tx.stockMovement.create({
                            data: {
                                productId: newProduct.id,
                                type: 'entrada_nfe',
                                quantity: quantity,
                                reason: `Importação NFE ${nfe.numero}`,
                                nfeNumber: String(nfe.numero)
                            }
                        })

                        report.novos++
                        report.totalAdicionado += quantity
                    }
                } catch (err: any) {
                    console.error(`[NFE Import] Error processing item ${index} (${item.nome}):`, err.message)
                    throw err // Rethrow to abort transaction
                }
            }
        })

        res.json({
            success: true,
            nfe: {
                numero: nfe.numero,
                fornecedor: nfe.fornecedor.nome,
                valorTotal: nfe.valorTotal
            },
            produtos: report,
            estoque: {
                totalAdicionado: report.totalAdicionado
            }
        })

    } catch (error: any) {
        const errorLog = {
            timestamp: new Date().toISOString(),
            error: error.message,
            stack: error.stack,
            full: JSON.stringify(error, Object.getOwnPropertyNames(error))
        }

        const logPath = path.join(process.cwd(), 'nfe-error.log')
        fs.appendFileSync(logPath, JSON.stringify(errorLog, null, 2) + '\n---\n')

        console.error('NFE Import error (FULL):', errorLog.full)
        res.status(500).json({
            error: 'Erro ao importar NFE',
            details: error.message
        })
    }
})

export default router
