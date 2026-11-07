const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim() ?? "";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ?? "";

export const cloudConfigured = Boolean(
  supabaseUrl.startsWith("https://") && supabaseAnonKey.length > 20
);

export const cloudConfig = {
  url: supabaseUrl,
  anonKey: supabaseAnonKey
};

export const PLAN_SLUG = "unity-ta";
export const DEFAULT_WEEK_ROUTE = `/plans/${PLAN_SLUG}`;
export const DEMO_EDIT_KEY = "ta-journey-demo-editor";
