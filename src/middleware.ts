import { defineMiddleware } from "astro:middleware";
import { createClient } from "@supabase/supabase-js";

const PROTECTED = ["/admin"];
const PUBLIC = ["/admin/login"];

export const onRequest = defineMiddleware(async ({ request, cookies, redirect }, next) => {
  const { pathname } = new URL(request.url);

  const isProtected = PROTECTED.some(r => pathname.startsWith(r))
    && !PUBLIC.includes(pathname);

  if (!isProtected) return next();

  const accessToken = cookies.get("sb-access-token")?.value;
  const refreshToken = cookies.get("sb-refresh-token")?.value;

  if (!accessToken || !refreshToken) {
    return redirect(`/admin/login?redirectTo=${encodeURIComponent(pathname)}`);
  }

  const supabase = createClient(
    import.meta.env.PUBLIC_SUPABASE_URL,
    import.meta.env.PUBLIC_SUPABASE_ANON_KEY
  );

  const { error } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  if (error) {
    cookies.delete("sb-access-token", { path: "/" });
    cookies.delete("sb-refresh-token", { path: "/" });
    return redirect("/admin/login");
  }

  return next();
});
