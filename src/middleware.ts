import { defineMiddleware } from "astro:middleware";
import { createClient } from "@supabase/supabase-js";
import { getServiceSupabase } from "./lib/supabase";

const PROTECTED = ["/admin", "/api/admin"];
const PUBLIC = ["/admin/login"];
const CANONICAL_HOST = new URL(import.meta.env.PUBLIC_SITE_URL || "https://laeseprod.com").hostname;
const MAINTENANCE_CACHE_MS = 5000;
let maintenanceCache: { value: boolean; expiresAt: number } | null = null;

const LEGACY_REDIRECTS: Record<string, string> = {
  "/ultimos-proyectos": "/proyectos",
};

function isNavigationRequest(method: string) {
  return method === "GET" || method === "HEAD";
}

function shouldNormalizeTrailingSlash(pathname: string) {
  if (pathname === "/") return false;
  if (pathname.startsWith("/api/")) return false;
  if (pathname.includes(".")) return false;

  return pathname.endsWith("/");
}

function getCanonicalRedirectUrl(request: Request) {
  if (!import.meta.env.PROD || !isNavigationRequest(request.method)) return null;

  const currentUrl = new URL(request.url);
  const targetUrl = new URL(currentUrl);
  let shouldRedirect = false;
  const normalizedPath = currentUrl.pathname.length > 1
    ? currentUrl.pathname.replace(/\/+$/, "")
    : currentUrl.pathname;

  if (targetUrl.hostname === `www.${CANONICAL_HOST}`) {
    targetUrl.hostname = CANONICAL_HOST;
    shouldRedirect = true;
  }

  if (request.headers.get("x-forwarded-proto") === "http" && targetUrl.hostname === CANONICAL_HOST) {
    targetUrl.protocol = "https:";
    shouldRedirect = true;
  }

  const legacyTarget = LEGACY_REDIRECTS[normalizedPath];
  if (legacyTarget) {
    targetUrl.pathname = legacyTarget;
    shouldRedirect = true;
  } else if (shouldNormalizeTrailingSlash(currentUrl.pathname)) {
    targetUrl.pathname = normalizedPath;
    shouldRedirect = true;
  }

  return shouldRedirect ? targetUrl : null;
}

function isStaticAssetPath(pathname: string) {
  return pathname.startsWith("/_astro/")
    || pathname.startsWith("/favicon")
    || pathname.startsWith("/apple-touch-icon")
    || pathname.startsWith("/android-chrome")
    || pathname === "/site.webmanifest"
    || pathname === "/robots.txt"
    || pathname === "/sitemap.xml"
    || pathname.includes(".");
}

function isMaintenanceBypassPath(pathname: string) {
  return pathname === "/mantenimiento"
    || pathname.startsWith("/admin")
    || pathname.startsWith("/api/admin")
    || pathname.startsWith("/api/auth")
    || pathname === "/api/stripe/webhook"
    || pathname === "/api/health"
    || isStaticAssetPath(pathname);
}

async function getMaintenanceMode(supabaseAdmin: ReturnType<typeof getServiceSupabase>) {
  if (!supabaseAdmin) return false;

  const now = Date.now();
  if (maintenanceCache && maintenanceCache.expiresAt > now) return maintenanceCache.value;

  const { data, error } = await supabaseAdmin
    .from("settings")
    .select("maintenance_mode")
    .limit(1)
    .maybeSingle();

  const value = !error && data?.maintenance_mode === true;
  maintenanceCache = { value, expiresAt: now + MAINTENANCE_CACHE_MS };
  return value;
}

