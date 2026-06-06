import { defineMiddleware } from "astro:middleware";
import { createClient } from "@supabase/supabase-js";
import { getServiceSupabase } from "./lib/supabase";

const PROTECTED = ["/admin", "/api/admin"];
const PUBLIC = ["/admin/login"];

export const onRequest = defineMiddleware(async ({ request, cookies, redirect, locals }, next) => {
  const { pathname, searchParams, host } = new URL(request.url);

  if (
    import.meta.env.PROD &&
    request.method === "GET" &&
    pathname === "/" &&
    (host === "localhost:3000" || host === "127.0.0.1:3000")
  ) {
    return new Response("ok", {
      status: 200,
      headers: {
        "content-type": "text/plain; charset=utf-8",
        "cache-control": "no-store",
      },
    });
  }

  // Sensitive chat actions that need admin protection
  const isAdminChatAction = pathname === "/api/chat" && searchParams.get('list') === '1';

  const isProtected = (PROTECTED.some(r => pathname.startsWith(r)) || isAdminChatAction)
    && !PUBLIC.includes(pathname);

  if (!isProtected) return next();

  const isApiRequest = pathname.startsWith("/api/");

  const accessToken = cookies.get("sb-access-token")?.value;
  const refreshToken = cookies.get("sb-refresh-token")?.value;

  if (!accessToken || !refreshToken) {
    if (isApiRequest) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }
    return redirect(`/admin/login?redirectTo=${encodeURIComponent(pathname)}`);
  }

  // Use service role for permission check to avoid RLS issues
  const supabaseAdmin = getServiceSupabase();
  const supabase = createClient(
    import.meta.env.PUBLIC_SUPABASE_URL,
    import.meta.env.PUBLIC_SUPABASE_ANON_KEY
  );

  const { data, error } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  if (error || !data.user) {
    console.error("Middleware Auth Error:", error?.message || "No user found");
    cookies.delete("sb-access-token", { path: "/" });
    cookies.delete("sb-refresh-token", { path: "/" });
    if (isApiRequest) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }
    return redirect("/admin/login");
  }

  // Mapping of paths to section IDs (matching those in AdminLayout menu)
  const SECTION_MAP: Record<string, string> = {
    "/admin/proyectos": "proyectos",
    "/admin/servicios": "servicios",
    "/admin/sectores": "sectores",
    "/admin/empresas": "empresas",
    "/admin/portal": "portal",
    "/admin/contratos": "contratos",
    "/admin/mensajes": "mensajes",
    "/admin/chat": "chat",
    "/admin/ajustes": "ajustes",
    "/admin/seo": "seo",
    "/admin/usuarios": "usuarios",
    "/admin": "dashboard", 
    // API mappings
    "/api/admin/proyectos": "proyectos",
    "/api/admin/servicios": "servicios",
    "/api/admin/sectores": "sectores",
    "/api/admin/companies": "empresas",
    "/api/admin/awards": "ajustes",
    "/api/admin/seo": "seo",
    "/api/admin/users": "usuarios",
    "/api/chat": "chat",
  };

  // Identify the target section
  const targetPath = Object.keys(SECTION_MAP)
    .sort((a, b) => b.length - a.length)
    .find(path => pathname.startsWith(path));
  
  const targetSection = targetPath ? SECTION_MAP[targetPath] : null;

  // 3. Permission Check: Verify profile and permissions
  const { data: profile, error: profileError } = await (supabaseAdmin || supabase)
    .from('profiles')
    .select('is_admin, permissions')
    .eq('id', (data.user as any).id)
    .maybeSingle();

  if (profileError || !profile) {
    if (isApiRequest) {
      return new Response(JSON.stringify({ error: "Forbidden: No profile found" }), { status: 403 });
    }
    return redirect("/admin/login?error=" + encodeURIComponent("No se encontró un perfil de administrador para tu cuenta."));
  }

  // Store profile in locals for layouts/pages
  locals.userProfile = profile;

  // Super-admin has access to everything
  if (profile.is_admin) {
    return next();
  }

  // Grant access if the section is in the user's permissions
  const userPermissions = profile.permissions || [];
  if (targetSection && userPermissions.includes(targetSection)) {
    return next();
  }

  // Deny access if no permission found
  if (isApiRequest) {
    return new Response(JSON.stringify({ error: "Forbidden: Missing permissions" }), { status: 403 });
  }
  return redirect("/admin/login?error=" + encodeURIComponent("No tienes permisos para acceder a esta sección."));
});
