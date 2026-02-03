import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
    Search, ShoppingCart, Plus, Minus, Trash2, Package,
    DollarSign, Menu, LogOut, Wallet, RefreshCw, Star, ChevronDown, ChevronUp, MapPin,
    Banknote, CreditCard, Smartphone, FileText, ClipboardList, Users, AlertTriangle, Check,
    Receipt, Download, X
} from 'lucide-react'
import toast from 'react-hot-toast'
import { Modal } from '../components/common'
import { useAuthStore } from '../store/useAuthStore'
import { useCartStore } from '../store/useCartStore'
import { useCashierStore } from '../store/useCashierStore'
import { useSyncStore } from '../store/useSyncStore'
import { productsAPI, cashierAPI, salesAPI, customersAPI } from '../services/api'
import { syncService } from '../services/sync.service'
import { printerService } from '../services/printer.service'
import fiscalService from '../services/fiscal.service'
import { dbHelpers } from '../db/database'
import { formatCurrency, formatTime } from '../utils/formatters'
import { isValidCPF } from '../utils/validators'
import { PAYMENT_METHOD_LABELS, WITHDRAWAL_REASONS, SUPPLY_ORIGINS } from '../utils/constants'
import type { Product, PaymentMethod } from '../types'

function generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8)
        return v.toString(16)
    })
}

// Mock customers with debts
interface Debt {
    id: number
    total?: number // mapped from backend 'amount'? No, backend returns 'amount' and 'remaining'.
    amount: number
    remaining: number
    installments: number
    paidInstallments: number
    createdAt: string
}

interface Customer {
    id: number
    name: string
    phone: string | null
    debts: Debt[]
}

const PAYMENT_ICONS: Record<PaymentMethod, React.ReactNode> = {
    cash: <Banknote className="w-6 h-6" />,
    debit: <CreditCard className="w-6 h-6" />,
    credit: <CreditCard className="w-6 h-6" />,
    pix: <Smartphone className="w-6 h-6" />,
    installment: <FileText className="w-6 h-6" />,
}

