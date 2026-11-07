import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Session } from "@supabase/supabase-js";
import {
  cloudConfigured,
  DEMO_EDIT_KEY,
  PLAN_SLUG
} from "../lib/config";
import {
  deleteCloudAttachment,
  fetchPlanRole,
  inviteCloudCollaborator,
  listCloudCollaborators,
  loadCloudBundle,
  revokeCloudCollaborator,
  sendEmailOtp,
  signInWithEmailPassword,
  signOutCloud,
  updateCloudPortfolio,
  updateCloudTask,
  updateCloudWeek,
  uploadCloudAttachment,
  upsertCloudDailyLog,
  verifyEmailOtp
} from "../lib/supabase-data";
import { supabase } from "../lib/supabase";
import {
  loadCloudSnapshot,
  loadLocalBundle,
  resetLocalBundle,
  saveCloudSnapshot,
  saveLocalBundle
} from "../lib/local-store";
import {
  deleteLocalFile,
  saveLocalFile
} from "../lib/local-files";
import type {
  Attachment,
  DailyLogInput,
  PlanBundle,
  PlanMember,
  PlanRole,
  PortfolioPatch,
  TaskPatch,
  WeekPatch
} from "../types";
import { validateDailyLog, validatePortfolioPatch } from "../lib/validation";

interface AppContextValue {
  bundle: PlanBundle | null;
  isLoading: boolean;
  loadError: string | null;
  cloudMode: boolean;
  session: Session | null;
  role: PlanRole | null;
  canEdit: boolean;
  demoEditing: boolean;
  setDemoEditing: (enabled: boolean) => void;
  refresh: () => Promise<void>;
  updateWeek: (weekId: string, patch: WeekPatch) => Promise<void>;
  updateTask: (taskId: string, patch: TaskPatch) => Promise<void>;
  saveDailyLog: (weekId: string, input: DailyLogInput) => Promise<void>;
  uploadAttachment: (weekId: string, file: File) => Promise<void>;
  deleteAttachment: (attachment: Attachment) => Promise<void>;
  updatePortfolio: (itemId: string, patch: PortfolioPatch) => Promise<void>;
  sendOtp: (email: string) => Promise<void>;
  signInWithPassword: (email: string, password: string) => Promise<void>;
  verifyOtp: (email: string, token: string) => Promise<void>;
  signOut: () => Promise<void>;
  listCollaborators: () => Promise<PlanMember[]>;
  inviteCollaborator: (
    email: string,
    role: PlanRole
  ) => Promise<PlanMember>;
  revokeCollaborator: (userId: string) => Promise<void>;
  resetDemo: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

export function AppProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [demoEditing, setDemoEditingState] = useState(() => {
    if (cloudConfigured || typeof window === "undefined") return false;
    return window.localStorage.getItem(DEMO_EDIT_KEY) === "1";
  });

  const planQuery = useQuery({
    queryKey: ["plan", PLAN_SLUG],
    queryFn: async () => {
      if (!cloudConfigured) return loadLocalBundle();
      try {
        const next = await loadCloudBundle(PLAN_SLUG);
        saveCloudSnapshot(next);
        return next;
      } catch (error) {
        const cached = loadCloudSnapshot();
        if (cached) return cached;
        throw error;
      }
    },
    staleTime: cloudConfigured ? 15_000 : Infinity,
    retry: cloudConfigured ? 2 : 0
  });

  const bundle = planQuery.data ?? null;

  const roleQuery = useQuery({
    queryKey: ["plan-role", bundle?.plan.id, session?.user.id],
    queryFn: () => fetchPlanRole(bundle!.plan.id),
    enabled: cloudConfigured && Boolean(bundle && session),
    staleTime: 30_000
  });

