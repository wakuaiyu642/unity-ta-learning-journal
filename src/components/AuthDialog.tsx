import { type FormEvent, useEffect, useState } from "react";
import { KeyRound, Mail, X } from "lucide-react";
import { useApp } from "../context/AppContext";
import { Spinner } from "./Feedback";

interface AuthDialogProps {
  open: boolean;
  onClose: () => void;
}

export function AuthDialog({ open, onClose }: AuthDialogProps) {
  const { session, sendOtp, signInWithPassword, verifyOtp } = useApp();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [token, setToken] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open && session) onClose();
  }, [onClose, open, session]);

  if (!open) return null;

  const submitPassword = async (event: FormEvent) => {
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

  const submitEmail = async (event?: FormEvent) => {
    event?.preventDefault();
    setError("");
    setIsBusy(true);
    try {
      await sendOtp(email.trim());
      setStep("code");
    } catch (nextError) {
      setError(
        nextError instanceof Error ? nextError.message : "验证码发送失败。"
      );
    } finally {
      setIsBusy(false);
    }
  };

  const submitCode = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setIsBusy(true);
    try {
      await verifyOtp(email.trim(), token.trim());
      onClose();
      setStep("email");
      setToken("");
    } catch (nextError) {
      setError(
        nextError instanceof Error ? nextError.message : "验证码校验失败。"
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
          {step === "email" ? <Mail size={22} /> : <KeyRound size={22} />}
        </span>
        <p className="eyebrow">所有者 / 协作者</p>
        <h2 id="auth-title">
          {step === "email" ? "登录后编辑计划" : "检查登录邮件"}
        </h2>
        <p className="modal-copy">
          {step === "email"
            ? "访问者无需登录即可查看。使用邮箱密码登录，或发送一次性登录邮件。"
            : `登录邮件已发送到 ${email}。请点击邮件里的登录链接；如果邮件同时显示数字验证码，也可以填在下方。`}
        </p>

        {step === "email" ? (
          <form className="stack-form" onSubmit={submitPassword}>
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
                placeholder="输入账号密码"
                autoComplete="current-password"
                required
              />
            </label>
            <button className="button button-primary" disabled={isBusy}>
              {isBusy ? <Spinner label="正在登录" /> : "密码登录"}
            </button>
            <button
              className="button button-secondary"
              type="button"
              disabled={isBusy || !email.includes("@")}
              onClick={() => void submitEmail()}
            >
              <Mail size={16} />
              改用一次性登录邮件
            </button>
          </form>
        ) : (
          <form className="stack-form" onSubmit={submitCode}>
            <label className="field">
              <span>一次性验证码</span>
              <input
                inputMode="numeric"
                value={token}
                onChange={(event) => setToken(event.target.value)}
                placeholder="输入邮件中的验证码"
                autoComplete="one-time-code"
                required
                autoFocus
              />
            </label>
            <button className="button button-primary" disabled={isBusy}>
              {isBusy ? <Spinner label="正在验证" /> : "完成登录"}
            </button>
            <button
              className="button button-ghost"
              type="button"
              onClick={() => setStep("email")}
            >
              返回密码登录
            </button>
          </form>
        )}

        {error && <p className="form-error">{error}</p>}
      </section>
    </div>
  );
}
