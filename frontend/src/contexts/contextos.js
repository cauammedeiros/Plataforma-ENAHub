import { createContext, useContext } from 'react'

export const AuthContext = createContext(null)
export const ToastContext = createContext(null)

export function useAuth() {
  return useContext(AuthContext)
}

// Mensagens de feedback: const toast = useToast(); toast.sucesso('Salvo!')
export function useToast() {
  return useContext(ToastContext)
}
