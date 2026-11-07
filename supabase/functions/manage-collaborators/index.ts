import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type"
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authorization = request.headers.get("Authorization");
    if (!authorization) return json({ error: "Missing authorization." }, 401);

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authorization } }
    });
    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
    const {
      data: { user },
      error: userError
    } = await userClient.auth.getUser();
    if (userError || !user) return json({ error: "Invalid session." }, 401);

    const body = await request.json();
    const planId = String(body.planId ?? "");
    const action = String(body.action ?? "");
    if (!planId) return json({ error: "planId is required." }, 400);

    const { data: membership, error: membershipError } = await admin
      .from("plan_members")
      .select("role")
      .eq("plan_id", planId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (membershipError) throw membershipError;
    if (membership?.role !== "owner") {
      return json({ error: "Only the owner can manage collaborators." }, 403);
    }

    if (action === "list") {
      const { data: members, error } = await admin
        .from("plan_members")
        .select("plan_id,user_id,role,created_at")
        .eq("plan_id", planId)
        .order("created_at");
      if (error) throw error;

      const users = [];
      let page = 1;
      while (true) {
        const { data, error: listError } = await admin.auth.admin.listUsers({
          page,
          perPage: 1000
        });
        if (listError) throw listError;
        users.push(...data.users);
        if (data.users.length < 1000 || data.nextPage === null) break;
        page = data.nextPage ?? page + 1;
      }
      const byId = new Map(users.map((candidate) => [candidate.id, candidate]));
      return json({
        members: members.map((member) => {
          const memberUser = byId.get(member.user_id);
          return {
            planId: member.plan_id,
            userId: member.user_id,
            email: memberUser?.email ?? null,
            displayName:
              memberUser?.user_metadata?.display_name ??
              memberUser?.email?.split("@")[0] ??
              null,
            role: member.role,
            createdAt: member.created_at
          };
        })
      });
    }

    if (action === "invite") {
      const email = String(body.email ?? "").trim().toLowerCase();
      const role = String(body.role ?? "editor");
      if (!email.includes("@")) return json({ error: "Invalid email." }, 400);
      if (!["editor", "viewer"].includes(role)) {
        return json({ error: "Role must be editor or viewer." }, 400);
      }

      const users = [];
      let page = 1;
      while (true) {
        const { data, error } = await admin.auth.admin.listUsers({
          page,
          perPage: 1000
        });
        if (error) throw error;
        users.push(...data.users);
        if (data.users.length < 1000 || data.nextPage === null) break;
        page = data.nextPage ?? page + 1;
      }

      let invited = users.find(
        (candidate) => candidate.email?.toLowerCase() === email
      );
      if (!invited) {
        const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
          redirectTo: body.redirectTo || undefined
        });
        if (error) throw error;
        invited = data.user;
      }
      if (!invited) throw new Error("Unable to create invite.");

      const { error: upsertError } = await admin
        .from("plan_members")
        .upsert(
          { plan_id: planId, user_id: invited.id, role },
          { onConflict: "plan_id,user_id" }
        );
      if (upsertError) throw upsertError;

      return json({
        member: {
          planId,
          userId: invited.id,
          email: invited.email,
          displayName:
            invited.user_metadata?.display_name ??
            invited.email?.split("@")[0] ??
            null,
          role,
          createdAt: new Date().toISOString()
        }
      });
    }

    if (action === "revoke") {
      const userId = String(body.userId ?? "");
      if (!userId) return json({ error: "userId is required." }, 400);
      const { data: target, error: targetError } = await admin
        .from("plan_members")
        .select("role")
        .eq("plan_id", planId)
        .eq("user_id", userId)
        .maybeSingle();
      if (targetError) throw targetError;
      if (target?.role === "owner") {
        return json({ error: "The owner cannot be removed." }, 400);
      }
      const { error } = await admin
        .from("plan_members")
        .delete()
        .eq("plan_id", planId)
        .eq("user_id", userId);
      if (error) throw error;
      return json({ ok: true });
    }

    return json({ error: "Unknown action." }, 400);
  } catch (error) {
    return json(
      { error: error instanceof Error ? error.message : String(error) },
      500
    );
  }
});
