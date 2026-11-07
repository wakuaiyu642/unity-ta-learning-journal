import { type FormEvent, useState } from "react";
import { KeyRound, Mail, X } from "lucide-react";
import { useApp } from "../context/AppContext";
import { Spinner } from "./Feedback";

interface AuthDialogProps {
  open: boolean;
  onClose: () => void;
}

export function AuthDialog({ open, onClose }: AuthDialogProps) {
  const { sendOtp, verifyOtp } = useApp();
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState("");

  if (!open) return null;

  const submitEmail = async (event: FormEvent) => {
    event.preventDefault();
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
          {step === "email" ? "登录后编辑计划" : "输入邮箱验证码"}
        </h2>
        <p className="modal-copy">
          {step === "email"
            ? "访问者无需登录即可查看。登录只用于修改进度、复盘和作品资料。"
            : `验证码已发送到 ${email}。如果邮件里是登录链接，也请把其中的数字验证码填在这里。`}
        </p>

        {step === "email" ? (
          <form className="stack-form" onSubmit={submitEmail}>
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
            <button className="button button-primary" disabled={isBusy}>
              {isBusy ? <Spinner label="正在发送" /> : "发送验证码"}
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
              换一个邮箱
            </button>
          </form>
        )}

        {error && <p className="form-error">{error}</p>}
      </section>
    </div>
  );
}
