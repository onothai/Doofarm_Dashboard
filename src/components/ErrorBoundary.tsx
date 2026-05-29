import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = { children: ReactNode };

type State = { error: Error | null };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Dashboard render error:", error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="setupGate">
          <h1>เกิดข้อผิดพลาด</h1>
          <p>{this.state.error.message}</p>
          <p className="loginHint">
            ลองรีเฟรชหน้า หรือตรวจสอบว่าเพิ่มโดเมน{" "}
            <code>onothai.github.io</code> ใน Firebase Console → Authentication →
            Authorized domains
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}
