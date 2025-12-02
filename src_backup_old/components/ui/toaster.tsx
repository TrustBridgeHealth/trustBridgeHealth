"use client";

import { useToast } from "./use-toast";

export function Toaster() {
  const { toasts } = useToast();

  return (
    <div className="fixed bottom-4 right-4 space-y-3 z-50">
      {toasts.map((toast) => (
        <div key={toast.id}>
          <div className="bg-background border p-4 rounded-md shadow">
            {toast.title && <p className="font-semibold">{toast.title}</p>}
            {toast.description && <p className="text-sm text-muted-foreground">{toast.description}</p>}
            {toast.action && <div className="mt-2">{toast.action}</div>}
          </div>
        </div>
      ))}
    </div>
  );
}
