import * as React from "react"

import {
  Toast, ToastClose, ToastDescription, ToastProvider, ToastTitle, ToastViewport,
} from "@/components/ui/toast"

type ToastData = {
  id: string;
  title?: string;
  description?: string;
  variant?: "default" | "destructive" | "success";
}

const TOAST_LIMIT = 3;
let count = 0;
function genId() { return String(++count); }

type Action =
  | { type: "ADD_TOAST"; toast: ToastData }
  | { type: "DISMISS_TOAST"; toastId: string }
  | { type: "REMOVE_TOAST"; toastId: string }

let listeners: Array<(state: ToastData[]) => void> = [];
let memoryState: ToastData[] = [];

function dispatch(action: Action) {
  switch (action.type) {
    case "ADD_TOAST":
      memoryState = [action.toast, ...memoryState].slice(0, TOAST_LIMIT);
      break;
    case "DISMISS_TOAST":
      memoryState = memoryState.filter((t) => t.id !== action.toastId);
      break;
    case "REMOVE_TOAST":
      memoryState = memoryState.filter((t) => t.id !== action.toastId);
      break;
  }
  listeners.forEach((l) => l([...memoryState]));
}

export function toast(props: Omit<ToastData, "id">) {
  const id = genId();
  dispatch({ type: "ADD_TOAST", toast: { ...props, id } });
  setTimeout(() => dispatch({ type: "REMOVE_TOAST", toastId: id }), 3000);
  return id;
}

function useToast() {
  const [state, setState] = React.useState<ToastData[]>(memoryState);

  React.useEffect(() => {
    listeners.push(setState);
    return () => {
      listeners = listeners.filter((l) => l !== setState);
    };
  }, []);

  return { toasts: state, dismiss: (id: string) => dispatch({ type: "DISMISS_TOAST", toastId: id }) };
}

export function Toaster() {
  const { toasts, dismiss } = useToast();

  return (
    <ToastProvider>
      {toasts.map(({ id, title, description, variant }) => (
        <Toast key={id} variant={variant} onOpenChange={(open) => { if (!open) dismiss(id); }}>
          <div className="grid gap-1">
            {title && <ToastTitle>{title}</ToastTitle>}
            {description && <ToastDescription>{description}</ToastDescription>}
          </div>
          <ToastClose />
        </Toast>
      ))}
      <ToastViewport />
    </ToastProvider>
  );
}
