import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface ThemeState {
    theme: 'dark'
    toggleTheme: () => void
    setTheme: (theme: 'dark') => void
}

export const useThemeStore = create<ThemeState>()(
    persist(
        (set) => ({
            theme: 'dark',
            toggleTheme: () => set(() => {
                // Sempre dark mode
                const root = window.document.documentElement
                root.classList.remove('light')
                root.classList.add('dark')
                return { theme: 'dark' }
            }),
            setTheme: () => set(() => {
                // Sempre dark mode
                const root = window.document.documentElement
                root.classList.remove('light')
                root.classList.add('dark')
                return { theme: 'dark' }
            }),
        }),
        {
            name: 'theme-storage',
            onRehydrateStorage: () => () => {
                // Sempre aplicar dark mode na inicialização
                const root = window.document.documentElement
                root.classList.remove('light')
                root.classList.add('dark')
            }
        }
    )
)
