import { type FormEvent, useRef, useState } from "react";
import {
  ArrowLeft,
  FileText,
  LoaderCircle,
  Plus,
  Save,
  Trash2,
  Upload
} from "lucide-react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import {
  Button,
  FieldLabel,
  PageHeader,
  Select,
  TextArea,
  TextInput
} from "../components/UI";
import { useApp } from "../context/AppContext";
import { FullPageLoading } from "../components/Feedback";
import { useDocumentMeta } from "../lib/meta";
import { skillLevelOptions } from "../lib/utils";
import type { ProfileSkill } from "../types";

export function ProfileEditorPage() {
  const { bundle, canEdit, cloudMode, role, session } = useApp();
  if (!bundle) return null;
  const base = `/plans/${bundle.plan.slug}`;
  // 云端直链刷新时先等 role 查询返回，避免误把所有者弹回首页。
  if (cloudMode && session && !role) return <FullPageLoading />;
  if (!canEdit) return <Navigate to={base} replace />;
  return <ProfileEditorContent base={base} />;
}

function ProfileEditorContent({ base }: { base: string }) {
  const { bundle, cloudMode, saveProfile, uploadProfileAsset } = useApp();
  const navigate = useNavigate();
  const avatarInput = useRef<HTMLInputElement>(null);
  const resumeInput = useRef<HTMLInputElement>(null);
  const profile = bundle!.profile;

  const [displayName, setDisplayName] = useState(profile.displayName);
  const [headline, setHeadline] = useState(profile.headline);
  const [avatarUrl, setAvatarUrl] = useState(profile.avatarUrl);
  const [location, setLocation] = useState(profile.location);
  const [school, setSchool] = useState(profile.school);
  const [major, setMajor] = useState(profile.major);
  const [degree, setDegree] = useState(profile.degree);
  const [grade, setGrade] = useState(profile.grade);
  const [graduationYear, setGraduationYear] = useState(
    profile.graduationYear === null ? "" : String(profile.graduationYear)
  );
  const [targetRole, setTargetRole] = useState(profile.targetRole);
  const [targetCompanies, setTargetCompanies] = useState(
    profile.targetCompanies
  );
  const [bio, setBio] = useState(profile.bio);
  const [selfPositioning, setSelfPositioning] = useState(
    profile.selfPositioning
  );
  const [honestyNote, setHonestyNote] = useState(profile.honestyNote);
  const [skills, setSkills] = useState<ProfileSkill[]>(profile.skills);
  const [highlightsText, setHighlightsText] = useState(
    profile.highlights.join("\n")
  );
  const [githubUrl, setGithubUrl] = useState(profile.links.githubUrl);
  const [email, setEmail] = useState(profile.links.email);
  const [websiteUrl, setWebsiteUrl] = useState(profile.links.websiteUrl);
  const [resumeUrl, setResumeUrl] = useState(profile.links.resumeUrl);
  const [showEmail, setShowEmail] = useState(profile.links.showEmail);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState<"avatar" | "resume" | null>(null);
  const [error, setError] = useState("");

  useDocumentMeta(`编辑个人资料 · 成长管线`, "编辑个人主页资料");

  const updateSkill = (index: number, patch: Partial<ProfileSkill>) => {
    setSkills((current) =>
      current.map((skill, i) => (i === index ? { ...skill, ...patch } : skill))
    );
  };

  const onAvatarFile = async (file: File) => {
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      setError("头像仅支持 PNG / JPG / WebP。");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError("头像不能超过 2MB。");
      return;
    }
    setUploading("avatar");
    setError("");
    try {
      const url = await uploadProfileAsset("avatar", file);
      setAvatarUrl(url);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "头像上传失败");
    } finally {
      setUploading(null);
    }
  };

  const onResumeFile = async (file: File) => {
    if (file.type !== "application/pdf") {
      setError("简历仅支持 PDF。");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("简历不能超过 10MB。");
      return;
    }
    setUploading("resume");
    setError("");
    try {
      const url = await uploadProfileAsset("resume", file);
      setResumeUrl(url);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "简历上传失败");
    } finally {
      setUploading(null);
    }
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await saveProfile({
        displayName: displayName.trim(),
        headline: headline.trim(),
        avatarUrl,
        location: location.trim(),
        school: school.trim(),
        major: major.trim(),
        degree: degree.trim(),
        grade: grade.trim(),
        graduationYear: graduationYear.trim() ? Number(graduationYear) : null,
        targetRole: targetRole.trim(),
        targetCompanies: targetCompanies.trim(),
        bio: bio.trim(),
        selfPositioning: selfPositioning.trim(),
        honestyNote: honestyNote.trim(),
        skills: skills.map((skill) => ({
          name: skill.name.trim(),
          level: skill.level,
          note: skill.note.trim()
        })),
        highlights: highlightsText
          .split("\n")
          .map((value) => value.trim())
          .filter(Boolean),
        links: {
          githubUrl: githubUrl.trim(),
          // 不公开就不把邮箱写进云端公开行，避免被匿名读取。
          email: showEmail ? email.trim() : "",
          resumeUrl,
          websiteUrl: websiteUrl.trim(),
          showEmail
        }
      });
      navigate(base);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "保存失败");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="profile-editor">
      <PageHeader
        eyebrow="个人主页"
        title="编辑个人资料"
        description="这些内容会公开显示在首页，请只填写你愿意让面试官看到的信息。"
        actions={
          <Link to={base} className="button button-secondary">
            <ArrowLeft size={16} /> 返回主页
          </Link>
        }
      />

      <form className="stack-form" onSubmit={submit}>
        <section className="panel form-section">
          <h2>基本资料</h2>
          <div className="profile-avatar-row">
            <div className="profile-avatar-preview">
              {avatarUrl ? (
                <img src={avatarUrl} alt="头像预览" />
              ) : (
                <span>{displayName.slice(0, 1) || "TA"}</span>
              )}
            </div>
            <div>
              <FieldLabel hint="PNG / JPG / WebP，≤2MB">
                头像
              </FieldLabel>
              <div className="form-actions">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={uploading === "avatar"}
                  onClick={() => avatarInput.current?.click()}
                >
                  {uploading === "avatar" ? (
                    <LoaderCircle className="spin" size={16} />
                  ) : (
                    <Upload size={16} />
                  )}
                  上传头像
                </Button>
                {avatarUrl && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setAvatarUrl("")}
                  >
                    <Trash2 size={16} /> 移除
                  </Button>
                )}
              </div>
              <input
                ref={avatarInput}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                hidden
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void onAvatarFile(file);
                  event.target.value = "";
                }}
              />
            </div>
          </div>
          <div className="form-grid">
            <label className="field">
              <FieldLabel hint="公开显示的名字">显示名称</FieldLabel>
              <TextInput
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                maxLength={40}
                required
              />
            </label>
            <label className="field">
              <FieldLabel hint="一句话定位">标题</FieldLabel>
              <TextInput
                value={headline}
                onChange={(event) => setHeadline(event.target.value)}
                maxLength={120}
              />
            </label>
          </div>
          <div className="form-grid">
            <label className="field">
              <FieldLabel>学校</FieldLabel>
              <TextInput
                value={school}
                onChange={(event) => setSchool(event.target.value)}
                maxLength={120}
              />
            </label>
            <label className="field">
              <FieldLabel>专业</FieldLabel>
              <TextInput
                value={major}
                onChange={(event) => setMajor(event.target.value)}
                maxLength={120}
              />
            </label>
          </div>
          <div className="form-grid three">
            <label className="field">
              <FieldLabel>学历</FieldLabel>
              <TextInput
                value={degree}
                onChange={(event) => setDegree(event.target.value)}
                maxLength={40}
              />
            </label>
            <label className="field">
              <FieldLabel>年级</FieldLabel>
              <TextInput
                value={grade}
                onChange={(event) => setGrade(event.target.value)}
                maxLength={40}
              />
            </label>
            <label className="field">
              <FieldLabel>毕业年份</FieldLabel>
              <TextInput
                type="number"
                value={graduationYear}
                onChange={(event) => setGraduationYear(event.target.value)}
                min={2000}
                max={2100}
              />
            </label>
          </div>
          <div className="form-grid">
            <label className="field">
              <FieldLabel>所在城市</FieldLabel>
              <TextInput
                value={location}
                onChange={(event) => setLocation(event.target.value)}
                maxLength={80}
              />
            </label>
            <label className="field">
              <FieldLabel>目标岗位</FieldLabel>
              <TextInput
                value={targetRole}
                onChange={(event) => setTargetRole(event.target.value)}
                maxLength={120}
              />
            </label>
          </div>
          <label className="field">
            <FieldLabel hint="可选">目标公司 / 团队</FieldLabel>
            <TextInput
              value={targetCompanies}
              onChange={(event) => setTargetCompanies(event.target.value)}
              maxLength={200}
            />
          </label>
        </section>

        <section className="panel form-section">
          <h2>介绍与自我定位</h2>
          <label className="field">
            <FieldLabel hint="≤2000 字">个人简介</FieldLabel>
            <TextArea
              value={bio}
              onChange={(event) => setBio(event.target.value)}
              rows={4}
              maxLength={2000}
            />
          </label>
          <label className="field">
            <FieldLabel hint="诚实说明当前水平，不夸大">
              自我定位
            </FieldLabel>
            <TextArea
              value={selfPositioning}
              onChange={(event) => setSelfPositioning(event.target.value)}
              rows={4}
              maxLength={1200}
            />
          </label>
          <label className="field">
            <FieldLabel hint="作品集会原样展示">能力标注说明</FieldLabel>
            <TextArea
              value={honestyNote}
              onChange={(event) => setHonestyNote(event.target.value)}
              rows={2}
              maxLength={800}
            />
          </label>
          <label className="field">
            <FieldLabel hint="每行一条">学习亮点</FieldLabel>
            <TextArea
              value={highlightsText}
              onChange={(event) => setHighlightsText(event.target.value)}
              rows={5}
            />
          </label>
        </section>

        <section className="panel form-section">
          <h2>联系方式</h2>
          <div className="form-grid">
            <label className="field">
              <FieldLabel>GitHub 链接</FieldLabel>
              <TextInput
                type="url"
                value={githubUrl}
                onChange={(event) => setGithubUrl(event.target.value)}
                placeholder="https://github.com/..."
              />
            </label>
            <label className="field">
              <FieldLabel>个人网站</FieldLabel>
              <TextInput
                type="url"
                value={websiteUrl}
                onChange={(event) => setWebsiteUrl(event.target.value)}
                placeholder="https://"
              />
            </label>
          </div>
          <div className="form-grid">
            <label className="field">
              <FieldLabel>邮箱</FieldLabel>
              <TextInput
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
              />
            </label>
            <label className="field">
              <FieldLabel hint={cloudMode ? "上传 PDF 或填链接" : "本地演示请填链接"}>
                简历
              </FieldLabel>
              <TextInput
                type="url"
                value={resumeUrl}
                onChange={(event) => setResumeUrl(event.target.value)}
                placeholder="https://"
              />
              <div className="form-actions">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={uploading === "resume"}
                  onClick={() => resumeInput.current?.click()}
                >
                  {uploading === "resume" ? (
                    <LoaderCircle className="spin" size={16} />
                  ) : (
                    <FileText size={16} />
                  )}
                  上传 PDF 简历
                </Button>
                <input
                  ref={resumeInput}
                  type="file"
                  accept="application/pdf"
                  hidden
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void onResumeFile(file);
                    event.target.value = "";
                  }}
                />
              </div>
            </label>
          </div>
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={showEmail}
              onChange={(event) => {
                setShowEmail(event.target.checked);
                if (!event.target.checked) setEmail("");
              }}
            />
            <span>
              <strong>在首页公开邮箱</strong>
              <small>只有勾选后，访客才能看到邮箱。</small>
            </span>
          </label>
        </section>

        <section className="panel form-section">
          <div className="panel-heading compact">
            <h2>能力自评</h2>
            <Button
              type="button"
              variant="secondary"
              onClick={() =>
                setSkills((current) => [
                  ...current,
                  { name: "", level: "aware", note: "" }
                ])
              }
            >
              <Plus size={16} /> 添加技能
            </Button>
          </div>
          <p className="quiet-copy">
            等级按“能否脱离教程独立复现”评定：了解 → 能跟做 → 能独立 → 能讲原理。
          </p>
          <div className="skill-editor-list">
            {skills.map((skill, index) => (
              <div className="skill-editor-row" key={`${skill.name}-${index}`}>
                <TextInput
                  value={skill.name}
                  onChange={(event) =>
                    updateSkill(index, { name: event.target.value })
                  }
                  placeholder="技能名称"
                  aria-label={`技能 ${index + 1} 名称`}
                  maxLength={60}
                />
                <Select
                  value={skill.level}
                  onChange={(event) =>
                    updateSkill(index, {
                      level: event.target.value as ProfileSkill["level"]
                    })
                  }
                  aria-label={`技能 ${index + 1} 等级`}
                >
                  {skillLevelOptions.map((option) => (
                    <option value={option.value} key={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
                <TextInput
                  value={skill.note}
                  onChange={(event) =>
                    updateSkill(index, { note: event.target.value })
                  }
                  placeholder="一句说明（能做到什么 / 还缺什么）"
                  aria-label={`技能 ${index + 1} 说明`}
                  maxLength={600}
                />
                <button
                  type="button"
                  className="icon-button"
                  aria-label={`删除技能 ${index + 1}`}
                  onClick={() =>
                    setSkills((current) =>
                      current.filter((_, i) => i !== index)
                    )
                  }
                >
                  <Trash2 size={17} />
                </button>
              </div>
            ))}
          </div>
        </section>

        {error && <p className="form-error">{error}</p>}

        <div className="form-actions form-actions-end">
          <Link to={base} className="button button-ghost">
            取消
          </Link>
          <Button disabled={busy}>
            {busy ? (
              <LoaderCircle className="spin" size={17} />
            ) : (
              <Save size={17} />
            )}
            保存资料
          </Button>
        </div>
      </form>
    </div>
  );
}
