import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Result, Button } from 'antd';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in component:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '40px 24px', textAlign: 'center' }}>
          <Result
            status="error"
            title="页面内容加载异常"
            subTitle={this.state.error?.message || '组件渲染过程中发生了未知错误'}
            extra={[
              <Button
                type="primary"
                key="reload"
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                  window.location.reload();
                }}
              >
                刷新页面重试
              </Button>,
              <Button
                key="back"
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                  window.location.href = import.meta.env.BASE_URL || '/';
                }}
              >
                返回工作台首页
              </Button>,
            ]}
          />
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
