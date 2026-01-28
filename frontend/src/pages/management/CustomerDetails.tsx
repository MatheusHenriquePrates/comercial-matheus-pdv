import { useState } from 'react'
import {
    MapPin, Phone, Calendar, CreditCard,
    FileText, AlertTriangle, CheckCircle,
    Wallet, Banknote
} from 'lucide-react'
import { formatCurrency, formatDate } from '../../utils/formatters'
import { debtsAPI } from '../../services/api'
import { Modal } from '../../components/common'
import toast from 'react-hot-toast'

interface CustomerDetailsProps {
    customer: any
    onEdit: () => void
    onClose: () => void
    onUpdate?: () => void
}

export default function CustomerDetails({ customer, onEdit, onClose, onUpdate }: CustomerDetailsProps) {
    const [showPayModal, setShowPayModal] = useState(false)
    const [showPayAllModal, setShowPayAllModal] = useState(false)
    const [showPartialModal, setShowPartialModal] = useState(false)
    const [selectedDebt, setSelectedDebt] = useState<any>(null)
    const [partialAmount, setPartialAmount] = useState('')
    const [isProcessing, setIsProcessing] = useState(false)

    if (!customer) return null

    // Calculate totals
    const debts = customer.debts || []
    const pendingDebts = debts.filter((d: any) => d.remaining > 0)

    // Total Original (Principal)
    const totalPrincipal = pendingDebts.reduce((acc: number, d: any) => acc + d.amount, 0)

    // Total Interest
    const totalInterest = pendingDebts.reduce((acc: number, d: any) => acc + (d.interest || 0), 0)

    // Total to Pay
    const totalToPay = totalPrincipal + totalInterest

    const hasOverdue = pendingDebts.some((d: any) => d.daysOverdue > 0)
    const overdueCount = pendingDebts.filter((d: any) => d.daysOverdue > 0).length

    const handlePayDebt = async () => {
        if (!selectedDebt) return
        setIsProcessing(true)
        try {
            await debtsAPI.pay(selectedDebt.id)
            toast.success('Dívida quitada com sucesso!')
            setShowPayModal(false)
            if (onUpdate) onUpdate()
        } catch (error) {
            console.error(error)
            toast.error('Erro ao quitar dívida')
        } finally {
            setIsProcessing(false)
        }
    }

    const handlePayAll = async () => {
        setIsProcessing(true)
        try {
            await debtsAPI.payAll(customer.id)
            toast.success('Todas as dívidas foram quitadas!')
            setShowPayAllModal(false)
            if (onUpdate) onUpdate()
        } catch (error) {
            console.error(error)
            toast.error('Erro ao quitar dívidas')
        } finally {
            setIsProcessing(false)
        }
    }

    const handlePartialPayment = async () => {
        if (!selectedDebt || !partialAmount) return
        const amount = parseFloat(partialAmount.replace(',', '.'))
        if (isNaN(amount) || amount <= 0) {
            toast.error('Valor inválido')
            return
        }

        setIsProcessing(true)
        try {
            await debtsAPI.registerPartialPayment(selectedDebt.id, amount)
            toast.success(`Haver de ${formatCurrency(amount)} registrado!`)
            setShowPartialModal(false)
            setPartialAmount('')
            if (onUpdate) onUpdate()
        } catch (error) {
            console.error(error)
            toast.error('Erro ao registrar haver')
        } finally {
            setIsProcessing(false)
        }
    }

    const openPayModal = (debt: any) => {
        setSelectedDebt(debt)
        setShowPayModal(true)
    }

    const openPartialModal = (debt: any) => {
        setSelectedDebt(debt)
        setPartialAmount('')
        setShowPartialModal(true)
    }

    return (
        <div className="space-y-6">
            {/* Banner Alerta */}
            {hasOverdue && (
                <div className="bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl p-4 flex items-center gap-3 text-red-800 dark:text-red-300 animate-pulse">
                    <AlertTriangle className="w-6 h-6" />
                    <span className="font-bold">⚠️ Este cliente possui {overdueCount} dívida(s) vencida(s)</span>
                </div>
            )}

            {/* Header / Profile */}
            <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
                <div className="w-24 h-24 rounded-full border-4 border-white dark:border-gray-700 shadow-lg overflow-hidden bg-gray-100 dark:bg-gray-800 flex-shrink-0">
                    {customer.photoUrl ? (
                        <img src={customer.photoUrl} alt={customer.name} className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-green-400 to-green-600 text-white text-3xl font-bold">
                            {customer.name.charAt(0)}
                        </div>
                    )}
                </div>

                <div className="flex-1 text-center md:text-left space-y-1">
                    <h2 className="text-2xl font-black text-gray-800 dark:text-gray-100">{customer.name}</h2>
                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-sm text-gray-600 dark:text-gray-400">
                        {customer.phone && <div className="flex items-center gap-1.5"><Phone className="w-4 h-4" /> <span>{customer.phone}</span></div>}
                        {customer.address && <div className="flex items-center gap-1.5"><MapPin className="w-4 h-4" /> <span>{customer.address}</span></div>}
                        {customer.cpf && <div className="flex items-center gap-1.5"><FileText className="w-4 h-4" /> <span>{customer.cpf}</span></div>}
                        {customer.birthDate && <div className="flex items-center gap-1.5"><Calendar className="w-4 h-4" /> <span>{new Date(customer.birthDate).toLocaleDateString('pt-BR')}</span></div>}
                    </div>
                </div>

                <button onClick={onEdit} className="px-4 py-2 bg-yellow-400 hover:bg-yellow-500 text-green-900 font-bold rounded-lg shadow-sm text-sm">
                    Editar Cadastro
                </button>
            </div>

            {/* Resumo Financeiro */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
                <div className="bg-gray-50 dark:bg-gray-900/50 px-6 py-4 border-b border-gray-100 dark:border-gray-700">
                    <h3 className="font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                        <Wallet className="w-5 h-5 text-gray-500" /> Resumo da Dívida
                    </h3>
                </div>
                <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="text-center md:text-left">
                        <p className="text-xs font-bold text-gray-400 uppercase">Valor Original</p>
                        <p className="text-xl font-bold text-gray-700 dark:text-gray-300">{formatCurrency(totalPrincipal)}</p>
                    </div>
                    <div className="text-center md:text-left">
                        <p className="text-xs font-bold text-red-400 uppercase">Juros Acumulados</p>
                        <p className="text-xl font-bold text-red-500">{formatCurrency(totalInterest)}</p>
                    </div>
                    <div className="text-center md:text-left bg-red-50 dark:bg-red-900/20 p-3 rounded-xl border border-red-100 dark:border-red-900/40 relative group">
                        <p className="text-xs font-bold text-red-600 dark:text-red-400 uppercase">TOTAL A PAGAR</p>
                        <p className="text-3xl font-black text-red-600 dark:text-red-400">{formatCurrency(totalToPay)}</p>
                        {totalToPay > 0 && (
                            <button
                                onClick={() => setShowPayAllModal(true)}
                                className="mt-2 w-full py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-lg shadow-sm flex items-center justify-center gap-2 transition-colors"
                            >
                                <Banknote className="w-4 h-4" /> QUITAR TUDO
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Lista de Dívidas */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
                <div className="bg-gray-50 dark:bg-gray-900/50 px-6 py-4 border-b border-gray-100 dark:border-gray-700">
                    <h3 className="font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                        <CreditCard className="w-5 h-5 text-gray-500" /> Detalhamento das Dívidas
                    </h3>
                </div>
                <div className="divide-y divide-gray-100 dark:divide-gray-700 max-h-[400px] overflow-y-auto">
                    {debts.length === 0 ? (
                        <div className="p-8 text-center text-gray-400">Nenhum histórico encontrado.</div>
                    ) : (
                        debts.map((debt: any) => {
                            const isPaid = debt.remaining <= 0
                            const isOverdue = debt.daysOverdue > 0 && !isPaid

                            return (
                                <div key={debt.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex flex-col md:flex-row items-center justify-between gap-4">
                                    <div className="flex-1 space-y-1">
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-gray-800 dark:text-gray-200">Venda #{debt.saleId || 'N/A'}</span>
                                            <span className="text-gray-300">•</span>
                                            <span className="text-sm text-gray-500">{formatDate(new Date(debt.createdAt))}</span>
                                            {isPaid ? (
                                                <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-bold rounded-full">PAGA</span>
                                            ) : isOverdue ? (
                                                <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-bold rounded-full flex items-center gap-1">
                                                    <AlertTriangle className="w-3 h-3" /> VENCIDA há {debt.daysOverdue} dias
                                                </span>
                                            ) : (
                                                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-bold rounded-full">EM DIA</span>
                                            )}
                                        </div>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">
                                            Parcela {debt.installmentNo}/{debt.installments} • Vencimento: <strong>{formatDate(new Date(debt.dueDate || debt.createdAt))}</strong>
                                        </p>
                                    </div>

                                    <div className="text-right space-y-1">
                                        <div className="text-sm">
                                            <span className="text-gray-400 mr-2">Original:</span>
                                            <span className="font-medium text-gray-700 dark:text-gray-300">{formatCurrency(debt.amount)}</span>
                                        </div>
                                        {isOverdue && (
                                            <div className="text-sm text-red-500">
                                                <span className="mr-2 text-xs">+ Juros (40%):</span>
                                                <span className="font-bold">{formatCurrency(debt.interest)}</span>
                                            </div>
                                        )}
                                        <div className="text-lg font-black text-gray-800 dark:text-gray-100">
                                            Total: {formatCurrency(isPaid ? 0 : debt.total || debt.remaining)}
                                        </div>
                                    </div>

                                    {!isPaid && (
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => openPartialModal(debt)}
                                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg text-xs font-bold border border-blue-200"
                                                title="Registrar Haver"
                                            >
                                                <Banknote className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => openPayModal(debt)}
                                                className="p-2 text-green-600 hover:bg-green-50 rounded-lg text-xs font-bold border border-green-200"
                                                title="Quitar"
                                            >
                                                <CheckCircle className="w-4 h-4" />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )
                        })
                    )}
                </div>
            </div>

            <div className="flex justify-end">
                <button
                    onClick={onClose}
                    className="px-6 py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-bold rounded-xl transition-colors"
                >
                    Fechar
                </button>
            </div>

            {/* Pay Modal */}
            <Modal isOpen={showPayModal} onClose={() => setShowPayModal(false)} title="Confirmar Quitação">
                <div className="space-y-4">
                    <p className="text-gray-600 dark:text-gray-300">
                        Deseja realmente quitar esta parcela?
                    </p>
                    {selectedDebt && (
                        <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-xl border2 font-medium space-y-2">
                            <div className="flex justify-between"><span>Valor Original:</span> <span>{formatCurrency(selectedDebt.amount)}</span></div>
                            <div className="flex justify-between text-red-500"><span>Juros:</span> <span>{formatCurrency(selectedDebt.interest)}</span></div>
                            <div className="flex justify-between font-bold text-lg border-t pt-2 mt-2"><span>Total:</span> <span>{formatCurrency(selectedDebt.total)}</span></div>
                        </div>
                    )}
                    <div className="flex justify-end gap-3 mt-4">
                        <button onClick={() => setShowPayModal(false)} className="px-4 py-2 bg-gray-200 rounded-lg font-bold text-gray-700">Cancelar</button>
                        <button onClick={handlePayDebt} disabled={isProcessing} className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-bold flex items-center gap-2">
                            {isProcessing ? 'Processando...' : 'Confirmar Pagamento'}
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Pay All Modal */}
            <Modal isOpen={showPayAllModal} onClose={() => setShowPayAllModal(false)} title="Quitar Dívida Total">
                <div className="space-y-4">
                    <p className="text-gray-600 dark:text-gray-300">
                        Deseja realmente quitar <strong>TODAS</strong> as dívidas pendentes deste cliente?
                    </p>
                    <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-xl border border-red-100 dark:border-red-900/40 text-center space-y-2">
                        <p className="text-sm font-bold text-red-600 dark:text-red-400 uppercase">Valor Total a Pagar</p>
                        <p className="text-3xl font-black text-red-600 dark:text-red-400">{formatCurrency(totalToPay)}</p>
                    </div>
                    <div className="text-sm text-gray-500 text-center">
                        Isso incluirá {debts.filter((d: any) => d.remaining > 0).length} parcela(s) pendente(s).
                    </div>
                    <div className="flex justify-end gap-3 mt-4">
                        <button onClick={() => setShowPayAllModal(false)} className="px-4 py-2 bg-gray-200 rounded-lg font-bold text-gray-700">Cancelar</button>
                        <button onClick={handlePayAll} disabled={isProcessing} className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold flex items-center gap-2">
                            <CheckCircle className="w-5 h-5" />
                            {isProcessing ? 'Processando...' : 'QUITAR TUDO'}
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Payment Modal (Haver) */}
            <Modal isOpen={showPartialModal} onClose={() => setShowPartialModal(false)} title="Registrar Haver">
                <div className="space-y-4">
                    {selectedDebt && (
                        <div className="text-sm text-gray-500 mb-2">
                            Saldo devedor atual: <span className="font-bold text-gray-800">{formatCurrency(selectedDebt.amount)}</span> (sem juros)
                        </div>
                    )}
                    <div className="space-y-2">
                        <label className="text-sm text-gray-400">Valor Recebido</label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-lg font-semibold">
                                R$
                            </span>
                            <input
                                type="text"
                                value={partialAmount}
                                onChange={(e) => {
                                    const numbers = e.target.value.replace(/\D/g, '')
                                    const valueInCents = parseInt(numbers || '0')
                                    const formatted = (valueInCents / 100).toFixed(2).replace('.', ',')
                                    setPartialAmount(formatted)
                                }}
                                placeholder="0,00"
                                className="w-full bg-gray-700 border border-gray-600 rounded-lg pl-12 pr-4 py-3 text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50 outline-none transition-all text-2xl font-bold text-right"
                            />
                        </div>
                        <p className="text-xs text-gray-500">Digite apenas números. Ex: 5000 = R$ 50,00</p>
                    </div>
                    <div className="flex justify-end gap-3 mt-4">
                        <button onClick={() => setShowPartialModal(false)} className="px-4 py-2 bg-gray-200 rounded-lg font-bold text-gray-700">Cancelar</button>
                        <button onClick={handlePartialPayment} disabled={isProcessing} className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-bold flex items-center gap-2">
                            {isProcessing ? 'Processando...' : 'Registrar Haver'}
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    )
}