  useEffect(() => {
    const client = supabase;
    if (!client) return;
    void client.auth.getSession().then(({ data }) => {
      setSession(data.session);
    });
    const { data } = client.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      void queryClient.invalidateQueries({ queryKey: ["plan-role"] });
      void queryClient.invalidateQueries({ queryKey: ["plan", PLAN_SLUG] });
    });
    return () => data.subscription.unsubscribe();
  }, [queryClient]);

  useEffect(() => {
    const client = supabase;
    if (!client || !bundle) return;
    const channel = client
      .channel(`plan-changes-${bundle.plan.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "plan_weeks",
          filter: `plan_id=eq.${bundle.plan.id}`
        },
        () => {
          void queryClient.invalidateQueries({ queryKey: ["plan", PLAN_SLUG] });
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "plan_week_tasks" },
        () => {
          void queryClient.invalidateQueries({ queryKey: ["plan", PLAN_SLUG] });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "daily_logs",
          filter: `plan_id=eq.${bundle.plan.id}`
        },
        () => {
          void queryClient.invalidateQueries({ queryKey: ["plan", PLAN_SLUG] });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "attachments",
          filter: `plan_id=eq.${bundle.plan.id}`
        },
        () => {
          void queryClient.invalidateQueries({ queryKey: ["plan", PLAN_SLUG] });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "portfolio_items",
          filter: `plan_id=eq.${bundle.plan.id}`
        },
        () => {
          void queryClient.invalidateQueries({ queryKey: ["plan", PLAN_SLUG] });
        }
      )
      .subscribe();

    return () => {
      void client.removeChannel(channel);
    };
  }, [bundle?.plan.id, queryClient]);

  const refresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ["plan", PLAN_SLUG] });
  }, [queryClient]);

  const mutateLocal = useCallback(
    (updater: (current: PlanBundle) => PlanBundle) => {
      queryClient.setQueryData<PlanBundle>(["plan", PLAN_SLUG], (current) => {
        if (!current) return current;
        const next = updater(current);
        saveLocalBundle(next);
        return next;
      });
    },
    [queryClient]
  );

  const setDemoEditing = useCallback((enabled: boolean) => {
    setDemoEditingState(enabled);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(DEMO_EDIT_KEY, enabled ? "1" : "0");
    }
  }, []);

  const updateWeek = useCallback(
    async (weekId: string, patch: WeekPatch) => {
      if (cloudConfigured) {
        await updateCloudWeek(weekId, patch);
        await refresh();
        return;
      }
      mutateLocal((current) => ({
        ...current,
        weeks: current.weeks.map((week) =>
          week.id === weekId
            ? {
                ...week,
                ...patch,
                updatedAt: new Date().toISOString()
              }
            : week
        )
      }));
    },
    [mutateLocal, refresh]
  );

  const updateTask = useCallback(
    async (taskId: string, patch: TaskPatch) => {
      if (cloudConfigured) {
        await updateCloudTask(taskId, patch.content);
        await refresh();
        return;
      }
      mutateLocal((current) => ({
        ...current,
        weeks: current.weeks.map((week) => ({
          ...week,
          tasks: week.tasks.map((task) =>
            task.id === taskId
              ? { ...task, content: patch.content }
              : task
          )
        }))
      }));
    },
    [mutateLocal, refresh]
  );

  const saveDailyLog = useCallback(
    async (weekId: string, input: DailyLogInput) => {
      const validInput = validateDailyLog(input);
      if (cloudConfigured) {
        const authorName =
          session?.user.user_metadata.display_name ??
          session?.user.email?.split("@")[0] ??
          "学习者";
        await upsertCloudDailyLog(
          bundle!.plan.id,
          weekId,
          validInput,
          authorName
        );
        await refresh();
        return;
      }

      mutateLocal((current) => {
        const existing = current.dailyLogs.find(
          (log) =>
            log.weekId === weekId &&
            log.logDate === validInput.logDate &&
            log.userId === "local-demo"
        );
        const nextLog = {
          id: existing?.id ?? crypto.randomUUID(),
          planId: current.plan.id,
          weekId,
          userId: "local-demo",
          logDate: validInput.logDate,
          minutes: validInput.minutes,
          note: validInput.note,
          authorName: "本地访客",
          createdAt: existing?.createdAt ?? new Date().toISOString()
        };
        return {
          ...current,
          dailyLogs: existing
            ? current.dailyLogs.map((log) =>
                log.id === existing.id ? nextLog : log
              )
            : [...current.dailyLogs, nextLog]
        };
      });
    },
    [bundle?.plan.id, mutateLocal, refresh, session?.user]
  );

  const uploadAttachment = useCallback(
    async (weekId: string, file: File) => {
      if (cloudConfigured) {
        await uploadCloudAttachment(bundle!.plan.id, weekId, file);
        await refresh();
        return;
      }
      const id = crypto.randomUUID();
      const storagePath = `local/${id}`;
      await saveLocalFile(storagePath, file);
      mutateLocal((current) => ({
        ...current,
        attachments: [
          {
            id,
            planId: current.plan.id,
            weekId,
            storagePath,
            fileName: file.name,
            mimeType: file.type,
            sizeBytes: file.size,
            uploadedBy: "local-demo",
            url: null,
            createdAt: new Date().toISOString()
          },
          ...current.attachments
        ]
      }));
    },
    [bundle?.plan.id, mutateLocal, refresh]
  );

  const deleteAttachment = useCallback(
    async (attachment: Attachment) => {
      if (cloudConfigured) {
        await deleteCloudAttachment(attachment);
        await refresh();
        return;
      }
      await deleteLocalFile(attachment.storagePath);
      mutateLocal((current) => ({
        ...current,
        attachments: current.attachments.filter(
          (item) => item.id !== attachment.id
        )
      }));
    },
    [mutateLocal, refresh]
  );

  const updatePortfolio = useCallback(
    async (itemId: string, patch: PortfolioPatch) => {
      const validPatch = validatePortfolioPatch(patch);
      if (cloudConfigured) {
        await updateCloudPortfolio(itemId, validPatch);
        await refresh();
        return;
      }
      mutateLocal((current) => ({
        ...current,
        portfolio: current.portfolio.map((item) =>
          item.id === itemId ? { ...item, ...validPatch } : item
        )
      }));
    },
    [mutateLocal, refresh]
  );

  const sendOtp = useCallback(async (email: string) => {
    await sendEmailOtp(email);
  }, []);

  const signInWithPassword = useCallback(
    async (email: string, password: string) => {
      await signInWithEmailPassword(email, password);
      await queryClient.invalidateQueries({ queryKey: ["plan-role"] });
      await queryClient.invalidateQueries({ queryKey: ["plan", PLAN_SLUG] });
    },
    [queryClient]
  );

  const verifyOtp = useCallback(
    async (email: string, token: string) => {
      await verifyEmailOtp(email, token);
      await queryClient.invalidateQueries({ queryKey: ["plan-role"] });
    },
    [queryClient]
  );

  const signOut = useCallback(async () => {
    await signOutCloud();
    await refresh();
  }, [refresh]);

  const listCollaborators = useCallback(async () => {
    if (!cloudConfigured || !bundle) return [];
    return listCloudCollaborators(bundle.plan.id);
  }, [bundle]);

  const inviteCollaborator = useCallback(
    async (email: string, role: PlanRole) => {
      return inviteCloudCollaborator(bundle!.plan.id, email, role);
    },
    [bundle]
  );

  const revokeCollaborator = useCallback(
    async (userId: string) => {
      await revokeCloudCollaborator(bundle!.plan.id, userId);
    },
    [bundle]
  );

  const resetDemo = useCallback(() => {
    const next = resetLocalBundle();
    queryClient.setQueryData(["plan", PLAN_SLUG], next);
  }, [queryClient]);

  const role = cloudConfigured ? roleQuery.data ?? null : null;
  const canEdit = cloudConfigured
    ? role === "owner" || role === "editor"
    : demoEditing;
  const loadError = planQuery.error ? errorMessage(planQuery.error) : null;

  const value = useMemo<AppContextValue>(
    () => ({
      bundle,
      isLoading: planQuery.isLoading,
      loadError,
      cloudMode: cloudConfigured,
      session,
      role,
      canEdit,
      demoEditing,
      setDemoEditing,
      refresh,
      updateWeek,
      updateTask,
      saveDailyLog,
      uploadAttachment,
      deleteAttachment,
      updatePortfolio,
      sendOtp,
      signInWithPassword,
      verifyOtp,
      signOut,
      listCollaborators,
      inviteCollaborator,
      revokeCollaborator,
      resetDemo
    }),
    [
      bundle,
      canEdit,
      demoEditing,
      inviteCollaborator,
      listCollaborators,
      loadError,
      planQuery.isLoading,
      refresh,
      resetDemo,
      revokeCollaborator,
      role,
      saveDailyLog,
      sendOtp,
      session,
      setDemoEditing,
      signInWithPassword,
      signOut,
      updatePortfolio,
      updateTask,
      updateWeek,
      uploadAttachment,
      deleteAttachment,
      verifyOtp
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used inside AppProvider");
  return context;
}
