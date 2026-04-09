import { defineMiddleware } from "astro:middleware";
import { createClient } from "@supabase/supabase-js";
import { getServiceSupabase } from "./lib/supabase";

const PROTECTED = ["/admin"];
const PUBLIC = ["/admin/login"];

export const onRequest = defineMiddleware(async ({ request, cookies, redirect, locals }, next) => {
  const { pathname } = new URL(request.url);

  const isProtected = PROTECTED.some(r => pathname.startsWith(r))
    && !PUBLIC.includes(pathname);

  if (!isProtected) return next();

  const accessToken = cookies.get("sb-access-token")?.value;
  const refreshToken = cookies.get("sb-refresh-token")?.value;

  if (!accessToken || !refreshToken) {
    console.log("Middleware: No tokens found, redirecting to login");
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
    "/admin/usuarios": "usuarios",
    "/admin": "dashboard", // Fallback for the root admin page
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
    console.error("Middleware Permission Error: Profile missing for", data.user.email);
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
    console.log(`Middleware: Access granted for ${data.user.email} to section: ${targetSection}`);
    return next();
  }

  // Deny access if no permission found
  console.error(`Middleware: Access denied for ${data.user.email} to section: ${targetSection || pathname}`);
  return redirect("/admin/login?error=" + encodeURIComponent("No tienes permisos para acceder a esta sección."));

  console.log("Middleware: Access granted for Admin", data.user.email);
  return next();
});
