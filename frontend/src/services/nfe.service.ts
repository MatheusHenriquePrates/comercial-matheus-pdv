
import { XMLParser } from 'fast-xml-parser'

export interface NFEProduct {
    codigo: string
    ean: string
    nome: string
    ncm: string
    unidade: string
    quantidade: number
    valorUnitario: number
    valorTotal: number
    icms: number
    ipi: number
    pis: number
    cofins: number
    // Packaging Info
    unidadeEmbalagem?: string
    unidadesPorEmbalagem?: number
    // Helper for UI
    price?: number // Suggested/Edited price
    margin?: number // Suggested/Edited margin
}

export interface NFEData {
    numero: string
    serie: string
    dataEmissao: string
    fornecedor: {
        cnpj: string
        nome: string
        nomeFantasia: string
    }
    produtos: NFEProduct[]
    valorTotal: number
    valorProdutos: number
}

const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_"
})

export const nfeService = {
    parseXML: (xmlContent: string): NFEData => {
        try {
            const jsonObj = parser.parse(xmlContent)

            // Validate Basic NFE structure
            if (!jsonObj.nfeProc && !jsonObj.NFe) {
                throw new Error('Arquivo XML inválido: Tag <NFe> ou <nfeProc> não encontrada.')
            }

            const nfe = jsonObj.nfeProc ? jsonObj.nfeProc.NFe : jsonObj.NFe
            const infNFe = nfe.infNFe

            const ide = infNFe.ide
            const emit = infNFe.emit
            const det = Array.isArray(infNFe.det) ? infNFe.det : [infNFe.det]
            const total = infNFe.total.ICMSTot

            const produtos: NFEProduct[] = det.map((item: any) => {
                const prod = item.prod
                const imposto = item.imposto

                // Helper to safely parse float
                const safeFloat = (value: any) => {
                    const parsed = parseFloat(value)
                    return isNaN(parsed) ? 0 : parsed
                }

                // Helper to get tax value safely
                const getTax = (group: any, tag: string) => {
                    if (!group) return 0
                    const keys = Object.keys(group)
                    if (keys.length === 0) return 0
                    const subGroup = group[keys[0]]
                    return subGroup[`v${tag}`] ? safeFloat(subGroup[`v${tag}`]) : 0
                }

                // Extract packaging info (heuristic)
                // Looks for patterns like "CX 12", "FD 6", "12X1" in product name or unit
                const extractUnits = (name: string, unit: string) => {
                    let packaging = null
                    let amount = 1

                    // Common patterns
                    const regex = /\b(CX|FD|PCT|PC|DZ|FARDO|CAIXA)\s*(\d+)/i
                    const match = name.match(regex)

                    if (match) {
                        packaging = match[1].toUpperCase()
                        amount = parseInt(match[2])
                    } else if (unit && unit.length <= 3 && unit !== 'UN' && unit !== 'KG' && unit !== 'L') {
                        // If unit is something like 'CX', assume it might be packaging, but amount is unknown (default 1)
                        // Or try to find amount in name
                        packaging = unit
                    }

                    return { packaging, amount }
                }

                const { packaging, amount } = extractUnits(prod.xProd, prod.uCom)

                return {
                    codigo: prod.cProd,
                    ean: prod.cEAN || 'SEM GTIN',
                    nome: prod.xProd,
                    ncm: prod.NCM,
                    unidade: prod.uCom,
                    quantidade: safeFloat(prod.qCom),
                    valorUnitario: safeFloat(prod.vUnCom),
                    valorTotal: safeFloat(prod.vProd),
                    icms: getTax(imposto.ICMS, 'ICMS'),
                    ipi: getTax(imposto.IPI, 'IPI'),
                    pis: getTax(imposto.PIS, 'PIS'),
                    cofins: getTax(imposto.COFINS, 'COFINS'),
                    unidadeEmbalagem: packaging || undefined,
                    unidadesPorEmbalagem: amount
                }
            })

            return {
                numero: ide.nNF,
                serie: ide.serie,
                dataEmissao: ide.dhEmi,
                fornecedor: {
                    cnpj: emit.CNPJ,
                    nome: emit.xNome,
                    nomeFantasia: emit.xFant || emit.xNome
                },
                produtos,
                valorTotal: parseFloat(total.vNF),
                valorProdutos: parseFloat(total.vProd)
            }

        } catch (error) {
            console.error('Error parsing XML:', error)
            throw new Error('Falha ao processar o arquivo XML da NFE.')
        }
    }
}
