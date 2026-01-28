
import { useState, useEffect } from 'react'
import { Database, AlertTriangle, Package, TrendingUp } from 'lucide-react'
import { api } from '../../services/api'
import { formatCurrency } from '../../utils/formatters'
import toast from 'react-hot-toast'

export default function StockPage() {
    const [summary, setSummary] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        api.get('/products/stock-summary')
            .then(res => setSummary(res.data))
            .catch(err => {
                console.error(err)
                toast.error('Erro ao carregar resumo de estoque')
            })
            .finally(() => setLoading(false))
    }, [])

    if (loading) return <div className="p-8 text-center">Carregando indicadores...</div>

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-8">
            <h1 className="text-2xl font-black text-gray-800 dark:text-gray-100 flex items-center gap-2">
                <Database className="w-8 h-8 text-blue-500" />
                Banco de Estoque
            </h1>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                    <div className="flex justify-between items-start">
                        <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl text-blue-600 dark:text-blue-400">
                            <Package className="w-6 h-6" />
                        </div>
                        <span className="text-xs font-bold text-gray-400 uppercase">Total Produtos</span>
                    </div>
                    <div className="mt-4">
                        <h3 className="text-3xl font-black text-gray-800 dark:text-gray-100">{summary?.totalProdutos}</h3>
                        <p className="text-sm text-gray-500">Cadastrados e ativos</p>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                    <div className="flex justify-between items-start">
                        <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-xl text-red-600 dark:text-red-400">
                            <AlertTriangle className="w-6 h-6" />
                        </div>
                        <span className="text-xs font-bold text-gray-400 uppercase">Sem Estoque</span>
                    </div>
                    <div className="mt-4">
                        <h3 className="text-3xl font-black text-gray-800 dark:text-gray-100">{summary?.semEstoque}</h3>
                        <p className="text-sm text-red-500 font-bold">Produtos zerados</p>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                    <div className="flex justify-between items-start">
                        <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-xl text-yellow-600 dark:text-yellow-400">
                            <TrendingUp className="w-6 h-6" />
                        </div>
                        <span className="text-xs font-bold text-gray-400 uppercase">Estoque Baixo</span>
                    </div>
                    <div className="mt-4">
                        <h3 className="text-3xl font-black text-gray-800 dark:text-gray-100">{summary?.estoqueBaixo}</h3>
                        <p className="text-sm text-yellow-600 font-bold">Abaixo do mínimo</p>
                    </div>
                </div>

                <div className="bg-gradient-to-br from-green-500 to-green-600 text-white p-6 rounded-2xl shadow-lg shadow-green-500/20">
                    <div className="flex justify-between items-start">
                        <div className="p-3 bg-white/20 rounded-xl text-white">
                            <DollarSign className="w-6 h-6" />
                        </div>
                        <span className="text-xs font-bold text-green-100 uppercase">Valor em Estoque</span>
                    </div>
                    <div className="mt-4">
                        <h3 className="text-3xl font-black">{formatCurrency(summary?.valorTotalCusto)}</h3>
                        <p className="text-sm text-green-100 opacity-80">Preço de Custo</p>
                    </div>
                </div>
            </div>

            {/* Quick Actions / Tips */}
            <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-2xl border border-blue-100 dark:border-blue-900/50">
                <h3 className="font-bold text-blue-800 dark:text-blue-300 mb-2">Dica de Gestão</h3>
                <p className="text-sm text-blue-600 dark:text-blue-400">
                    Mantenha seu estoque sempre auditado. Produtos com estoque negativo ou zerado podem impedir vendas no PDV.
                    Utilize a auditoria mensal para corrigir divergências.
                </p>
            </div>
        </div>
    )
}

function DollarSign({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <line x1="12" x2="12" y1="2" y2="22" />
            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
    )
}
