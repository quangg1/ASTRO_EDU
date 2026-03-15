import { create } from 'zustand'
import type { AuthUser } from '@/lib/authApi'

interface AuthState {
  user: AuthUser | null
  loading: boolean
  checked: boolean
  setUser: (user: AuthUser | null) => void
  setLoading: (loading: boolean) => void
  setChecked: (checked: boolean) => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: false,
  checked: false,
  setUser: (user) => set({ user }),
  setLoading: (loading) => set({ loading }),
  setChecked: (checked) => set({ checked }),
}))