export const onRequest = defineMiddleware(async ({ request, cookies, redirect, rewrite, locals }, next) => {
  const { pathname, searchParams, host } = new URL(request.url);
  const canonicalRedirectUrl = getCanonicalRedirectUrl(request);
  const supabaseAdmin = getServiceSupabase();
  const isApiRequest = pathname.startsWith("/api/");
  const accessToken = cookies.get("sb-access-token")?.value;
  const refreshToken = cookies.get("sb-refresh-token")?.value;
  let authChecked = false;
  let authProfile: any = null;
  let authError: unknown = null;

  const getAuthenticatedProfile = async () => {
    if (authChecked) return { profile: authProfile, error: authError };
    authChecked = true;

    if (!accessToken || !refreshToken) {
      authError = "missing-session";
      return { profile: null, error: authError };
    }

    const supabase = createClient(
      import.meta.env.PUBLIC_SUPABASE_URL,
      import.meta.env.PUBLIC_SUPABASE_ANON_KEY
    );

    const { data, error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    if (error || !data.user) {
      authError = error || "missing-user";
      cookies.delete("sb-access-token", { path: "/" });
      cookies.delete("sb-refresh-token", { path: "/" });
      return { profile: null, error: authError };
    }

    const { data: profile, error: profileError } = await (supabaseAdmin || supabase)
      .from("profiles")
      .select("is_admin, permissions")
      .eq("id", (data.user as any).id)
      .maybeSingle();

    if (profileError || !profile) {
      authError = profileError || "missing-profile";
      return { profile: null, error: authError };
    }

    authProfile = profile;
    locals.userProfile = profile;
    return { profile: authProfile, error: null };
  };

  if (canonicalRedirectUrl) {
    return Response.redirect(canonicalRedirectUrl, 301);
  }

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

  const maintenanceMode = !isMaintenanceBypassPath(pathname) && await getMaintenanceMode(supabaseAdmin);
  if (maintenanceMode) {
    const { profile } = await getAuthenticatedProfile();
    if (!profile?.is_admin) {
      if (isApiRequest) {
        return new Response(JSON.stringify({ error: "Site under maintenance" }), {
          status: 503,
          headers: {
            "content-type": "application/json; charset=utf-8",
            "cache-control": "no-store",
          },
        });
      }

      return rewrite("/mantenimiento");
    }
  }

  const isAdminChatAction = pathname === "/api/chat" && searchParams.get("list") === "1";
  const isProtected = (PROTECTED.some((r) => pathname.startsWith(r)) || isAdminChatAction)
    && !PUBLIC.includes(pathname);

  if (!isProtected) return next();

  if (!accessToken || !refreshToken) {
    if (isApiRequest) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }
    return redirect(`/admin/login?redirectTo=${encodeURIComponent(pathname)}`);
  }

  const { profile, error } = await getAuthenticatedProfile();
  if (error || !profile) {
    console.error("Middleware Auth Error:", error instanceof Error ? error.message : error || "No user found");
    if (isApiRequest) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }
    return redirect("/admin/login");
  }

  const SECTION_MAP: Record<string, string> = {
    "/admin/proyectos": "proyectos",
    "/admin/servicios": "servicios",
    "/admin/faqs": "faqs",
    "/admin/portal": "portal",
    "/admin/contratos": "contratos",
    "/admin/mensajes": "mensajes",
    "/admin/chat": "chat",
    "/admin/ajustes": "ajustes",
    "/admin/seo": "seo",
    "/admin/usuarios": "usuarios",
    "/admin": "dashboard",
    "/api/admin/projects": "proyectos",
    "/api/admin/proyectos": "proyectos",
    "/api/admin/services": "servicios",
    "/api/admin/servicios": "servicios",
    "/api/admin/faqs": "faqs",
    "/api/admin/portal": "portal",
    "/api/admin/contracts": "contratos",
    "/api/admin/messages": "mensajes",
    "/api/admin/settings": "ajustes",
    "/api/admin/templates": "ajustes",
    "/api/admin/upload": "upload",
    "/api/admin/cloudinary-sign": "upload",
    "/api/admin/seo": "seo",
    "/api/admin/users": "usuarios",
    "/api/chat": "chat",
  };

  const targetPath = Object.keys(SECTION_MAP)
    .sort((a, b) => b.length - a.length)
    .find((path) => pathname.startsWith(path));
  const targetSection = targetPath ? SECTION_MAP[targetPath] : null;

  if (profile.is_admin) {
    return next();
  }

  const userPermissions = profile.permissions || [];
  if (targetSection === "upload" && userPermissions.length > 0) {
    return next();
  }
  if (targetSection && userPermissions.includes(targetSection)) {
    return next();
  }

  if (isApiRequest) {
    return new Response(JSON.stringify({ error: "Forbidden: Missing permissions" }), { status: 403 });
  }
  return redirect("/admin/login?error=" + encodeURIComponent("No tienes permisos para acceder a esta seccion."));
});
