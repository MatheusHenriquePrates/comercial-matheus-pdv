export { }
const API_URL = 'http://localhost:3333'

// Mock data based on user screenshot
// MOCOCA COCO RALADO 50G, EAN 7891030030184, Cod 47011, Stock 48, Price 2.48
// MOCOCA CREME DE LEITE, EAN 7891030003487, Cod 47001, Stock 54, Price 3.36

const mockProducts = [
    {
        codigo: '47011',
        ean: '7891030030184',
        nome: 'MOCOCA COCO RALADO 50G',
        ncm: '00000000',
        unidade: 'UN',
        quantidade: 48,
        valorUnitario: 2.48,
        valorTotal: 119.04,
        icms: 0, ipi: 0, pis: 0, cofins: 0,
        unidadeEmbalagem: 'CX',
        unidadesPorEmbalagem: 1,
        price: 4.22
    },
    {
        codigo: '47001',
        ean: '7891030003487',
        nome: 'MOCOCA CREME DE LEITE LEVE UHT TP 200G',
        ncm: '00000000',
        unidade: 'UN',
        quantidade: 54,
        valorUnitario: 3.36,
        valorTotal: 181.44,
        icms: 0, ipi: 0, pis: 0, cofins: 0,
        unidadeEmbalagem: null,
        unidadesPorEmbalagem: 1,
        price: 5.70
    },
    {
        codigo: '47008',
        ean: '7891030030160',
        nome: 'MOCOCA LEITE DE COCO 200ML',
        ncm: '00000000',
        unidade: 'UN',
        quantidade: 24,
        valorUnitario: 4.10,
        valorTotal: 98.40,
        icms: 0, ipi: 0, pis: 0, cofins: 0,
        unidadeEmbalagem: null,
        unidadesPorEmbalagem: 1,
        price: 6.98
    }
]

async function main() {
    try {
        console.log('Authenticating...')
        const loginRes = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'admin', password: 'admin123' })
        })

        if (!loginRes.ok) throw new Error(`Login failed: ${loginRes.status}`)
        const loginData = await loginRes.json()
        const token = (loginData as any).token

        console.log('Sending NFE import request...')
        const response = await fetch(`${API_URL}/nfe/import`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                nfe: {
                    numero: '12345',
                    fornecedor: { nome: 'FORNECEDOR TESTE', cnpj: '00000000000000' },
                    valorTotal: 1000.00
                },
                products: mockProducts
            })
        })

        if (response.ok) {
            console.log('Success:', await response.json())
        } else {
            console.error('API Error Status:', response.status)
            console.error('API Error Data:', await response.text())
        }

    } catch (error: any) {
        console.error('Error:', error.message)
    }
}

main()
