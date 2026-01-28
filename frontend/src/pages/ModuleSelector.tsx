import { useNavigate } from 'react-router-dom'
import { ShoppingCart, BarChart3, ChevronRight } from 'lucide-react'

export default function ModuleSelector() {
    const navigate = useNavigate()

    return (
        <div className="min-h-screen bg-gradient-to-br from-green-600 via-green-500 to-emerald-500 flex relative overflow-hidden">
            {/* Subtle decorative circles */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-20 -left-20 w-80 h-80 bg-green-400/20 rounded-full blur-3xl" />
                <div className="absolute -bottom-20 -right-20 w-96 h-96 bg-emerald-400/20 rounded-full blur-3xl" />
            </div>

            {/* Main content - Two columns */}
            <div className="flex-1 flex flex-col lg:flex-row items-center justify-center p-8 gap-16 relative z-10">

                {/* LEFT SIDE - Branding */}
                <div className="flex-1 flex flex-col items-center lg:items-start justify-center max-w-lg">
                    {/* Styled text logo */}
                    <div className="text-center lg:text-left">
                        <h1
                            className="text-5xl lg:text-6xl font-extrabold text-white drop-shadow-lg"
                            style={{
                                fontFamily: "'Poppins', 'Inter', sans-serif",
                                textShadow: '2px 2px 4px rgba(0,0,0,0.2)'
                            }}
                        >
                            Comercial
                        </h1>
                        <h1
                            className="text-6xl lg:text-7xl font-black text-yellow-400 drop-shadow-lg -mt-2"
                            style={{
                                fontFamily: "'Poppins', 'Inter', sans-serif",
                                textShadow: '3px 3px 6px rgba(0,0,0,0.3)'
                            }}
                        >
                            Matheus
                        </h1>
                    </div>

                    {/* Slogan */}
                    <p className="text-lg lg:text-xl text-white/90 font-medium text-center lg:text-left mt-4 drop-shadow">
                        Mais Economia, Mais Atendimento, Mais Confiança!
                    </p>

                    {/* Simple decorative line */}
                    <div className="w-24 h-1 bg-yellow-400 rounded-full mt-6 mx-auto lg:mx-0" />
                </div>

                {/* RIGHT SIDE - Module Cards */}
                <div className="flex-1 flex flex-col items-center lg:items-start justify-center max-w-md w-full">
                    <h2 className="text-xl font-bold text-white/90 drop-shadow mb-6 text-center lg:text-left">
                        Escolha um módulo para começar
                    </h2>

                    <div className="flex flex-col gap-4 w-full">
                        {/* Sales Module Card */}
                        <button
                            onClick={() => navigate('/login', { state: { module: 'sales' } })}
                            className="group relative bg-white/15 backdrop-blur-sm border border-white/20 rounded-2xl p-5 shadow-xl hover:bg-white/25 hover:shadow-2xl transform hover:scale-[1.02] transition-all duration-300 text-left"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 bg-yellow-400 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                                    <ShoppingCart className="w-7 h-7 text-green-800" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-xl font-bold text-white mb-1">
                                        Sistema de Vendas
                                    </h3>
                                    <p className="text-white/70 text-sm">
                                        PDV, controle de caixa e vendas
                                    </p>
                                </div>
                                <div className="w-10 h-10 bg-yellow-400 rounded-full flex items-center justify-center shadow-lg flex-shrink-0 group-hover:bg-yellow-300 transition-colors">
                                    <ChevronRight className="w-6 h-6 text-green-800" />
                                </div>
                            </div>
                        </button>

                        {/* Management Module Card */}
                        <button
                            onClick={() => navigate('/login', { state: { module: 'management' } })}
                            className="group relative bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-5 shadow-xl hover:bg-white/25 hover:shadow-2xl transform hover:scale-[1.02] transition-all duration-300 text-left"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 bg-teal-500 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                                    <BarChart3 className="w-7 h-7 text-white" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-xl font-bold text-white mb-1">
                                        Sistema de Gestão
                                    </h3>
                                    <p className="text-white/70 text-sm">
                                        Estoque, financeiro e relatórios
                                    </p>
                                </div>
                                <div className="w-10 h-10 bg-teal-500 rounded-full flex items-center justify-center shadow-lg flex-shrink-0 group-hover:bg-teal-400 transition-colors">
                                    <ChevronRight className="w-6 h-6 text-white" />
                                </div>
                            </div>
                        </button>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="absolute bottom-0 left-0 right-0 text-center py-4">
                <p className="text-white/60 text-sm">
                    © 2026 Comercial Matheus - Todos os direitos reservados
                </p>
            </div>
        </div>
    )
}
