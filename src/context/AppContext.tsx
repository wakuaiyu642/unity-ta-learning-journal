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
  signInWithEmailPassword,
  signOutCloud,
  updateCloudMonth,
  updateCloudPassword,
  updateCloudPortfolio,
  uploadCloudAttachment,
  upsertCloudDailyLog,
  upsertCloudWeeklyReview
} from "../lib/supabase-data";
import { supabase } from "../lib/supabase";
import {
  loadCloudSnapshot,
  loadLocalBundle,
  resetLocalBundle,
  saveCloudSnapshot,
  saveLocalBundle
} from "../lib/local-store";
import { deleteLocalFile, saveLocalFile } from "../lib/local-files";
import type {
  Attachment,
  DailyLogInput,
  MonthPatch,
  PlanBundle,
  PlanMember,
  PlanRole,
  PortfolioPatch,
  WeeklyReviewInput
} from "../types";
import {
  validateDailyLog,
  validateMonthPatch,
  validatePortfolioPatch,
  validateWeeklyReview
} from "../lib/validation";

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
  updateMonth: (monthId: string, patch: MonthPatch) => Promise<void>;
  saveDailyLog: (monthId: string, input: DailyLogInput) => Promise<void>;
  saveWeeklyReview: (input: WeeklyReviewInput) => Promise<void>;
  uploadAttachment: (monthId: string, file: File) => Promise<void>;
  deleteAttachment: (attachment: Attachment) => Promise<void>;
  updatePortfolio: (itemId: string, patch: PortfolioPatch) => Promise<void>;
  signInWithPassword: (email: string, password: string) => Promise<void>;
  changePassword: (password: string) => Promise<void>;
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

function authorNameFromSession(session: Session | null) {
  return (
    session?.user.user_metadata.display_name ??
    session?.user.email?.split("@")[0] ??
    "学习者"
  );
}

export function AppProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [demoEditing, setDemoEditingState] = useState(() => {
    if (cloudConfigured || typeof window === "undefined") return false;
    return window.localStorage.getItem(DEMO_EDIT_KEY) === "1";
  });

  const planQuery = useQuery({
    queryKey: ["plan", PLAN_SLUG, "monthly"],
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
      void queryClient.invalidateQueries({ queryKey: ["plan"] });
    });
    return () => data.subscription.unsubscribe();
  }, [queryClient]);

  useEffect(() => {
    const client = supabase;
    if (!client || !bundle) return;
    const invalidate = () => {
      void queryClient.invalidateQueries({ queryKey: ["plan", PLAN_SLUG] });
    };
    const channel = client
      .channel(`monthly-plan-changes-${bundle.plan.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "plan_months",
          filter: `plan_id=eq.${bundle.plan.id}`
        },
        invalidate
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "plan_month_sections" },
        invalidate
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "daily_logs",
          filter: `plan_id=eq.${bundle.plan.id}`
        },
        invalidate
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "weekly_reviews",
          filter: `plan_id=eq.${bundle.plan.id}`
        },
        invalidate
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "attachments",
          filter: `plan_id=eq.${bundle.plan.id}`
        },
        invalidate
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "portfolio_items",
          filter: `plan_id=eq.${bundle.plan.id}`
        },
        invalidate
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
      queryClient.setQueryData<PlanBundle>(
        ["plan", PLAN_SLUG, "monthly"],
        (current) => {
          if (!current) return current;
          const next = updater(current);
          saveLocalBundle(next);
          return next;
        }
      );
    },
    [queryClient]
  );

  const setDemoEditing = useCallback((enabled: boolean) => {
    setDemoEditingState(enabled);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(DEMO_EDIT_KEY, enabled ? "1" : "0");
    }
  }, []);

  const updateMonth = useCallback(
    async (monthId: string, patch: MonthPatch) => {
      const validPatch = validateMonthPatch(patch);
      if (cloudConfigured) {
        await updateCloudMonth(monthId, validPatch);
        await refresh();
        return;
      }
      mutateLocal((current) => ({
        ...current,
        months: current.months.map((month) =>
          month.id === monthId ? { ...month, ...validPatch } : month
        )
      }));
    },
    [mutateLocal, refresh]
  );

  const saveDailyLog = useCallback(
    async (monthId: string, input: DailyLogInput) => {
      const validInput = validateDailyLog(input);
      if (cloudConfigured) {
        await upsertCloudDailyLog(
          bundle!.plan.id,
          monthId,
          validInput,
          authorNameFromSession(session)
        );
        await refresh();
        return;
      }
      mutateLocal((current) => {
        const existing = current.dailyLogs.find(
          (log) =>
            log.monthId === monthId &&
            log.logDate === validInput.logDate &&
            log.userId === "local-demo"
        );
        const next = {
          id: existing?.id ?? crypto.randomUUID(),
          planId: current.plan.id,
          monthId,
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
            ? current.dailyLogs.map((log) => (log.id === existing.id ? next : log))
            : [...current.dailyLogs, next]
        };
      });
    },
    [bundle?.plan.id, mutateLocal, refresh, session]
  );

  const saveWeeklyReview = useCallback(
    async (input: WeeklyReviewInput) => {
      const validInput = validateWeeklyReview(input);
      if (cloudConfigured) {
        await upsertCloudWeeklyReview(
          bundle!.plan.id,
          validInput,
          authorNameFromSession(session)
        );
        await refresh();
        return;
      }
      mutateLocal((current) => {
        const existing = current.weeklyReviews.find(
          (review) =>
            review.weekStart === validInput.weekStart &&
            review.userId === "local-demo"
        );
        const now = new Date().toISOString();
        const next = {
          id: existing?.id ?? crypto.randomUUID(),
          planId: current.plan.id,
          userId: "local-demo",
          ...validInput,
          authorName: "本地访客",
          createdAt: existing?.createdAt ?? now,
          updatedAt: now
        };
        return {
          ...current,
          weeklyReviews: existing
            ? current.weeklyReviews.map((review) =>
                review.id === existing.id ? next : review
              )
            : [...current.weeklyReviews, next]
        };
      });
    },
    [bundle?.plan.id, mutateLocal, refresh, session]
  );

  const uploadAttachment = useCallback(
    async (monthId: string, file: File) => {
      if (cloudConfigured) {
        await uploadCloudAttachment(bundle!.plan.id, monthId, file);
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
            monthId,
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

  const signInWithPassword = useCallback(
    async (email: string, password: string) => {
      await signInWithEmailPassword(email, password);
      await queryClient.invalidateQueries({ queryKey: ["plan-role"] });
      await queryClient.invalidateQueries({ queryKey: ["plan"] });
    },
    [queryClient]
  );

  const changePassword = useCallback(async (password: string) => {
    await updateCloudPassword(password);
  }, []);

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
    queryClient.setQueryData(["plan", PLAN_SLUG, "monthly"], next);
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
      updateMonth,
      saveDailyLog,
      saveWeeklyReview,
      uploadAttachment,
      deleteAttachment,
      updatePortfolio,
      signInWithPassword,
      changePassword,
      signOut,
      listCollaborators,
      inviteCollaborator,
      revokeCollaborator,
      resetDemo
    }),
    [
      bundle,
      canEdit,
      changePassword,
      deleteAttachment,
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
      saveWeeklyReview,
      session,
      setDemoEditing,
      signInWithPassword,
      signOut,
      updateMonth,
      updatePortfolio,
      uploadAttachment
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used inside AppProvider");
  return context;
}
