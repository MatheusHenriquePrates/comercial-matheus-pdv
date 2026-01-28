import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface ThemeState {
    theme: 'light' | 'dark'
    toggleTheme: () => void
    setTheme: (theme: 'light' | 'dark') => void
}

export const useThemeStore = create<ThemeState>()(
    persist(
        (set) => ({
            theme: 'light',
            toggleTheme: () => set((state) => {
                const newTheme = state.theme === 'light' ? 'dark' : 'light'
                const root = window.document.documentElement

                root.classList.remove('light', 'dark')
                root.classList.add(newTheme)

                return { theme: newTheme }
            }),
            setTheme: (theme) => set(() => {
                const root = window.document.documentElement
                root.classList.remove('light', 'dark')
                root.classList.add(theme)

                return { theme }
            }),
        }),
        {
            name: 'theme-storage',
            onRehydrateStorage: () => (state) => {
                if (state) {
                    const root = window.document.documentElement
                    root.classList.remove('light', 'dark')
                    root.classList.add(state.theme)
                }
            }
        }
    )
)
