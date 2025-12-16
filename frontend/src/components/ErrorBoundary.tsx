import React from 'react';

interface Props {
  children: React.ReactNode;
  componentName?: string;
}

interface State {
  hasError: boolean;
  error?: Error | null;
  info?: { componentStack?: string } | null;
}

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, info: null };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    this.setState({ hasError: true, error, info });
    try {
      // Log structured details for remote debugging (kept to console for local reproduction)
      console.error(`ErrorBoundary caught error in ${this.props.componentName || 'component'}`);
      console.error('Error object:', error);
      console.error('Component stack:', info.componentStack);
      // If available, attempt to expose to window for capture scripts
      try {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        window.__LAST_REACT_ERROR__ = { error: String(error), stack: info.componentStack };
      } catch (e) {
        // ignore
      }
    } catch (e) {
      // ignore logging errors
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div role="alert" className="p-6">
          <h2 className="text-lg font-medium text-red-700">Ocorreu um erro ao renderizar esta página.</h2>
          <p className="text-sm text-gray-600 mt-2">Verifique o console para detalhes (ErrorBoundary).</p>
        </div>
      );
    }
    return this.props.children as JSX.Element;
  }
}
