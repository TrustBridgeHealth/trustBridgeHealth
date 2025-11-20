import * as React from "react"
import { ToastProps } from "./toast"

type ToastInput = Omit<ToastProps, "id">

let id = 0

export function useToast() {
  const [toasts, setToasts] = React.useState<ToastProps[]>([])

  const toast = React.useCallback((props: ToastInput) => {
    const newToast = { ...props, id: ++id }
    setToasts((prev) => [...prev, newToast])

    // Auto remove after 3 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== newToast.id))
    }, 3000)
  }, [])

  return {
    toast,
    toasts,
  }
}

export type Toast = ToastProps
