import * as React from "react";
import { cn } from "@/lib/utils";

export interface ToastProps {
  id: number;
  title?: string;
  description?: string;
  action?: React.ReactNode;
  variant?: "default" | "destructive";
}


export function Toast({ title, description, action, variant }: ToastProps) {
  return (
    <div
      className={cn(
        "p-4 rounded-lg shadow-md border flex justify-between space-x-2",
        variant === "destructive"
          ? "bg-red-50 border-red-400 text-red-700"
          : "bg-background border"
      )}
    >
      <div>
        {title && <p className="font-medium">{title}</p>}
        {description && <p className="text-sm opacity-75">{description}</p>}
      </div>
      {action}
    </div>
  );
}
