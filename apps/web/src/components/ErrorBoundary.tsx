import { Component, type ReactNode, type ErrorInfo } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary] Uncaught error:", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 p-8 text-center">
          <div className="text-4xl">⚠️</div>
          <h2 className="text-xl font-semibold text-[#031E43]">Algo salió mal</h2>
          <p className="text-sm text-[#3B506D] max-w-sm">
            Ocurrió un error inesperado. Recargá la página para continuar.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 text-sm bg-[#031E43] text-[#FDFDFB] rounded-lg hover:bg-[#0d2b52] transition-colors"
          >
            Recargar página
          </button>
          {import.meta.env.DEV && this.state.error && (
            <pre className="mt-4 text-left text-xs bg-[#DDDFE2]/40 p-3 rounded max-w-lg overflow-auto text-red-600">
              {this.state.error.message}
            </pre>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
