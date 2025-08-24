import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  static getDerivedStateFromError(error: Error): State {
    // Обновляем состояние, чтобы следующий рендер показал запасной UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Можно также логировать ошибку в сервис аналитики
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      // Вы можете отрендерить любой запасной UI
      return this.props.fallback || (
        <div className="p-6 bg-red-50 border border-red-200 rounded-lg text-red-600">
          <h2 className="text-lg font-bold mb-2">Что-то пошло не так</h2>
          <p className="mb-4">В компоненте произошла ошибка.</p>
          <details className="text-sm text-red-500 bg-red-100 p-2 rounded">
            <summary>Детали ошибки</summary>
            <p className="mt-2">{this.state.error?.toString()}</p>
          </details>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;