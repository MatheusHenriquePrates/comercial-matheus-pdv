
import { useState, useEffect, useCallback } from 'react'
import {
    Search, Plus, Edit, Package,
    ChevronLeft, ChevronRight, Save, DollarSign
} from 'lucide-react'
import { api } from '../../services/api'
import { formatCurrency } from '../../utils/formatters'
import toast from 'react-hot-toast'
import { Modal } from '../../components/common'

// Interfaces
interface Product {
    id: number
    code: string
    barcode: string | null
    name: string
    category: string | null
    brand: string | null
    stock: number
    minStock: number
    cost: number
    price: number
    profitMargin: number
    unit: string
    active: boolean
}

interface Pagination {
    page: number
    limit: number
    total: number
    pages: number
}

export default function ProductsPage() {
    // State
    const [products, setProducts] = useState<Product[]>([])
    const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, pages: 0 })
    const [loading, setLoading] = useState(false)

    // Filters
    const [search, setSearch] = useState('')
    const [filterBrand] = useState('')
    const [filterCategory] = useState('')
    const [filterLowStock, setFilterLowStock] = useState(false)
    const [filterNoStock, setFilterNoStock] = useState(false)

    // Modals
    const [showEditModal, setShowEditModal] = useState(false)
    const [showStockModal, setShowStockModal] = useState(false)
    const [showNewModal, setShowNewModal] = useState(false)
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)

    // Edit Form State
    const [editForm, setEditForm] = useState<Partial<Product>>({})

    // Stock Adjustment State
    const [stockAdjustment, setStockAdjustment] = useState({ quantity: 0, type: 'remove', reason: '', prodId: 0 })

    const fetchProducts = useCallback(async () => {
        setLoading(true)
        try {
            const params = new URLSearchParams()
            if (search) params.append('search', search)
            if (filterBrand) params.append('marca', filterBrand)
            if (filterCategory) params.append('categoria', filterCategory)
            if (filterLowStock) params.append('estoqueBaixo', 'true')
            if (filterNoStock) params.append('semEstoque', 'true')
            params.append('page', pagination.page.toString())
            params.append('limit', '20')

            const response = await api.get(`/products?${params.toString()}`)
            setProducts(response.data.products)
            setPagination(response.data.pagination)
        } catch (error) {
            console.error(error)
            toast.error('Erro ao carregar produtos')
        } finally {
            setLoading(false)
        }
    }, [search, filterBrand, filterCategory, filterLowStock, filterNoStock, pagination.page])

    useEffect(() => {
        const timeout = setTimeout(fetchProducts, 300)
        return () => clearTimeout(timeout)
    }, [fetchProducts])

    // Handlers
    const handleEditClick = (product: Product) => {
        setSelectedProduct(product)
        setEditForm({ ...product })
        setShowEditModal(true)
    }

    const handleStockClick = (product: Product) => {
        setSelectedProduct(product)
        setStockAdjustment({ quantity: 0, type: 'remove', reason: '', prodId: product.id })
        setShowStockModal(true)
    }

    const handleUpdateProduct = async () => {
        if (!selectedProduct) return
        try {
            await api.put(`/products/${selectedProduct.id}`, editForm)
            toast.success('Produto atualizado com sucesso!')
            setShowEditModal(false)
            fetchProducts()
        } catch (error) {
            toast.error('Erro ao atualizar produto')
        }
    }

    const handleAdjustStock = async () => {
        if (!selectedProduct) return
        if (!stockAdjustment.reason) return toast.error('Motivo é obrigatório')

        try {
            const qty = stockAdjustment.type === 'add' ? stockAdjustment.quantity : -stockAdjustment.quantity
            await api.post(`/products/${selectedProduct.id}/adjust-stock`, {
                quantity: qty,
                reason: stockAdjustment.reason
            })
            toast.success('Estoque ajustado!')
            setShowStockModal(false)
            fetchProducts()
        } catch (error) {
            toast.error('Erro ao ajustar estoque')
        }
    }

    const handleCreateProduct = async () => {
        try {
            await api.post('/products', editForm)
            toast.success('Produto cadastrado!')
            setShowNewModal(false)
            setEditForm({})
            fetchProducts()
        } catch (error) {
            toast.error('Erro ao cadastrar produto')
        }
    }

    // Calculations for Edit Modal
    const calculateMargin = (price: number, cost: number) => {
        if (!cost) return 100
        return ((price - cost) / cost) * 100
    }

    const calculatePrice = (margin: number, cost: number) => {
        return cost * (1 + margin / 100)
    }

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h1 className="text-2xl font-black text-gray-800 dark:text-gray-100 flex items-center gap-2">
                    <Package className="w-8 h-8 text-blue-500" />
                    Produtos
                </h1>
                <button
                    onClick={() => { setEditForm({}); setShowNewModal(true) }}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold flex items-center gap-2 shadow-lg shadow-blue-500/20"
                >
                    <Plus className="w-5 h-5" />
                    Novo Produto
                </button>
            </div>

            {/* Filters */}
            <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 space-y-4">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Buscar produto por nome, EAN ou código..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    {/* Filter buttons could go here */}
                </div>

                <div className="flex gap-2 flex-wrap">
                    <button
                        onClick={() => setFilterLowStock(!filterLowStock)}
                        className={`px-3 py-1 rounded-full text-xs font-bold border transition-colors ${filterLowStock ? 'bg-yellow-100 border-yellow-200 text-yellow-700' : 'bg-gray-50 border-gray-200 text-gray-600'}`}
                    >
                        Estoque Baixo
                    </button>
                    <button
                        onClick={() => setFilterNoStock(!filterNoStock)}
                        className={`px-3 py-1 rounded-full text-xs font-bold border transition-colors ${filterNoStock ? 'bg-red-100 border-red-200 text-red-700' : 'bg-gray-50 border-gray-200 text-gray-600'}`}
                    >
                        Sem Estoque
                    </button>
                </div>
            </div>

            {/* Product List */}
            <div className="space-y-4">
                {loading ? (
                    <div className="text-center py-10 text-gray-500">Carregando...</div>
                ) : (
                    products.map(product => (
                        <div key={product.id} className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col md:flex-row gap-4 items-center hover:border-blue-200 dark:hover:border-blue-800 transition-colors">
                            <div className="flex-1">
                                <h3 className="font-bold text-gray-800 dark:text-gray-100 text-lg">{product.name}</h3>
                                <div className="text-sm text-gray-500 flex flex-wrap gap-x-4 gap-y-1 mt-1">
                                    <span>EAN: {product.barcode || 'N/A'}</span>
                                    <span>Cód: {product.code || 'N/A'}</span>
                                    <span>Marca: {product.brand || 'N/A'}</span>
                                    <span>Cat: {product.category || 'N/A'}</span>
                                </div>
                                <div className="flex gap-4 mt-2 items-center">
                                    <div className="text-sm">
                                        <span className="text-gray-400">Custo: </span>
                                        <span className="font-medium">{formatCurrency(product.cost || 0)}</span>
                                    </div>
                                    <div className="text-sm">
                                        <span className="text-gray-400">Venda: </span>
                                        <span className="font-bold text-green-600 dark:text-green-400">{formatCurrency(product.price)}</span>
                                        <span className="text-xs text-green-500 ml-1">({product.profitMargin?.toFixed(0)}%)</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col items-end gap-2 min-w-[150px]">
                                <div className={`text-sm font-bold px-3 py-1 rounded-full flex items-center gap-2
                                    ${product.stock === 0 ? 'bg-red-100 text-red-700' :
                                        product.stock < product.minStock ? 'bg-yellow-100 text-yellow-700' :
                                            'bg-green-100 text-green-700'}
                                `}>
                                    <Package className="w-4 h-4" />
                                    {product.stock} {product.unit}
                                </div>
                                {(product.stock < product.minStock) && <span className="text-xs text-gray-400">Mínimo: {product.minStock}</span>}

                                <div className="flex gap-2 w-full mt-2">
                                    <button
                                        onClick={() => handleStockClick(product)}
                                        className="flex-1 py-1 px-2 border border-gray-200 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs font-bold"
                                    >
                                        Ajustar Est.
                                    </button>
                                    <button
                                        onClick={() => handleEditClick(product)}
                                        className="py-1 px-3 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded text-xs font-bold flex items-center gap-1"
                                    >
                                        <Edit className="w-3 h-3" /> Editar
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Pagination */}
            <div className="flex justify-between items-center text-sm text-gray-500">
                <span>Mostrando {(pagination.page - 1) * pagination.limit + 1}-{Math.min(pagination.page * pagination.limit, pagination.total)} de {pagination.total}</span>
                <div className="flex gap-2">
                    <button
                        disabled={pagination.page === 1}
                        onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}
                        className="p-2 border rounded hover:bg-gray-50 disabled:opacity-50"
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="px-4 py-2 bg-white dark:bg-gray-800 border rounded font-bold">{pagination.page}</span>
                    <button
                        disabled={pagination.page >= pagination.pages}
                        onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}
                        className="p-2 border rounded hover:bg-gray-50 disabled:opacity-50"
                    >
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* EDIT/NEW MODAL */}
            <Modal
                isOpen={showEditModal || showNewModal}
                onClose={() => { setShowEditModal(false); setShowNewModal(false) }}
                title={showNewModal ? "Novo Produto" : "Editar Produto"}
            >
                <div className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-500 uppercase">Nome do Produto</label>
                        <input
                            value={editForm.name || ''}
                            onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                            className="w-full p-2 border rounded-lg bg-gray-50 dark:bg-gray-700 outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-500 uppercase">Código</label>
                            <input
                                value={editForm.code || ''}
                                onChange={e => setEditForm({ ...editForm, code: e.target.value })}
                                className="w-full p-2 border rounded-lg bg-gray-50 dark:bg-gray-700 outline-none"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-500 uppercase">EAN (Barras)</label>
                            <input
                                value={editForm.barcode || ''}
                                onChange={e => setEditForm({ ...editForm, barcode: e.target.value })}
                                className="w-full p-2 border rounded-lg bg-gray-50 dark:bg-gray-700 outline-none"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-500 uppercase">Marca</label>
                            <input
                                value={editForm.brand || ''}
                                onChange={e => setEditForm({ ...editForm, brand: e.target.value })}
                                className="w-full p-2 border rounded-lg bg-gray-50 dark:bg-gray-700 outline-none"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-500 uppercase">Categoria</label>
                            <input
                                value={editForm.category || ''}
                                onChange={e => setEditForm({ ...editForm, category: e.target.value })}
                                className="w-full p-2 border rounded-lg bg-gray-50 dark:bg-gray-700 outline-none"
                            />
                        </div>
                    </div>

                    <div className="border-t pt-4 grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-500 uppercase">Custo (R$)</label>
                            <div className="relative">
                                <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="number"
                                    value={editForm.cost || 0}
                                    onChange={e => {
                                        const newCost = parseFloat(e.target.value)
                                        setEditForm({
                                            ...editForm,
                                            cost: newCost,
                                            price: calculatePrice(editForm.profitMargin || 0, newCost)
                                        })
                                    }}
                                    className="w-full pl-8 p-2 border rounded-lg bg-gray-50 dark:bg-gray-700 font-mono font-bold"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-500 uppercase">Preço Venda (R$)</label>
                            <div className="relative">
                                <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="number"
                                    value={editForm.price?.toFixed(2) || 0}
                                    onChange={e => {
                                        const newPrice = parseFloat(e.target.value)
                                        setEditForm({
                                            ...editForm,
                                            price: newPrice,
                                            profitMargin: calculateMargin(newPrice, editForm.cost || 0)
                                        })
                                    }}
                                    className="w-full pl-8 p-2 border-2 border-green-500 rounded-lg bg-white dark:bg-gray-800 font-mono font-bold text-green-600 text-lg"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <div className="flex justify-between">
                            <label className="text-xs font-bold text-gray-500 uppercase">Margem de Lucro</label>
                            <span className="text-xs font-bold text-blue-600">{editForm.profitMargin?.toFixed(0)}%</span>
                        </div>
                        <input
                            type="range"
                            min="0" max="200"
                            value={editForm.profitMargin || 0}
                            onChange={e => {
                                const newMargin = parseFloat(e.target.value)
                                setEditForm({
                                    ...editForm,
                                    profitMargin: newMargin,
                                    price: calculatePrice(newMargin, editForm.cost || 0)
                                })
                            }}
                            className="w-full accent-blue-600"
                        />
                    </div>

                    <div className="space-y-2 pt-2">
                        <label className="text-xs font-bold text-gray-500 uppercase">Estoque Mínimo</label>
                        <input
                            type="number"
                            value={editForm.minStock || 0}
                            onChange={e => setEditForm({ ...editForm, minStock: parseInt(e.target.value) })}
                            className="w-full p-2 border rounded-lg bg-gray-50"
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                        <button onClick={() => { setShowEditModal(false); setShowNewModal(false) }} className="px-4 py-2 text-gray-500 font-bold">Cancelar</button>
                        <button
                            onClick={showNewModal ? handleCreateProduct : handleUpdateProduct}
                            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold flex items-center gap-2"
                        >
                            <Save className="w-5 h-5" />
                            {showNewModal ? 'Cadastrar' : 'Salvar'}
                        </button>
                    </div>
                </div>
            </Modal>

            {/* STOCK MODAL */}
            <Modal isOpen={showStockModal} onClose={() => setShowStockModal(false)} title="Ajuste de Estoque">
                <div className="space-y-6">
                    <div className="bg-gray-50 p-4 rounded-lg">
                        <p className="font-bold text-gray-800">{selectedProduct?.name}</p>
                        <p className="text-sm text-gray-500">Estoque Atual: {selectedProduct?.stock} {selectedProduct?.unit}</p>
                    </div>

                    <div className="flex bg-gray-100 p-1 rounded-lg">
                        <button
                            onClick={() => setStockAdjustment({ ...stockAdjustment, type: 'add' })}
                            className={`flex-1 py-2 rounded-md text-sm font-bold transition-all ${stockAdjustment.type === 'add' ? 'bg-green-500 text-white shadow' : 'text-gray-500'}`}
                        >
                            Adicionar (+)
                        </button>
                        <button
                            onClick={() => setStockAdjustment({ ...stockAdjustment, type: 'remove' })}
                            className={`flex-1 py-2 rounded-md text-sm font-bold transition-all ${stockAdjustment.type === 'remove' ? 'bg-red-500 text-white shadow' : 'text-gray-500'}`}
                        >
                            Remover (-)
                        </button>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-500 uppercase">Quantidade a {stockAdjustment.type === 'add' ? 'Adicionar' : 'Remover'}</label>
                        <input
                            type="number"
                            min="1"
                            value={stockAdjustment.quantity || ''}
                            onChange={e => setStockAdjustment({ ...stockAdjustment, quantity: parseInt(e.target.value) })}
                            className="w-full text-3xl font-black text-center p-4 border rounded-xl outline-none focus:border-blue-500"
                            placeholder="0"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-500 uppercase">Motivo (Obrigatório)</label>
                        <textarea
                            value={stockAdjustment.reason}
                            onChange={e => setStockAdjustment({ ...stockAdjustment, reason: e.target.value })}
                            className="w-full p-3 border rounded-xl bg-gray-50 resize-none h-24 outline-none focus:border-blue-500"
                            placeholder="Ex: Validade vencida, Perda, Doação..."
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                        <button onClick={() => setShowStockModal(false)} className="px-4 py-2 text-gray-500 font-bold">Cancelar</button>
                        <button
                            onClick={handleAdjustStock}
                            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold flex items-center gap-2"
                        >
                            Confirmar Ajuste
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    )
}
