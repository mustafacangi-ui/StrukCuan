import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  retryKey: number;
}

export class EarnErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, retryKey: 0 };
  }

  static getDerivedStateFromError(): Partial<State> {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error("[Earn] Error boundary caught:", error);
  }

  handleRetry = () => {
    this.setState((s) => ({ hasError: false, retryKey: s.retryKey + 1 }));
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-purple-700 to-pink-600 px-4">
          <p className="text-white font-medium text-center">Bir hata oluştu.</p>
          <button
            type="button"
            onClick={this.handleRetry}
            className="mt-3 px-4 py-2 rounded-xl bg-white/20 text-white text-sm font-medium"
          >
            Yeniden dene
          </button>
        </div>
      );
    }
    return <div key={this.state.retryKey}>{this.props.children}</div>;
  }
}
