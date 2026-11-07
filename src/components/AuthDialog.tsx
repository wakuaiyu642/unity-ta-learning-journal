import { type FormEvent, useEffect, useState } from "react";
import { LockKeyhole, X } from "lucide-react";
import { useApp } from "../context/AppContext";
import { Spinner } from "./Feedback";

interface AuthDialogProps {
  open: boolean;
  onClose: () => void;
}

export function AuthDialog({ open, onClose }: AuthDialogProps) {
  const { session, signInWithPassword } = useApp();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open && session) onClose();
  }, [onClose, open, session]);

  if (!open) return null;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setIsBusy(true);
    try {
      await signInWithPassword(email.trim(), password);
      setPassword("");
      onClose();
    } catch (nextError) {
      setError(
        nextError instanceof Error ? nextError.message : "邮箱或密码不正确。"
      );
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="modal auth-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button
          className="icon-button modal-close"
          type="button"
          onClick={onClose}
          aria-label="关闭登录窗口"
        >
          <X size={20} />
        </button>

        <span className="modal-mark">
          <LockKeyhole size={22} />
        </span>
        <p className="eyebrow">所有者 / 协作者</p>
        <h2 id="auth-title">登录后编辑计划</h2>
        <p className="modal-copy">
          访问者无需登录即可查看。输入账号邮箱和密码后即可管理学习记录。
        </p>

        <form className="stack-form" onSubmit={submit}>
          <label className="field">
            <span>邮箱</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              required
              autoFocus
            />
          </label>
          <label className="field">
            <span>密码</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="输入密码"
              autoComplete="current-password"
              required
            />
          </label>
          <button className="button button-primary" disabled={isBusy}>
            {isBusy ? <Spinner label="正在登录" /> : "登录"}
          </button>
        </form>

        {error && <p className="form-error">{error}</p>}
      </section>
    </div>
  );
}
