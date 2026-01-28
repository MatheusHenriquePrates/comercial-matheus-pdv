
import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { FileText, Upload, CheckCircle, DollarSign, Save } from 'lucide-react'
import toast from 'react-hot-toast'
import { nfeService, NFEData, NFEProduct } from '../../services/nfe.service'
import { formatCurrency } from '../../utils/formatters'
import { Modal } from '../../components/common'
import { api } from '../../services/api' // Assuming generic api client exists, we'll use it or create nfeAPI

export default function ImportNFE() {
    const [_, setFile] = useState<File | null>(null)
    const [nfeData, setNfeData] = useState<NFEData | null>(null)
    const [isProcessing, setIsProcessing] = useState(false)
    const [products, setProducts] = useState<NFEProduct[]>([])

    // Edit Modal State
    const [editingProduct, setEditingProduct] = useState<NFEProduct | null>(null)
    const [editPrice, setEditPrice] = useState('')
    const [editMargin, setEditMargin] = useState('70')

    const onDrop = useCallback(async (acceptedFiles: File[]) => {
        if (acceptedFiles.length === 0) return

        const uploadedFile = acceptedFiles[0]
        if (uploadedFile.type !== 'text/xml' && !uploadedFile.name.endsWith('.xml')) {
            toast.error('Por favor, envie um arquivo XML.')
            return
        }

        setFile(uploadedFile)
        setIsProcessing(true)

        try {
            const text = await uploadedFile.text()
            const parsedData = nfeService.parseXML(text)

            setNfeData(parsedData)

            // Initialize products with default calculation (Cost * 1.70)
            const initializedProducts = parsedData.produtos.map(p => ({
                ...p,
                price: p.valorUnitario * 1.70,
                margin: 70
            }))
            setProducts(initializedProducts)

            toast.success('XML processado com sucesso!')
        } catch (error: any) {
            console.error(error)
            toast.error(error.message || 'Erro ao processar XML')
            setFile(null)
            setNfeData(null)
        } finally {
            setIsProcessing(false)
        }
    }, [])

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { 'text/xml': ['.xml'] },
        multiple: false
    })

    const handleEditProduct = (product: NFEProduct) => {
        setEditingProduct(product)
        setEditPrice((product.price || 0).toFixed(2))
        setEditMargin((product.margin || 0).toString())
    }

    const saveProductEdit = () => {
        if (!editingProduct) return

        const newPrice = parseFloat(editPrice)
        const newMargin = parseFloat(editMargin)

        const updatedProducts = products.map(p => {
            if (p.codigo === editingProduct.codigo) {
                return { ...p, price: newPrice, margin: newMargin }
            }
            return p
        })

        setProducts(updatedProducts)
        setEditingProduct(null)
        toast.success('Preço atualizado!')
    }

    const calculatePriceFromMargin = (margin: number, cost: number) => {
        return cost * (1 + margin / 100)
    }

    const calculateMarginFromPrice = (price: number, cost: number) => {
        if (cost === 0) return 100
        return ((price - cost) / cost) * 100
    }

    const handleMarginChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const margin = parseFloat(e.target.value) || 0
        setEditMargin(margin.toString())
        if (editingProduct) {
            setEditPrice(calculatePriceFromMargin(margin, editingProduct.valorUnitario).toFixed(2))
        }
    }

    const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const price = parseFloat(e.target.value) || 0
        setEditPrice(price.toString())
        if (editingProduct) {
            setEditMargin(calculateMarginFromPrice(price, editingProduct.valorUnitario).toFixed(2))
        }
    }

    const handleConfirmImport = async () => {
        if (!nfeData) return

        setIsProcessing(true)
        try {
            await api.post('/nfe/import', {
                nfe: {
                    numero: nfeData.numero,
                    fornecedor: nfeData.fornecedor,
                    valorTotal: nfeData.valorTotal
                },
                products: products
            })

            toast.success('Importação concluída com sucesso!')
            // Reset state
            setFile(null)
            setNfeData(null)
            setProducts([])
        } catch (error) {
            console.error('Import error:', error)
            toast.error('Erro ao salvar produtos no sistema.')
        } finally {
            setIsProcessing(false)
        }
    }

    const totalInvestido = nfeData ? nfeData.valorProdutos : 0
    const totalVendaEstimado = products.reduce((acc, p) => acc + (p.price || 0) * p.quantidade, 0)
    const lucroEstimado = totalVendaEstimado - totalInvestido

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <h1 className="text-2xl font-black text-gray-800 dark:text-gray-100 flex items-center gap-2">
                <FileText className="w-8 h-8 text-blue-500" />
                Importar Nota Fiscal (NFE)
            </h1>

            {!nfeData && (
                <div
                    {...getRootProps()}
                    className={`border-4 border-dashed rounded-3xl p-12 flex flex-col items-center justify-center text-center cursor-pointer transition-colors
                        ${isDragActive ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-700'}`}
                >
                    <input {...getInputProps()} />
                    <Upload className={`w-20 h-20 mb-4 ${isDragActive ? 'text-blue-500' : 'text-gray-400'}`} />
                    <p className="text-xl font-bold text-gray-600 dark:text-gray-300">
                        {isDragActive ? 'Solte o arquivo XML aqui...' : 'Arraste o arquivo XML aqui'}
                    </p>
                    <p className="text-gray-400 mt-2">ou clique para selecionar do computador</p>
                    <p className="text-xs text-gray-400 mt-4 bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full">
                        Formatos aceitos: .xml
                    </p>
                </div>
            )}

            {nfeData && (
                <div className="space-y-6 animate-fade-in">
                    {/* Header NFE */}
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col md:flex-row justify-between items-center gap-4">
                        <div>
                            <p className="text-sm text-gray-400 uppercase font-bold tracking-wider">Fornecedor</p>
                            <h2 className="text-xl font-black text-gray-800 dark:text-gray-100">{nfeData.fornecedor.nome}</h2>
                            <p className="text-sm text-gray-500">CNPJ: {nfeData.fornecedor.cnpj}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-sm text-gray-400 uppercase font-bold tracking-wider">NFE #{nfeData.numero}</p>
                            <p className="text-2xl font-black text-blue-600 dark:text-blue-400">{formatCurrency(nfeData.valorTotal)}</p>
                            <p className="text-sm text-gray-500 font-medium">Emissão: {new Date(nfeData.dataEmissao).toLocaleDateString()}</p>
                        </div>
                    </div>

                    {/* Products List */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                        <div className="p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 flex justify-between items-center">
                            <h3 className="font-bold text-gray-700 dark:text-gray-200 flex items-center gap-2">
                                <CheckCircle className="w-5 h-5 text-green-500" />
                                Produtos Encontrados ({products.length})
                            </h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50 dark:bg-gray-900 text-gray-500 dark:text-gray-400 text-xs uppercase font-bold">
                                    <tr>
                                        <th className="px-6 py-4">Produto</th>
                                        <th className="px-6 py-4 text-center">Qtd</th>
                                        <th className="px-6 py-4 text-right">Custo Un.</th>
                                        <th className="px-6 py-4 text-right">Preço Venda</th>
                                        <th className="px-6 py-4 text-center">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                    {products.map((product) => (
                                        <tr key={product.codigo} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                                            <td className="px-6 py-4">
                                                <p className="font-bold text-gray-800 dark:text-gray-200">{product.nome}</p>
                                                <p className="text-xs text-gray-500">EAN: {product.ean || 'SEM GTIN'} | Cod: {product.codigo}</p>

                                                {/* Packaging Alert */}
                                                {(product.unidadesPorEmbalagem || 1) > 1 && (
                                                    <div className="flex items-center gap-2 mt-1 text-xs font-bold text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 px-2 py-1 rounded">
                                                        <span>Embalagem: {product.unidadesPorEmbalagem} un. por {product.unidadeEmbalagem}</span>
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-center font-medium text-gray-600 dark:text-gray-300">
                                                {product.quantidade} UN
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <p className="font-medium text-gray-700 dark:text-gray-300">{formatCurrency(product.valorUnitario)}/un</p>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex flex-col items-end">
                                                    <span className="font-bold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-2 py-0.5 rounded text-sm">
                                                        {formatCurrency(product.price || 0)}
                                                    </span>
                                                    <span className="text-xs text-green-500 font-medium mt-1">
                                                        Margem: {product.margin?.toFixed(0)}%
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <button
                                                    onClick={() => handleEditProduct(product)}
                                                    className="px-3 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 text-xs font-bold rounded-lg transition-colors"
                                                >
                                                    Editar
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Summary Footer */}
                    <div className="bg-gradient-to-r from-gray-900 to-gray-800 dark:from-black dark:to-gray-900 text-white rounded-2xl p-6 shadow-xl flex flex-col md:flex-row justify-between items-center gap-6">
                        <div className="space-y-1 text-center md:text-left">
                            <p className="text-gray-400 text-sm font-medium">Resumo Financeiro</p>
                            <div className="flex gap-6">
                                <div>
                                    <p className="text-xs text-gray-500 uppercase">Investimento</p>
                                    <p className="text-lg font-bold">{formatCurrency(totalInvestido)}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-green-500 uppercase">Lucro Previsto</p>
                                    <p className="text-lg font-bold text-green-400">{formatCurrency(lucroEstimado)}</p>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-4 w-full md:w-auto">
                            <button
                                onClick={() => { setNfeData(null); setFile(null); }}
                                className="flex-1 md:flex-none px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-xl font-bold transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleConfirmImport}
                                disabled={isProcessing}
                                className="flex-1 md:flex-none px-8 py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl font-bold shadow-lg shadow-green-500/20 flex items-center justify-center gap-2 transition-all hover:scale-105 active:scale-95"
                            >
                                {isProcessing ? (
                                    'Processando...'
                                ) : (
                                    <>
                                        <CheckCircle className="w-5 h-5" />
                                        Confirmar Importação
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Modal */}
            <Modal isOpen={!!editingProduct} onClose={() => setEditingProduct(null)} title="Definir Preço de Venda">
                {editingProduct && (
                    <div className="space-y-6">
                        <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-xl flex justify-between items-center">
                            <div>
                                <p className="text-xs text-gray-500 uppercase font-bold">Produto</p>
                                <p className="font-bold text-gray-800 dark:text-gray-200 line-clamp-1">{editingProduct.nome}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-xs text-gray-500 uppercase font-bold">Custo</p>
                                <p className="font-bold text-gray-800 dark:text-gray-200">{formatCurrency(editingProduct.valorUnitario)}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-gray-500">Preço de Venda (R$)</label>
                                <div className="relative">
                                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={editPrice}
                                        onChange={handlePriceChange}
                                        className="w-full pl-10 pr-4 py-3 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl font-bold text-xl outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-bold text-gray-500">Margem (%)</label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        step="1"
                                        value={editMargin}
                                        onChange={handleMarginChange}
                                        className="w-full px-4 py-3 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl font-bold text-xl outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-center"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col gap-2">
                            <label className="text-xs font-bold text-gray-400 uppercase">Ajuste Fino (Slider)</label>
                            <input
                                type="range"
                                min="0"
                                max="200"
                                value={editMargin}
                                onChange={handleMarginChange}
                                className="w-full accent-blue-500 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                            />
                            <div className="flex justify-between text-xs text-gray-400 px-1">
                                <span>0%</span>
                                <span>100%</span>
                                <span>200%</span>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
                            <button onClick={() => setEditingProduct(null)} className="px-4 py-2 text-gray-500 font-bold hover:bg-gray-100 rounded-lg">Cancelar</button>
                            <button onClick={saveProductEdit} className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-lg shadow-lg shadow-blue-500/20 flex items-center gap-2">
                                <Save className="w-4 h-4" />
                                Salvar Alterações
                            </button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    )
}
