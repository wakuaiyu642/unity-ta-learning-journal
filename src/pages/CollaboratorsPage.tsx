import {
  Database,
  Download,
  KeyRound,
  LoaderCircle,
  LockKeyhole,
  MailPlus,
  RefreshCcw,
  ShieldCheck,
  Trash2,
  UserRoundCog
} from "lucide-react";
import { type FormEvent, useEffect, useState } from "react";
import { useApp } from "../context/AppContext";
import type { PlanMember, PlanRole } from "../types";
import { cloudConfigured } from "../lib/config";
import { Button, FieldLabel, PageHeader, Select, TextInput } from "../components/UI";

function downloadJson(bundle: unknown, planSlug: string) {
  const blob = new Blob([JSON.stringify(bundle, null, 2)], {
    type: "application/json"
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${planSlug}-backup-${new Date().toISOString().slice(0, 10)}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function CollaboratorsPage() {
  const {
    bundle,
    canEdit,
    cloudMode,
    role,
    demoEditing,
    setDemoEditing,
    listCollaborators,
    inviteCollaborator,
    revokeCollaborator,
    changePassword,
    resetDemo
  } = useApp();
  const [members, setMembers] = useState<PlanMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [email, setEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<PlanRole>("editor");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState("");

  useEffect(() => {
    if (!cloudMode || role !== "owner") return;
    setLoadingMembers(true);
    listCollaborators()
      .then(setMembers)
      .catch((nextError: unknown) =>
        setError(
          nextError instanceof Error ? nextError.message : "协作者加载失败"
        )
      )
      .finally(() => setLoadingMembers(false));
  }, [cloudMode, listCollaborators, role]);

  if (!bundle) return null;

  const invite = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const member = await inviteCollaborator(email.trim(), inviteRole);
      setMembers((current) => [
        member,
        ...current.filter((item) => item.userId !== member.userId)
      ]);
      setEmail("");
      setMessage("邀请已发送，权限会在对方登录后生效。");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "邀请失败");
    } finally {
      setBusy(false);
    }
  };

  const revoke = async (member: PlanMember) => {
    if (!window.confirm(`确定撤销 ${member.email ?? member.displayName ?? "该用户"} 的编辑权限吗？`)) {
      return;
    }
    setError("");
    try {
      await revokeCollaborator(member.userId);
      setMembers((current) =>
        current.filter((item) => item.userId !== member.userId)
      );
      setMessage("权限已撤销。");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "撤销失败");
    }
  };

  const updatePassword = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setPasswordMessage("");
    if (newPassword.length < 10) {
      setError("密码至少需要 10 个字符。");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("两次输入的密码不一致。");
      return;
    }
    setPasswordBusy(true);
    try {
      await changePassword(newPassword);
      setNewPassword("");
      setConfirmPassword("");
      setPasswordMessage("登录密码已更新，下次登录请使用新密码。");
    } catch (nextError) {
      setError(
        nextError instanceof Error ? nextError.message : "密码修改失败。"
      );
    } finally {
      setPasswordBusy(false);
    }
  };

  return (
    <div>
      <PageHeader
        eyebrow="所有者设置"
        title="协作者与数据"
        description="公开访问者可以查看但不能修改。只有所有者和被邀请的编辑者可以写入这份学习计划。"
      />

      {!cloudMode && (
        <section className="settings-hero local-settings-hero">
          <div>
            <span className="settings-icon">
              <Database size={24} />
            </span>
            <p className="eyebrow">本地演示模式</p>
            <h2>先完整体验，再接入云端</h2>
            <p>
              当前没有 Supabase 环境变量，计划、打卡和附件只保存在这个浏览器。配置云端后，同一套界面会自动切换为邮箱登录、跨设备同步和协作者权限。
            </p>
          </div>
          <div className="settings-actions">
            <button
              className="button button-primary"
              onClick={() => setDemoEditing(!demoEditing)}
            >
              <UserRoundCog size={18} />
              {demoEditing ? "退出演示编辑" : "开启演示编辑"}
            </button>
            <button
              className="button button-secondary"
              onClick={() => downloadJson(bundle, bundle.plan.slug)}
            >
              <Download size={18} />
              导出 JSON
            </button>
          </div>
        </section>
      )}

      {cloudMode && canEdit && (
        <section className="settings-hero">
          <div>
            <span className="settings-icon">
              <ShieldCheck size={24} />
            </span>
            <p className="eyebrow">
              {role === "owner" ? "所有者权限" : "编辑者权限"}
            </p>
            <h2>
              {role === "owner" ? "你可以管理协作者" : "你可以更新学习记录"}
            </h2>
            <p>
              身份与写权限由 Supabase RLS 在数据库层校验。邮箱不会出现在公开接口中。
            </p>
          </div>
          <div className="settings-actions">
            <button
              className="button button-secondary"
              onClick={() => downloadJson(bundle, bundle.plan.slug)}
            >
              <Download size={18} />
              导出 JSON 备份
            </button>
          </div>
        </section>
      )}

      {cloudMode && role === "owner" && (
        <div className="settings-grid">
          <section className="panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">邀请编辑者</p>
                <h2>增加协作者</h2>
              </div>
              <MailPlus size={21} />
            </div>
            <form className="stack-form" onSubmit={invite}>
              <label className="field">
                <FieldLabel>邮箱</FieldLabel>
                <TextInput
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="collaborator@example.com"
                  required
                />
              </label>
              <label className="field">
                <FieldLabel>权限</FieldLabel>
                <Select
                  value={inviteRole}
                  onChange={(event) =>
                    setInviteRole(event.target.value as PlanRole)
                  }
                >
                  <option value="editor">编辑者 · 可修改计划与打卡</option>
                  <option value="viewer">查看者 · 仅记录身份权限</option>
                </Select>
              </label>
              <Button disabled={busy}>
                {busy ? (
                  <LoaderCircle className="spin" size={17} />
                ) : (
                  <MailPlus size={17} />
                )}
                发送邀请
              </Button>
            </form>
            {message && <p className="success-message">{message}</p>}
            {error && <p className="form-error">{error}</p>}
          </section>

          <section className="panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">当前成员</p>
                <h2>权限列表</h2>
              </div>
              <span className="quiet-pill">{members.length} 人</span>
            </div>
            {loadingMembers ? (
              <div className="center-inline">
                <LoaderCircle className="spin" size={22} />
              </div>
            ) : (
              <div className="member-list">
                {members.map((member) => (
                  <div className="member-item" key={member.userId}>
                    <span className="account-avatar">
                      {(member.displayName ?? member.email ?? "U")
                        .slice(0, 1)
                        .toUpperCase()}
                    </span>
                    <div>
                      <strong>{member.displayName ?? "未命名成员"}</strong>
                      <small>{member.email}</small>
                    </div>
                    <span className={`role-pill role-${member.role}`}>
                      {member.role === "owner"
                        ? "所有者"
                        : member.role === "editor"
                          ? "编辑者"
                          : "查看者"}
                    </span>
                    {member.role !== "owner" && (
                      <button
                        className="icon-button danger-icon"
                        onClick={() => void revoke(member)}
                        aria-label="撤销权限"
                      >
                        <Trash2 size={17} />
                      </button>
                    )}
                  </div>
                ))}
                {!members.length && (
                  <p className="quiet-empty-text">
                    还没有读取到协作者。确认 Edge Function 已部署。
                  </p>
                )}
              </div>
            )}
          </section>
        </div>
      )}

      {cloudMode && canEdit && (
        <section className="panel password-settings-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">账号安全</p>
              <h2>修改登录密码</h2>
            </div>
            <KeyRound size={21} />
          </div>
          <form className="stack-form password-form" onSubmit={updatePassword}>
            <label className="field">
              <FieldLabel hint="至少 10 个字符">新密码</FieldLabel>
              <TextInput
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                autoComplete="new-password"
                required
              />
            </label>
            <label className="field">
              <FieldLabel>再次输入</FieldLabel>
              <TextInput
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                autoComplete="new-password"
                required
              />
            </label>
            <Button disabled={passwordBusy}>
              {passwordBusy ? (
                <LoaderCircle className="spin" size={17} />
              ) : (
                <KeyRound size={17} />
              )}
              更新密码
            </Button>
            {passwordMessage && (
              <p className="success-message">{passwordMessage}</p>
            )}
          </form>
        </section>
      )}

      {cloudMode && !canEdit && (
        <section className="locked-settings">
          <LockKeyhole size={30} />
          <h2>当前账号没有编辑权限</h2>
          <p>
            你可以继续查看公开学习记录。所有者需要先在 Supabase 中完成账号绑定或邀请。
          </p>
          <code>npm run seed:supabase -- --owner-email=你的邮箱</code>
        </section>
      )}

      <section className="settings-notes">
        <div>
          <KeyRound size={20} />
          <h3>安全边界</h3>
          <p>
            匿名用户只能读，所有写操作在数据库层验证所有者或编辑者身份。服务端密钥只存在于 Edge Function 环境变量。
          </p>
        </div>
        <div>
          <RefreshCcw size={20} />
          <h3>数据同步</h3>
          <p>
            云端模式使用 Supabase Realtime 监听计划变化，电脑或手机保存后，另一台在线设备会自动刷新。
          </p>
        </div>
        <div>
          <Database size={20} />
          <h3>可迁移</h3>
          <p>
            计划内容使用通用结构和 JSON 备份，不锁死在 Unity
            TA。后续可以增加阅读、审美等并行计划。
          </p>
        </div>
      </section>

      {!cloudMode && canEdit && (
        <button
          className="danger-outline-button"
          onClick={() => {
            if (window.confirm("会清除本浏览器中的打卡、复盘和作品编辑，恢复规划表原始内容。确定吗？")) {
              resetDemo();
              setMessage("本地演示数据已恢复。");
            }
          }}
        >
          恢复本地演示数据
        </button>
      )}
    </div>
  );
}