export default function PDV() {
    const navigate = useNavigate()
    const { user, logout } = useAuthStore()
    const { items, subtotal, total, addItem, updateQuantity, removeItem, clearCart } = useCartStore()
    const { currentCashier, status: cashierStatus, setCashier, openCashier, closeCashier } = useCashierStore()
    const { status: syncStatus, pendingCount, isOnline } = useSyncStore()

    const [currentTime, setCurrentTime] = useState(new Date())
    const [searchQuery, setSearchQuery] = useState('')
    const [searchResults, setSearchResults] = useState<Product[]>([])
    const [favoriteProducts, setFavoriteProducts] = useState<Product[]>([])
    const [showFavorites, setShowFavorites] = useState(false)

    const [showPaymentModal, setShowPaymentModal] = useState(false)
    const [showDiverseModal, setShowDiverseModal] = useState(false)
    const [showOpenCashierModal, setShowOpenCashierModal] = useState(false)
    const [showCloseCashierModal, setShowCloseCashierModal] = useState(false)
    const [showWithdrawalModal, setShowWithdrawalModal] = useState(false)
    const [showSupplyModal, setShowSupplyModal] = useState(false)
    const [showMenu, setShowMenu] = useState(false)
    const [showSalesReportModal, setShowSalesReportModal] = useState(false)
    const [showCustomerSelectModal, setShowCustomerSelectModal] = useState(false)
    const [showNFCeModal, setShowNFCeModal] = useState(false)

    const [selectedPayment, setSelectedPayment] = useState<PaymentMethod>('cash')
    const [amountReceived, setAmountReceived] = useState('')
    const [wantsCPF, setWantsCPF] = useState(false)
    const [cpf, setCpf] = useState('')
    const [isDelivery, setIsDelivery] = useState(false)
    const [deliveryStreet, setDeliveryStreet] = useState('')
    const [deliveryNumber, setDeliveryNumber] = useState('')
    const [deliveryNeighborhood, setDeliveryNeighborhood] = useState('')
    const [deliveryReference, setDeliveryReference] = useState('')
    const [isProcessing, setIsProcessing] = useState(false)

    // NFC-e emission states
    const [lastCompletedSaleId, setLastCompletedSaleId] = useState<number | null>(null)
    const [emittingNFCe, setEmittingNFCe] = useState(false)
    const [nfceEmissionResult, setNfceEmissionResult] = useState<{
        success: boolean
        message: string
        nfce?: any
    } | null>(null)

    // Installment customer state
    // Installment customer state
    const [customers, setCustomers] = useState<Customer[]>([])
    const [customerSearchQuery, setCustomerSearchQuery] = useState('')
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
    const [installmentCount, setInstallmentCount] = useState('2')

    const [diverseDescription, setDiverseDescription] = useState('')
    const [diversePrice, setDiversePrice] = useState('')
    const [diverseQuantity, setDiverseQuantity] = useState('1')

    const [openingBalance, setOpeningBalance] = useState('')
    const [closingBalance, setClosingBalance] = useState('')
    const [withdrawalAmount, setWithdrawalAmount] = useState('')
    const [withdrawalReason, setWithdrawalReason] = useState<keyof typeof WITHDRAWAL_REASONS>('expense')
    const [withdrawalObs, setWithdrawalObs] = useState('')
    const [supplyAmount, setSupplyAmount] = useState('')
    const [supplyOrigin, setSupplyOrigin] = useState<keyof typeof SUPPLY_ORIGINS>('deposit')
    const [supplyObs, setSupplyObs] = useState('')

    useEffect(() => {
        const interval = setInterval(() => setCurrentTime(new Date()), 1000)
        return () => clearInterval(interval)
    }, [])

    const [salesReportData, setSalesReportData] = useState({
        salesCount: 0,
        totalRevenue: 0,
        totalWithdrawals: 0,
        totalSupplies: 0,
        netTotal: 0,
        sales: [] as any[]
    })
    const [isLoadingReport, setIsLoadingReport] = useState(false)

    const fetchSalesReport = async () => {
        setIsLoadingReport(true)
        try {
            const data = await salesAPI.getDailyReport()
            setSalesReportData(data)
        } catch (error) {
            console.error('Error fetching report:', error)
            toast.error('Erro ao carregar relatório')
        } finally {
            setIsLoadingReport(false)
        }
    }

    useEffect(() => {
        if (showSalesReportModal) {
            fetchSalesReport()
            const interval = setInterval(fetchSalesReport, 30000)
            return () => clearInterval(interval)
        }
    }, [showSalesReportModal])

    // Load initial products for favorites
    useEffect(() => {
        const loadFavorites = async () => {
            try {
                const data = await productsAPI.getAll()
                if (data && data.length > 0) {
                    setFavoriteProducts(data.slice(0, 6))
                } else {
                    console.log('No products found for favorites');
                }
            } catch (error) {
                console.error('Error loading favorites:', error)
                toast.error('Erro ao carregar produtos favoritos')
            }
        }
        loadFavorites()
    }, [])

    useEffect(() => {
        if (showCustomerSelectModal) {
            const fetchCustomers = async () => {
                try {
                    const data = await customersAPI.getAll()
                    setCustomers(data)
                } catch (error) {
                    console.error('Error fetching customers:', error)
                    toast.error('Erro ao carregar clientes')
                }
            }
            fetchCustomers()
        }
    }, [showCustomerSelectModal])

    useEffect(() => { loadFavoriteProducts(); checkCashierStatus() }, [])

    const loadFavoriteProducts = async () => {
        try {
            const products = await productsAPI.getAll()
            setFavoriteProducts(products.slice(0, 8))
        } catch (error) {
            const localProducts = await dbHelpers.getAllProducts()
            setFavoriteProducts(localProducts.slice(0, 8))
        }
    }

    const checkCashierStatus = async () => {
        try {
            const cashier = await cashierAPI.getCurrent()
            if (cashier) setCashier({ ...cashier, operatorName: user?.name || 'Operador' })
        } catch (error) { console.error('Error checking cashier:', error) }
    }

    const searchProducts = useCallback(async (query: string) => {
        if (query.length < 2) { setSearchResults([]); return }
        try {
            const results = await productsAPI.search(query)
            setSearchResults(results.slice(0, 5))
        } catch (error) {
            const localResults = await dbHelpers.searchProducts(query)
            setSearchResults(localResults.slice(0, 5))
        }
    }, [])

    useEffect(() => {
        const timer = setTimeout(() => searchProducts(searchQuery), 300)
        return () => clearTimeout(timer)
    }, [searchQuery, searchProducts])

    const handleSelectProduct = (product: Product) => {
        addItem(product)
        setSearchQuery('')
        setSearchResults([])
        toast.success(`${product.name} adicionado`)
    }

    const handleAddDiverseProduct = () => {
        if (!diverseDescription || !diversePrice) { toast.error('Preencha todos os campos'); return }
        const price = parseFloat(diversePrice.replace(',', '.'))
        const qty = parseInt(diverseQuantity) || 1
        if (price <= 0) { toast.error('Valor inválido'); return }
        addItem({ description: diverseDescription, price }, qty)
        toast.success('Produto adicionado')
        setShowDiverseModal(false)
        setDiverseDescription(''); setDiversePrice(''); setDiverseQuantity('1')
    }

    const calculateChange = (): number => {
        const received = parseFloat(amountReceived.replace(',', '.')) || 0
        return Math.max(0, received - total)
    }

    const handleFinalizeSale = async () => {
        if (items.length === 0) { toast.error('Carrinho vazio'); return }
        if (cashierStatus !== 'open') { toast.error('Abra o caixa antes de realizar vendas'); return }
        setShowPaymentModal(true)
    }

    const handlePaymentMethodChange = (method: PaymentMethod) => {
        setSelectedPayment(method)
        // Don't auto-open customer modal - let user click the button
    }

    const handleSelectCustomer = (customer: Customer) => {
        setSelectedCustomer(customer)
        setShowCustomerSelectModal(false)
    }

    const handleConfirmSale = async () => {
        if (selectedPayment === 'cash') {
            const received = parseFloat(amountReceived.replace(',', '.')) || 0
            if (received < total) { toast.error('Valor recebido insuficiente'); return }
        }
        if (selectedPayment === 'installment' && !selectedCustomer) {
            toast.error('Selecione um cliente para venda a prazo')
            setShowCustomerSelectModal(true)
            return
        }
        if (wantsCPF && cpf && !isValidCPF(cpf)) { toast.error('CPF inválido'); return }
        if (isDelivery && !deliveryStreet) { toast.error('Informe a rua para entrega'); return }

        setIsProcessing(true)
        try {
            const deliveryAddress = isDelivery ? {
                street: deliveryStreet, number: deliveryNumber, neighborhood: deliveryNeighborhood, reference: deliveryReference,
                fullAddress: `${deliveryStreet}, ${deliveryNumber}${deliveryNeighborhood ? ` - ${deliveryNeighborhood}` : ''}${deliveryReference ? ` (Ref: ${deliveryReference})` : ''}`
            } : undefined

            const sale = {
                localId: generateUUID(),
                items: items.map(item => ({ productId: item.productId, description: item.description, quantity: item.quantity, unitPrice: item.unitPrice, subtotal: item.subtotal })),
                subtotal, discount: 0, total,
                paymentMethod: selectedPayment,
                paymentDetails: selectedPayment === 'cash' ? { amountReceived: parseFloat(amountReceived.replace(',', '.')) || total, change: calculateChange() } :
                    selectedPayment === 'installment' ? {
                        customerId: selectedCustomer?.id,
                        installments: parseInt(installmentCount)
                    } : undefined,
                cpf: wantsCPF ? cpf : undefined,
                delivery: deliveryAddress,
                cashierId: currentCashier?.id || 1,
                operatorId: user?.id || 1,
                status: 'pending' as const,
                syncAttempts: 0,
                createdAt: new Date(),
            }
            const result = await syncService.saveSaleAndSync(sale)
            if (currentCashier) printerService.printReceipt(sale as any, currentCashier)
            clearCart()
            setShowPaymentModal(false)
            resetPaymentForm()
            toast.success('Venda realizada com sucesso!')

            // Store sale ID and show NFC-e modal only if backend ID is available
            if (result && result.backendId) {
                setLastCompletedSaleId(result.backendId)
                setShowNFCeModal(true)
            } else if (result && !result.backendId) {
                // Sale saved locally but not synced yet
                toast('Venda salva localmente. NFC-e será emitida após sincronização.', { icon: '⚠️' })
            }
        } catch (error) {
            console.error('Error creating sale:', error)
            toast.error('Erro ao finalizar venda')
        } finally {
            setIsProcessing(false)
        }
    }

    const resetPaymentForm = () => {
        setSelectedPayment('cash'); setAmountReceived(''); setWantsCPF(false); setCpf('')
        setIsDelivery(false); setDeliveryStreet(''); setDeliveryNumber(''); setDeliveryNeighborhood(''); setDeliveryReference('')
        setSelectedCustomer(null); setInstallmentCount('2')
    }

    const handleOpenCashier = async () => {
        const balance = parseFloat(openingBalance.replace(',', '.')) || 0
        try {
            const cashier = await cashierAPI.open({ openingBalance: balance })
            openCashier({ ...cashier, operatorName: user?.name || 'Operador' })
            toast.success('Caixa aberto com sucesso!')
        } catch (error) {
            openCashier({ id: 1, number: 1, status: 'open', openingBalance: balance, operatorId: user?.id || 1, operatorName: user?.name || 'Operador' })
            toast.success('Caixa aberto localmente')
        }
        setShowOpenCashierModal(false); setOpeningBalance('')
    }

    const handleCloseCashier = async () => {
        const balance = parseFloat(closingBalance.replace(',', '.')) || 0
        try { await cashierAPI.close({ actualBalance: balance }) } catch (error) { /* ignore */ }
        closeCashier()
        toast.success('Caixa fechado com sucesso!')
        setShowCloseCashierModal(false); setClosingBalance('')
    }

    const handleWithdrawal = async () => {
        const amount = parseFloat(withdrawalAmount.replace(',', '.')) || 0
        if (amount <= 0) { toast.error('Valor inválido'); return }
        try {
            await cashierAPI.createTransaction({ type: 'withdrawal', amount, description: WITHDRAWAL_REASONS[withdrawalReason], observations: withdrawalObs })
            toast.success('Sangria registrada!')
            if (currentCashier) printerService.printTransactionReceipt('withdrawal', amount, WITHDRAWAL_REASONS[withdrawalReason], currentCashier)
        } catch (error) {
            await syncService.saveTransactionAndSync({ localId: generateUUID(), cashierId: currentCashier?.id || 1, type: 'withdrawal', amount, description: WITHDRAWAL_REASONS[withdrawalReason], observations: withdrawalObs, status: 'pending', createdAt: new Date() })
            toast.success('Sangria registrada localmente!')
        }
        setShowWithdrawalModal(false); setWithdrawalAmount(''); setWithdrawalReason('expense'); setWithdrawalObs('')
    }

    const handleSupply = async () => {
        const amount = parseFloat(supplyAmount.replace(',', '.')) || 0
        if (amount <= 0) { toast.error('Valor inválido'); return }
        try {
            await cashierAPI.createTransaction({ type: 'supply', amount, description: SUPPLY_ORIGINS[supplyOrigin], observations: supplyObs })
            toast.success('Suprimento registrado!')
            if (currentCashier) printerService.printTransactionReceipt('supply', amount, SUPPLY_ORIGINS[supplyOrigin], currentCashier)
        } catch (error) {
            await syncService.saveTransactionAndSync({ localId: generateUUID(), cashierId: currentCashier?.id || 1, type: 'supply', amount, description: SUPPLY_ORIGINS[supplyOrigin], observations: supplyObs, status: 'pending', createdAt: new Date() })
            toast.success('Suprimento registrado localmente!')
        }
        setShowSupplyModal(false); setSupplyAmount(''); setSupplyOrigin('deposit'); setSupplyObs('')
    }

    const handleEmitNFCe = async () => {
        if (!lastCompletedSaleId) {
            toast.error('Nenhuma venda selecionada')
            return
        }

        setEmittingNFCe(true)
        setNfceEmissionResult(null)

        try {
            const result = await fiscalService.emitNFCe(lastCompletedSaleId)
            setNfceEmissionResult(result)

            if (result.success) {
                toast.success('NFC-e emitida com sucesso!')
                // Automatically download PDF
                if (result.nfce?.id) {
                    try {
                        await fiscalService.downloadPDF(result.nfce.id)
                        toast.success('PDF baixado com sucesso!')
                    } catch (error) {
                        console.error('Error downloading PDF:', error)
                    }
                }
            } else {
                toast.error(result.message || 'Erro ao emitir NFC-e')
            }
        } catch (error) {
            console.error('Error emitting NFC-e:', error)
            toast.error('Erro ao emitir NFC-e')
            setNfceEmissionResult({
                success: false,
                message: 'Erro ao comunicar com o servidor'
            })
        } finally {
            setEmittingNFCe(false)
        }
    }

    const handleCloseNFCeModal = () => {
        setShowNFCeModal(false)
        setLastCompletedSaleId(null)
        setNfceEmissionResult(null)
    }

    const handleLogout = () => { logout(); navigate('/login') }

    // Report totals handled by API

    // Calculate customer total debt
    const getCustomerTotalDebt = (customer: Customer) => {
        return customer.debts.reduce((acc, d) => acc + d.remaining, 0)
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col transition-colors duration-200">
            {/* Header */}
            <header className="bg-white dark:bg-gray-800 px-6 py-4 flex items-center justify-between border-b border-gray-200 dark:border-gray-700 shadow-sm sticky top-0 z-50 transition-colors">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-green-600 rounded-xl flex items-center justify-center text-white font-black text-lg shadow-lg shadow-green-600/20">CM</div>
                    <div>
                        <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">Comercial Matheus</h1>
                        <span className="text-gray-500 dark:text-gray-400 text-sm font-medium">{formatTime(currentTime)}</span>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold shadow-sm ${cashierStatus === 'open' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800' : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800'}`}>
                        <Wallet className="w-4 h-4" />
                        Caixa 01 - {cashierStatus === 'open' ? 'Aberto' : 'Fechado'}
                    </div>

                    <div className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold shadow-sm ${isOnline ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border border-blue-100 dark:border-blue-800' : 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-100 dark:border-red-800'}`}>
                        {syncStatus === 'syncing' ? <RefreshCw className="w-3 h-3 animate-spin" /> : <span className="w-2 h-2 rounded-full bg-current" />}
                        {isOnline ? 'Online' : `Offline ${pendingCount > 0 ? `(${pendingCount})` : ''}`}
                    </div>

                    <div className="h-10 w-px bg-gray-200 dark:bg-gray-700 mx-2"></div>

                    <div className="flex items-center gap-3">
                        <div className="text-right hidden md:block">
                            <p className="text-sm font-bold text-gray-800 dark:text-gray-200">{user?.name}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Operador</p>
                        </div>
                        <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center text-gray-600 dark:text-gray-300 font-bold border border-gray-200 dark:border-gray-600">
                            {user?.name?.charAt(0)}
                        </div>
                    </div>

                    <div className="relative">
                        <button onClick={() => setShowMenu(!showMenu)} className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 px-4 py-2 rounded-xl transition-colors font-medium border border-gray-200 dark:border-gray-600">
                            <Menu className="w-5 h-5" />
                            <span className="hidden md:inline">Menu</span>
                        </button>

                        {showMenu && (
                            <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-xl shadow-2xl py-2 z-50 border border-gray-100 dark:border-gray-700">
                                <button onClick={() => { setShowOpenCashierModal(true); setShowMenu(false) }} className="w-full px-4 py-2.5 text-left text-green-800 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 flex items-center gap-2 font-medium disabled:opacity-50" disabled={cashierStatus === 'open'}>
                                    <Wallet className="w-4 h-4" /> Abrir Caixa
                                </button>
                                <button onClick={() => { setShowCloseCashierModal(true); setShowMenu(false) }} className="w-full px-4 py-2.5 text-left text-green-800 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 flex items-center gap-2 font-medium disabled:opacity-50" disabled={cashierStatus === 'closed'}>
                                    <Wallet className="w-4 h-4" /> Fechar Caixa
                                </button>
                                <hr className="my-1 border-gray-200 dark:border-gray-700" />
                                <button onClick={() => { setShowWithdrawalModal(true); setShowMenu(false) }} className="w-full px-4 py-2.5 text-left text-green-800 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 flex items-center gap-2 font-medium">
                                    <Minus className="w-4 h-4" /> Sangria
                                </button>
                                <button onClick={() => { setShowSupplyModal(true); setShowMenu(false) }} className="w-full px-4 py-2.5 text-left text-green-800 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 flex items-center gap-2 font-medium">
                                    <Plus className="w-4 h-4" /> Suprimento
                                </button>
                                <hr className="my-1 border-gray-200 dark:border-gray-700" />
                                <button onClick={() => { setShowSalesReportModal(true); setShowMenu(false) }} className="w-full px-4 py-2.5 text-left text-green-800 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 flex items-center gap-2 font-medium">
                                    <ClipboardList className="w-4 h-4" /> Relatório de Vendas
                                </button>
                                <hr className="my-1 border-gray-200 dark:border-gray-700" />
                                <button onClick={() => { syncService.forceSyncNow(); setShowMenu(false) }} className="w-full px-4 py-2.5 text-left text-green-800 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 flex items-center gap-2 font-medium">
                                    <RefreshCw className="w-4 h-4" /> Sincronizar
                                </button>
                                <hr className="my-1 border-gray-200 dark:border-gray-700" />
                                <button onClick={handleLogout} className="w-full px-4 py-2.5 text-left text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2 font-medium">
                                    <LogOut className="w-4 h-4" /> Sair
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            {/* Main content */}
            <main className="flex-1 p-6 flex gap-6 overflow-hidden h-[calc(100vh-80px)]">
                {/* Left column */}
                <div className="w-5/12 flex flex-col gap-6">
                    <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 transition-colors">
                        <div className="relative">
                            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Digite o nome ou código de barras..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full h-14 pl-14 pr-4 rounded-2xl border-2 border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 hover:bg-white dark:hover:bg-gray-800 hover:border-green-200 dark:hover:border-green-700 focus:bg-white dark:focus:bg-gray-800 text-gray-800 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-4 focus:ring-green-100 dark:focus:ring-green-900/30 focus:border-green-500 dark:focus:border-green-500 text-lg transition-all"
                            />

                            {searchResults.length > 0 && (
                                <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 rounded-2xl shadow-xl z-40 overflow-hidden border border-gray-100 dark:border-gray-700 max-h-[400px] overflow-y-auto">
                                    {searchResults.map((product) => (
                                        <button key={product.id} onClick={() => handleSelectProduct(product)} className="w-full px-6 py-4 text-left hover:bg-green-50 dark:hover:bg-gray-700 flex items-center justify-between border-b border-gray-50 dark:border-gray-700 last:border-0 transition-colors group">
                                            <div>
                                                <p className="font-bold text-gray-800 dark:text-gray-100 group-hover:text-green-700 dark:group-hover:text-green-400">{product.name}</p>
                                                <p className="text-sm text-gray-400 group-hover:text-green-600 dark:group-hover:text-green-300">{product.barcode}</p>
                                            </div>
                                            <span className="font-black text-green-600 dark:text-green-400 text-lg bg-green-50 dark:bg-gray-900 px-3 py-1 rounded-lg group-hover:bg-white dark:group-hover:bg-gray-800">{formatCurrency(product.price)}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                        <button onClick={() => setShowDiverseModal(true)} className="w-full mt-4 h-12 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 hover:text-green-700 dark:hover:text-green-400 font-bold rounded-2xl flex items-center justify-center gap-2 transition-all border border-gray-200 dark:border-gray-600 hover:border-green-200 dark:hover:border-green-700">
                            <Package className="w-5 h-5" /> Adicionar Produto Diverso
                        </button>
                    </div>

                    <button onClick={() => setShowFavorites(!showFavorites)} className="w-full bg-yellow-400 hover:bg-yellow-300 dark:bg-yellow-500 dark:hover:bg-yellow-400 text-green-900 font-bold py-4 px-6 rounded-2xl flex items-center justify-between shadow-sm border border-yellow-500/20 transition-all hover:shadow-lg group">
                        <span className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-yellow-300/50 dark:bg-yellow-600/50 text-green-900 flex items-center justify-center">
                                <Star className="w-5 h-5 fill-current" />
                            </div>
                            Produtos Favoritos
                        </span>
                        {showFavorites ? <ChevronUp className="w-5 h-5 text-green-800" /> : <ChevronDown className="w-5 h-5 text-green-800" />}
                    </button>

                    {showFavorites && (
                        <div className="bg-white dark:bg-gray-800 rounded-3xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 animate-slideIn flex-1 min-h-0 overflow-y-auto transition-colors">
                            {favoriteProducts.length > 0 ? (
                                <div className="grid grid-cols-2 gap-3">
                                    {favoriteProducts.map((product) => (
                                        <button key={product.id} onClick={() => handleSelectProduct(product)} className="p-4 bg-gray-50 dark:bg-gray-700 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-2xl text-left transition-all border border-gray-100 dark:border-gray-600 hover:border-green-200 dark:hover:border-green-700 group">
                                            <p className="font-bold text-sm text-gray-700 dark:text-gray-200 group-hover:text-green-800 dark:group-hover:text-green-300 truncate mb-1">{product.name}</p>
                                            <p className="text-green-600 dark:text-green-400 font-black text-lg">{formatCurrency(product.price)}</p>
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-gray-400 dark:text-gray-500">
                                    <Star className="w-8 h-8 mb-2 opacity-20" />
                                    <p className="text-sm font-medium">Nenhum produto favorito</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Right column - Cart */}
                <div className="w-7/12">
                    <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl h-full flex flex-col overflow-hidden border border-gray-200 dark:border-gray-700 transition-colors">
                        {/* Cart Header */}
                        <div className="px-6 py-4 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between transition-colors">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 flex items-center justify-center">
                                    <ShoppingCart className="w-5 h-5" />
                                </div>
                                <h2 className="font-bold text-gray-800 dark:text-gray-100 text-xl">Carrinho de Compras</h2>
                            </div>
                            <span className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-sm font-bold px-3 py-1 rounded-full border border-gray-200 dark:border-gray-600">
                                {items.length} {items.length === 1 ? 'item' : 'itens'}
                            </span>
                        </div>

                        {/* Cart Items */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50/50 dark:bg-gray-900/50">
                            {items.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-center p-8 opacity-50">
                                    <div className="w-24 h-24 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
                                        <ShoppingCart className="w-10 h-10 text-gray-400 dark:text-gray-500" />
                                    </div>
                                    <p className="text-gray-800 dark:text-gray-200 text-xl font-bold mb-1">Seu carrinho está vazio</p>
                                    <p className="text-gray-500 dark:text-gray-400">Adicione produtos ou use o campo de busca</p>
                                </div>
                            ) : (
                                items.map((item, index) => (
                                    <div key={index} className="flex items-center gap-4 p-4 bg-white dark:bg-gray-700 rounded-2xl border border-gray-100 dark:border-gray-600 shadow-sm hover:shadow-md transition-all group">
                                        <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-600 text-gray-500 dark:text-gray-300 font-bold flex items-center justify-center text-sm">
                                            {index + 1}
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-bold text-gray-800 dark:text-gray-100 text-lg">{item.description}</p>
                                            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                                                {formatCurrency(item.unitPrice)} <span className="text-gray-300 mx-1">x</span> {item.quantity} un
                                            </p>
                                        </div>
                                        <div className="text-right mr-4">
                                            <p className="font-black text-green-600 dark:text-green-400 text-xl">{formatCurrency(item.subtotal)}</p>
                                        </div>
                                        <div className="flex items-center gap-1 bg-gray-50 dark:bg-gray-800 p-1 rounded-xl border border-gray-200 dark:border-gray-600">
                                            <button onClick={() => updateQuantity(index, item.quantity - 1)} className="w-8 h-8 rounded-lg hover:bg-white dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 hover:text-red-500 flex items-center justify-center transition-colors"><Minus className="w-4 h-4" /></button>
                                            <span className="w-8 text-center font-bold text-gray-800 dark:text-gray-100">{item.quantity}</span>
                                            <button onClick={() => updateQuantity(index, item.quantity + 1)} className="w-8 h-8 rounded-lg hover:bg-white dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 hover:text-green-600 flex items-center justify-center transition-colors"><Plus className="w-4 h-4" /></button>
                                        </div>
                                        <button onClick={() => removeItem(index)} className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/40 hover:text-red-600 flex items-center justify-center transition-colors border border-red-100 dark:border-red-900/30">
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Footer Totals */}
                        <div className="bg-white dark:bg-gray-800 p-6 border-t border-gray-200 dark:border-gray-700 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] z-10 transition-colors">
                            <div className="flex items-end justify-between mb-6">
                                <div>
                                    <p className="text-sm font-bold text-gray-400 uppercase tracking-wide mb-1">Total a Pagar</p>
                                    <div className="text-5xl font-black text-gray-800 dark:text-gray-100 tracking-tight">{formatCurrency(total)}</div>
                                </div>
                                <div className="text-right hidden xl:block">
                                    <p className="text-sm font-medium text-gray-400">Subtotal</p>
                                    <p className="text-xl font-bold text-gray-600 dark:text-gray-300">{formatCurrency(subtotal)}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-4 gap-4 h-16">
                                <button
                                    onClick={clearCart}
                                    disabled={items.length === 0}
                                    className="col-span-1 h-full bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 font-bold rounded-2xl flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors border border-red-100 dark:border-red-900/30"
                                >
                                    <Trash2 className="w-5 h-5" /> Limpar
                                </button>
                                <button
                                    onClick={handleFinalizeSale}
                                    disabled={items.length === 0}
                                    className="col-span-3 h-full bg-green-600 hover:bg-green-700 text-white font-bold rounded-2xl flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-green-200 hover:shadow-green-300 transition-all transform active:scale-[0.98] text-xl"
                                >
                                    <DollarSign className="w-6 h-6" /> Finalizar Venda
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* Payment Modal */}
            <Modal isOpen={showPaymentModal} onClose={() => setShowPaymentModal(false)} title={`Finalizar Venda - ${formatCurrency(total)}`} size="lg">
                <div className="space-y-5">
                    <div>
                        <label className="block text-sm font-bold text-green-800 mb-3">Forma de Pagamento</label>
                        <div className="grid grid-cols-5 gap-2">
                            {(['cash', 'debit', 'credit', 'pix', 'installment'] as PaymentMethod[]).map((method) => (
                                <button key={method} onClick={() => handlePaymentMethodChange(method)} className={`p-3 rounded-xl border-2 flex flex-col items-center gap-1 transition-all ${selectedPayment === method ? 'border-green-500 bg-green-50 dark:bg-green-900/30' : 'border-gray-200 dark:border-gray-700 hover:border-green-300 dark:hover:border-green-500'}`}>
                                    <span className={selectedPayment === method ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}>{PAYMENT_ICONS[method]}</span>
                                    <span className={`text-xs font-bold ${selectedPayment === method ? 'text-green-800 dark:text-green-300' : 'text-gray-600 dark:text-gray-300'}`}>{PAYMENT_METHOD_LABELS[method]}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {selectedPayment === 'cash' && (
                        <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 space-y-3">
                            <div><label className="block text-sm font-bold text-green-800 dark:text-green-400 mb-2">Valor Recebido</label><input type="text" placeholder="R$ 0,00" value={amountReceived} onChange={(e) => setAmountReceived(e.target.value)} className="w-full h-12 px-4 rounded-xl border-2 border-green-200 dark:border-green-800 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:border-green-500 focus:ring-4 focus:ring-green-500/20 text-lg font-bold" /></div>
                            {amountReceived && <div className="flex items-center justify-between text-lg font-bold"><span className="text-green-700">Troco:</span><span className="text-yellow-600">{formatCurrency(calculateChange())}</span></div>}
                        </div>
                    )}

                    {selectedPayment === 'installment' && (
                        <div className="bg-yellow-50 dark:bg-yellow-900/10 rounded-xl p-4 space-y-3">
                            <div className="flex items-center gap-2 mb-2">
                                <Users className="w-5 h-5 text-yellow-600 dark:text-yellow-500" />
                                <span className="font-bold text-yellow-800 dark:text-yellow-400">Venda a Prazo</span>
                            </div>
                            {selectedCustomer ? (
                                <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-yellow-200 dark:border-yellow-900/50">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="font-bold text-green-800 dark:text-green-400">{selectedCustomer.name}</p>
                                            <p className="text-sm text-green-600 dark:text-green-500">{selectedCustomer.phone}</p>
                                        </div>
                                        <button onClick={() => setShowCustomerSelectModal(true)} className="text-sm text-yellow-600 dark:text-yellow-500 hover:text-yellow-700 dark:hover:text-yellow-400 font-medium">Trocar</button>
                                    </div>
                                    {selectedCustomer.debts.length > 0 && (
                                        <div className="mt-2 pt-2 border-t border-yellow-200 flex items-center gap-2 text-sm text-orange-600">
                                            <AlertTriangle className="w-4 h-4" />
                                            <span>Dívida atual: {formatCurrency(getCustomerTotalDebt(selectedCustomer))}</span>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <button onClick={() => setShowCustomerSelectModal(true)} className="w-full h-12 border-2 border-dashed border-yellow-300 dark:border-yellow-700 rounded-xl text-yellow-700 dark:text-yellow-500 hover:bg-yellow-100 dark:hover:bg-yellow-900/30 font-medium">
                                    Selecionar Cliente
                                </button>
                            )}
                            <div>
                                <label className="block text-sm font-bold text-yellow-800 dark:text-yellow-400 mb-2">Parcelas</label>
                                <select value={installmentCount} onChange={(e) => setInstallmentCount(e.target.value)} className="w-full h-12 px-4 rounded-xl border-2 border-yellow-200 dark:border-yellow-800 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100">
                                    {[2, 3, 4, 5, 6].map(n => <option key={n} value={n}>{n}x de {formatCurrency(total / n)}</option>)}
                                </select>
                            </div>
                        </div>
                    )}

                    <label className="flex items-center gap-3 cursor-pointer">
                        <input type="checkbox" checked={wantsCPF} onChange={(e) => setWantsCPF(e.target.checked)} className="w-5 h-5 rounded border-green-300 text-green-600 focus:ring-green-500" />
                        <span className="font-bold text-green-800">Informar CPF na nota</span>
                    </label>
                    {wantsCPF && <input type="text" placeholder="000.000.000-00" value={cpf} onChange={(e) => setCpf(e.target.value)} maxLength={14} className="w-full h-12 px-4 rounded-xl border-2 border-green-200 dark:border-green-800 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:border-green-500 focus:ring-4 focus:ring-green-500/20" />}

                    <label className="flex items-center gap-3 cursor-pointer">
                        <input type="checkbox" checked={isDelivery} onChange={(e) => setIsDelivery(e.target.checked)} className="w-5 h-5 rounded border-green-300 text-green-600 focus:ring-green-500" />
                        <span className="font-bold text-green-800">É para entrega?</span>
                    </label>

                    {isDelivery && (
                        <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 space-y-3">
                            <div className="flex items-center gap-2 mb-2"><MapPin className="w-5 h-5 text-green-600 dark:text-green-500" /><span className="font-bold text-green-800 dark:text-green-400">Endereço de Entrega</span></div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="col-span-2"><label className="block text-xs font-bold text-green-700 dark:text-green-400 mb-1">Rua *</label><input type="text" placeholder="Nome da rua" value={deliveryStreet} onChange={(e) => setDeliveryStreet(e.target.value)} className="w-full h-11 px-3 rounded-lg border-2 border-green-200 dark:border-green-800 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 text-sm" /></div>
                                <div><label className="block text-xs font-bold text-green-700 dark:text-green-400 mb-1">Número</label><input type="text" placeholder="Nº" value={deliveryNumber} onChange={(e) => setDeliveryNumber(e.target.value)} className="w-full h-11 px-3 rounded-lg border-2 border-green-200 dark:border-green-800 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 text-sm" /></div>
                                <div><label className="block text-xs font-bold text-green-700 dark:text-green-400 mb-1">Bairro</label><input type="text" placeholder="Bairro" value={deliveryNeighborhood} onChange={(e) => setDeliveryNeighborhood(e.target.value)} className="w-full h-11 px-3 rounded-lg border-2 border-green-200 dark:border-green-800 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 text-sm" /></div>
                                <div className="col-span-2"><label className="block text-xs font-bold text-green-700 dark:text-green-400 mb-1">Ponto de Referência</label><input type="text" placeholder="Ex: Próximo ao mercado..." value={deliveryReference} onChange={(e) => setDeliveryReference(e.target.value)} className="w-full h-11 px-3 rounded-lg border-2 border-green-200 dark:border-green-800 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 text-sm" /></div>
                            </div>
                        </div>
                    )}

                    <div className="flex gap-3 pt-4 border-t">
                        <button onClick={() => setShowPaymentModal(false)} className="flex-1 h-12 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold rounded-xl">Cancelar</button>
                        <button onClick={handleConfirmSale} disabled={isProcessing} className="flex-1 h-12 bg-green-500 hover:bg-green-600 text-white font-bold rounded-xl disabled:opacity-50 flex items-center justify-center gap-2">
                            {isProcessing && <RefreshCw className="w-5 h-5 animate-spin" />}
                            Confirmar Venda
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Customer Selection Modal */}
            <Modal isOpen={showCustomerSelectModal} onClose={() => setShowCustomerSelectModal(false)} title="Selecionar Cliente para Venda a Prazo" size="3xl">
                <div className="space-y-6 max-h-[70vh] overflow-y-auto px-1">
                    {/* Search and Add */}
                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Buscar cliente por nome ou telefone..."
                            value={customerSearchQuery}
                            onChange={(e) => setCustomerSearchQuery(e.target.value)}
                            className="w-full h-14 pl-12 pr-4 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:border-green-500 dark:focus:border-green-500 text-lg shadow-sm"
                        />
                    </div>

                    {/* Customer Grid */}
                    <div className="grid grid-cols-1 gap-4">
                        {customers.filter(c =>
                            c.name.toLowerCase().includes(customerSearchQuery.toLowerCase()) ||
                            (c.phone && c.phone.includes(customerSearchQuery))
                        ).map(customer => {
                            const totalDebt = getCustomerTotalDebt(customer)
                            const hasDebt = totalDebt > 0
                            const debtCount = customer.debts.filter(d => d.remaining > 0).length
                            // Check for overdue debts (using the calculated field from backend or checking date explicitly)
                            const hasOverdueDebt = customer.debts.some((d: any) => {
                                if (d.remaining <= 0) return false
                                // Use daysOverdue if available from backend, otherwise calculate
                                if (d.daysOverdue !== undefined) return d.daysOverdue > 0
                                return new Date(d.dueDate || d.createdAt) < new Date()
                            })

                            return (
                                <div
                                    key={customer.id}
                                    className={`relative rounded-2xl border-2 transition-all hover:shadow-lg overflow-hidden ${hasOverdueDebt ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-900/30' : hasDebt ? 'bg-orange-50 dark:bg-orange-900/10 border-orange-200 dark:border-orange-900/30' : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                                        }`}
                                >
                                    {hasOverdueDebt && (
                                        <div className="absolute top-0 right-0 bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded-bl-xl z-20 flex items-center gap-1">
                                            <AlertTriangle className="w-3 h-3" /> DÍVIDA VENCIDA
                                        </div>
                                    )}

                                    <div className="p-5 flex items-start justify-between gap-4">
                                        {/* Left Info */}
                                        <div className="flex items-center gap-4 flex-1">
                                            <div className={`w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-2xl shadow-sm ${hasOverdueDebt ? 'bg-gradient-to-br from-red-500 to-red-600' : hasDebt ? 'bg-gradient-to-br from-orange-400 to-red-500' : 'bg-gradient-to-br from-green-400 to-green-600'
                                                }`}>
                                                {hasOverdueDebt ? <AlertTriangle className="w-8 h-8" /> : customer.name.charAt(0)}
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-gray-800 dark:text-gray-100 text-xl flex items-center gap-2">
                                                    {customer.name}
                                                    {hasOverdueDebt && <AlertTriangle className="w-5 h-5 text-red-500" />}
                                                </h3>
                                                <div className="flex items-center gap-4 text-sm mt-1">
                                                    <span className="flex items-center gap-1 text-gray-600 dark:text-gray-400 font-medium">
                                                        <Smartphone className="w-4 h-4" /> {customer.phone || 'Sem telefone'}
                                                    </span>
                                                    {hasDebt && (
                                                        <span className={`flex items-center gap-1 font-bold px-2 py-0.5 rounded-full ${hasOverdueDebt ? 'text-red-600 bg-red-100' : 'text-orange-600 bg-orange-100'}`}>
                                                            <AlertTriangle className="w-3 h-3" /> {debtCount} {debtCount === 1 ? 'dívida' : 'dívidas'}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Right Info / Action */}
                                        <div className="flex flex-col items-end gap-2">
                                            {hasDebt ? (
                                                <div className="text-right">
                                                    <p className="text-xs font-bold text-orange-600 uppercase tracking-wide mb-1">Total Devedor</p>
                                                    <p className="text-2xl font-black text-orange-600 leading-none">{formatCurrency(totalDebt)}</p>
                                                </div>
                                            ) : (
                                                <div className="px-4 py-2 bg-green-100 text-green-700 rounded-lg font-bold text-sm flex items-center gap-2">
                                                    <Check className="w-4 h-4" /> Nada consta
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Expanded Debt Details (if any) */}
                                    {hasDebt && (
                                        <div className="bg-white/50 dark:bg-gray-800/50 border-t border-orange-100 dark:border-orange-900/30 p-4">
                                            <div className="flex items-center gap-2 text-sm font-bold text-gray-500 dark:text-gray-400 mb-2">
                                                <FileText className="w-4 h-4" /> Detalhamento das Dívidas
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                                {customer.debts.filter(d => d.remaining > 0).map(debt => (
                                                    <div key={debt.id} className="bg-white dark:bg-gray-900 p-3 rounded-xl border border-orange-100 dark:border-orange-900/30 shadow-sm flex items-center justify-between">
                                                        <div>
                                                            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase">{new Date(debt.createdAt).toLocaleDateString('pt-BR')}</p>
                                                            <p className="text-sm font-bold text-gray-700 dark:text-gray-300 mt-0.5">
                                                                {debt.paidInstallments}/{debt.installments} parcelas pagas
                                                            </p>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="text-xs text-gray-400">Restante</p>
                                                            <p className="font-bold text-orange-600">{formatCurrency(debt.remaining)}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Select Button Overlay */}
                                    <button
                                        onClick={() => handleSelectCustomer(customer)}
                                        className="absolute inset-0 w-full h-full opacity-0 hover:opacity-100 bg-black/5 flex items-center justify-center transition-all cursor-pointer"
                                        title="Clique para selecionar este cliente"
                                    >
                                        <span className="bg-green-600 text-white px-6 py-2 rounded-full font-bold shadow-lg transform translate-y-2 hover:scale-105 transition-transform">
                                            Selecionar Cliente
                                        </span>
                                    </button>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </Modal>

            {/* Sales Report Modal */}
            <Modal isOpen={showSalesReportModal} onClose={() => setShowSalesReportModal(false)} title="Relatório de Vendas Diárias" size="xl">
                <div className="space-y-6">
                    {/* Dashboard Cards */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-gradient-to-br from-green-100 to-green-50 rounded-2xl p-6 text-center shadow-sm">
                            <ShoppingCart className="w-8 h-8 mx-auto mb-2 text-green-600" />
                            <p className="text-sm text-green-600 font-medium">Total de Vendas</p>
                            <p className="text-4xl font-black text-green-800">{salesReportData.salesCount}</p>
                        </div>
                        <div className="bg-gradient-to-br from-blue-100 to-blue-50 rounded-2xl p-6 text-center shadow-sm">
                            <DollarSign className="w-8 h-8 mx-auto mb-2 text-blue-600" />
                            <p className="text-sm text-blue-600 font-medium">Total Vendido</p>
                            <p className="text-3xl font-black text-blue-800">{formatCurrency(salesReportData.totalRevenue)}</p>
                        </div>
                        <div className="bg-gradient-to-br from-red-100 to-red-50 rounded-2xl p-6 text-center shadow-sm">
                            <Minus className="w-8 h-8 mx-auto mb-2 text-red-600" />
                            <p className="text-sm text-red-600 font-medium">Sangrias</p>
                            <p className="text-3xl font-black text-red-800">{formatCurrency(salesReportData.totalWithdrawals)}</p>
                        </div>
                        <div className="bg-gradient-to-br from-yellow-100 to-yellow-50 rounded-2xl p-6 text-center shadow-sm">
                            <Plus className="w-8 h-8 mx-auto mb-2 text-yellow-600" />
                            <p className="text-sm text-yellow-600 font-medium">Suprimentos</p>
                            <p className="text-3xl font-black text-yellow-800">{formatCurrency(salesReportData.totalSupplies)}</p>
                        </div>
                    </div>

                    {/* Net Total */}
                    <div className="bg-gradient-to-r from-green-500 to-emerald-500 rounded-2xl p-6 text-center shadow-lg">
                        <p className="text-lg text-white/80 font-medium">Saldo Líquido do Dia</p>
                        <p className="text-5xl font-black text-white">{formatCurrency(salesReportData.netTotal)}</p>
                    </div>

                    {/* Sales List */}
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-gray-800 text-lg">Histórico de Vendas de Hoje</h3>
                            <button onClick={fetchSalesReport} className="text-green-600 hover:text-green-700 text-sm font-bold flex items-center gap-1">
                                <RefreshCw className={`w-4 h-4 ${isLoadingReport ? 'animate-spin' : ''}`} /> Atualizar
                            </button>
                        </div>
                        <div className="bg-gray-50 rounded-2xl overflow-hidden max-h-96 overflow-y-auto">
                            <div className="grid grid-cols-4 gap-4 p-4 bg-gray-100 font-bold text-sm text-gray-600 sticky top-0">
                                <span>Horário</span>
                                <span>Itens</span>
                                <span>Pagamento</span>
                                <span className="text-right">Valor</span>
                            </div>
                            <div className="divide-y divide-gray-200">
                                {salesReportData.sales.length === 0 ? (
                                    <div className="p-8 text-center text-gray-500">Nenhuma venda realizada hoje</div>
                                ) : (
                                    salesReportData.sales.map(sale => (
                                        <div key={sale.id} className="grid grid-cols-4 gap-4 p-4 items-center hover:bg-gray-100">
                                            <span className="text-gray-700 font-medium">{sale.time}</span>
                                            <span className="text-gray-600">{sale.items} itens</span>
                                            <span className="text-xs bg-green-100 text-green-700 px-3 py-1 rounded-full font-medium w-fit">
                                                {PAYMENT_METHOD_LABELS[sale.paymentMethod as PaymentMethod] || sale.paymentMethod}
                                            </span>
                                            <span className="font-bold text-green-800 text-right text-lg">{formatCurrency(sale.total)}</span>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                    <button onClick={() => setShowSalesReportModal(false)} className="w-full h-14 bg-green-500 hover:bg-green-600 text-white font-bold rounded-xl text-lg">
                        Fechar Relatório
                    </button>
                </div>
            </Modal>

            {/* Other modals */}
            <Modal isOpen={showDiverseModal} onClose={() => setShowDiverseModal(false)} title="Produto Diverso">
                <div className="space-y-4">
                    <div><label className="block text-sm font-bold text-green-800 dark:text-green-400 mb-2">Descrição</label><input type="text" placeholder="Ex: Produto avulso" value={diverseDescription} onChange={(e) => setDiverseDescription(e.target.value)} className="w-full h-12 px-4 rounded-xl border-2 border-green-200 dark:border-green-800 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100" /></div>
                    <div><label className="block text-sm font-bold text-green-800 dark:text-green-400 mb-2">Valor Unitário</label><input type="text" placeholder="R$ 0,00" value={diversePrice} onChange={(e) => setDiversePrice(e.target.value)} className="w-full h-12 px-4 rounded-xl border-2 border-green-200 dark:border-green-800 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100" /></div>
                    <div><label className="block text-sm font-bold text-green-800 dark:text-green-400 mb-2">Quantidade</label><input type="number" min="1" value={diverseQuantity} onChange={(e) => setDiverseQuantity(e.target.value)} className="w-full h-12 px-4 rounded-xl border-2 border-green-200 dark:border-green-800 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100" /></div>
                    <div className="flex gap-3 pt-4"><button onClick={() => setShowDiverseModal(false)} className="flex-1 h-12 bg-gray-200 text-gray-700 font-bold rounded-xl">Cancelar</button><button onClick={handleAddDiverseProduct} className="flex-1 h-12 bg-green-500 text-white font-bold rounded-xl">Adicionar</button></div>
                </div>
            </Modal>

            <Modal isOpen={showOpenCashierModal} onClose={() => setShowOpenCashierModal(false)} title="Abrir Caixa">
                <div className="space-y-4">
                    <div><label className="block text-sm font-bold text-green-800 dark:text-green-400 mb-2">Valor Inicial</label><input type="text" placeholder="R$ 0,00" value={openingBalance} onChange={(e) => setOpeningBalance(e.target.value)} className="w-full h-12 px-4 rounded-xl border-2 border-green-200 dark:border-green-800 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 font-bold" /></div>
                    <div className="flex gap-3 pt-4"><button onClick={() => setShowOpenCashierModal(false)} className="flex-1 h-12 bg-gray-200 text-gray-700 font-bold rounded-xl">Cancelar</button><button onClick={handleOpenCashier} className="flex-1 h-12 bg-green-500 text-white font-bold rounded-xl">Abrir Caixa</button></div>
                </div>
            </Modal>

            <Modal isOpen={showCloseCashierModal} onClose={() => setShowCloseCashierModal(false)} title="Fechar Caixa">
                <div className="space-y-4">
                    <div className="bg-green-50 rounded-xl p-4"><div className="flex justify-between"><span className="text-green-700">Saldo Inicial:</span><span className="font-bold">{formatCurrency(currentCashier?.openingBalance || 0)}</span></div></div>
                    <div><label className="block text-sm font-bold text-green-800 dark:text-green-400 mb-2">Valor Contado</label><input type="text" placeholder="R$ 0,00" value={closingBalance} onChange={(e) => setClosingBalance(e.target.value)} className="w-full h-12 px-4 rounded-xl border-2 border-green-200 dark:border-green-800 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 font-bold" /></div>
                    <div className="flex gap-3 pt-4"><button onClick={() => setShowCloseCashierModal(false)} className="flex-1 h-12 bg-gray-200 text-gray-700 font-bold rounded-xl">Cancelar</button><button onClick={handleCloseCashier} className="flex-1 h-12 bg-red-500 text-white font-bold rounded-xl">Fechar Caixa</button></div>
                </div>
            </Modal>

            <Modal isOpen={showWithdrawalModal} onClose={() => setShowWithdrawalModal(false)} title="Sangria">
                <div className="space-y-4">
                    <div><label className="block text-sm font-bold text-green-800 dark:text-green-400 mb-2">Valor</label><input type="text" placeholder="R$ 0,00" value={withdrawalAmount} onChange={(e) => setWithdrawalAmount(e.target.value)} className="w-full h-12 px-4 rounded-xl border-2 border-green-200 dark:border-green-800 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100" /></div>
                    <div><label className="block text-sm font-bold text-green-800 dark:text-green-400 mb-2">Motivo</label><select value={withdrawalReason} onChange={(e) => setWithdrawalReason(e.target.value as keyof typeof WITHDRAWAL_REASONS)} className="w-full h-12 px-4 rounded-xl border-2 border-green-200 dark:border-green-800 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100">{Object.entries(WITHDRAWAL_REASONS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></div>
                    <div><label className="block text-sm font-bold text-green-800 dark:text-green-400 mb-2">Observações</label><input type="text" placeholder="Opcional" value={withdrawalObs} onChange={(e) => setWithdrawalObs(e.target.value)} className="w-full h-12 px-4 rounded-xl border-2 border-green-200 dark:border-green-800 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100" /></div>
                    <div className="flex gap-3 pt-4"><button onClick={() => setShowWithdrawalModal(false)} className="flex-1 h-12 bg-gray-200 text-gray-700 font-bold rounded-xl">Cancelar</button><button onClick={handleWithdrawal} className="flex-1 h-12 bg-red-500 text-white font-bold rounded-xl">Registrar</button></div>
                </div>
            </Modal>

            <Modal isOpen={showSupplyModal} onClose={() => setShowSupplyModal(false)} title="Suprimento">
                <div className="space-y-4">
                    <div><label className="block text-sm font-bold text-green-800 dark:text-green-400 mb-2">Valor</label><input type="text" placeholder="R$ 0,00" value={supplyAmount} onChange={(e) => setSupplyAmount(e.target.value)} className="w-full h-12 px-4 rounded-xl border-2 border-green-200 dark:border-green-800 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100" /></div>
                    <div><label className="block text-sm font-bold text-green-800 dark:text-green-400 mb-2">Origem</label><select value={supplyOrigin} onChange={(e) => setSupplyOrigin(e.target.value as keyof typeof SUPPLY_ORIGINS)} className="w-full h-12 px-4 rounded-xl border-2 border-green-200 dark:border-green-800 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100">{Object.entries(SUPPLY_ORIGINS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></div>
                    <div><label className="block text-sm font-bold text-green-800 dark:text-green-400 mb-2">Observações</label><input type="text" placeholder="Opcional" value={supplyObs} onChange={(e) => setSupplyObs(e.target.value)} className="w-full h-12 px-4 rounded-xl border-2 border-green-200 dark:border-green-800 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100" /></div>
                    <div className="flex gap-3 pt-4"><button onClick={() => setShowSupplyModal(false)} className="flex-1 h-12 bg-gray-200 text-gray-700 font-bold rounded-xl">Cancelar</button><button onClick={handleSupply} className="flex-1 h-12 bg-green-500 text-white font-bold rounded-xl">Registrar</button></div>
                </div>
            </Modal>

            {/* NFC-e Emission Modal */}
            <Modal isOpen={showNFCeModal} onClose={handleCloseNFCeModal} title="Emissão de NFC-e" size="lg">
                <div className="space-y-6">
                    {!nfceEmissionResult ? (
                        <>
                            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-6 text-center">
                                <Receipt className="w-16 h-16 mx-auto mb-4 text-blue-600 dark:text-blue-400" />
                                <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-2">
                                    Deseja emitir a Nota Fiscal (NFC-e)?
                                </h3>
                                <p className="text-gray-600 dark:text-gray-400">
                                    A nota fiscal eletrônica será enviada para a SEFAZ e um PDF será gerado para impressão.
                                </p>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={handleCloseNFCeModal}
                                    disabled={emittingNFCe}
                                    className="flex-1 h-12 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 font-bold rounded-xl disabled:opacity-50"
                                >
                                    Agora Não
                                </button>
                                <button
                                    onClick={handleEmitNFCe}
                                    disabled={emittingNFCe}
                                    className="flex-1 h-12 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {emittingNFCe ? (
                                        <>
                                            <RefreshCw className="w-5 h-5 animate-spin" />
                                            Emitindo...
                                        </>
                                    ) : (
                                        <>
                                            <Receipt className="w-5 h-5" />
                                            Emitir NFC-e
                                        </>
                                    )}
                                </button>
                            </div>
                        </>
                    ) : (
                        <>
                            {nfceEmissionResult.success ? (
                                <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-6 text-center">
                                    <div className="w-16 h-16 mx-auto mb-4 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                                        <Check className="w-10 h-10 text-green-600 dark:text-green-400" />
                                    </div>
                                    <h3 className="text-xl font-bold text-green-800 dark:text-green-300 mb-2">
                                        NFC-e Autorizada com Sucesso!
                                    </h3>
                                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                                        {nfceEmissionResult.message}
                                    </p>
                                    {nfceEmissionResult.nfce && (
                                        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 space-y-2 text-left">
                                            <div className="flex justify-between">
                                                <span className="text-sm text-gray-600 dark:text-gray-400">Número:</span>
                                                <span className="font-bold text-gray-800 dark:text-gray-100">
                                                    {nfceEmissionResult.nfce.numero} / Série {nfceEmissionResult.nfce.serie}
                                                </span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-sm text-gray-600 dark:text-gray-400">Protocolo:</span>
                                                <span className="font-bold text-gray-800 dark:text-gray-100">
                                                    {nfceEmissionResult.nfce.protocolo}
                                                </span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-sm text-gray-600 dark:text-gray-400">Chave de Acesso:</span>
                                                <span className="font-mono text-xs text-gray-800 dark:text-gray-100">
                                                    {nfceEmissionResult.nfce.chaveAcesso}
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                    {nfceEmissionResult.nfce?.id && (
                                        <button
                                            onClick={() => fiscalService.downloadPDF(nfceEmissionResult.nfce.id)}
                                            className="mt-4 w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl flex items-center justify-center gap-2"
                                        >
                                            <Download className="w-5 h-5" />
                                            Baixar PDF Novamente
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-6 text-center">
                                    <div className="w-16 h-16 mx-auto mb-4 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                                        <X className="w-10 h-10 text-red-600 dark:text-red-400" />
                                    </div>
                                    <h3 className="text-xl font-bold text-red-800 dark:text-red-300 mb-2">
                                        Erro ao Emitir NFC-e
                                    </h3>
                                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                                        {nfceEmissionResult.message}
                                    </p>
                                    <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-900/30 rounded-lg p-4 text-left">
                                        <p className="text-sm text-yellow-800 dark:text-yellow-300">
                                            <strong>Dica:</strong> Verifique se a configuração fiscal está correta em Gestão → Configuração Fiscal
                                        </p>
                                    </div>
                                </div>
                            )}

                            <button
                                onClick={handleCloseNFCeModal}
                                className="w-full h-12 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 font-bold rounded-xl"
                            >
                                Fechar
                            </button>
                        </>
                    )}
                </div>
            </Modal>

            {showMenu && <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />}
        </div>
    )
}
