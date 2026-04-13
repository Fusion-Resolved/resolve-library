/* ============================================================
   auth.js — SECURITY PATCH (apply to your existing auth.js)
   ============================================================
   
   This file shows exactly where and how to add the two security
   changes identified in the audit. Apply them to your actual
   auth.js — this is a diff/patch guide, not a replacement file.
   ============================================================ */


/* ── CHANGE 1: Object.freeze on _supabase ───────────────────────────────────
   
   LOCATION: Immediately after you assign window._supabase.
   
   Your current code probably looks like:
   
     window._supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
   
   Replace it with:
*/

// 1. Create the client normally.
window._supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 2. Freeze the reference.
//    Object.freeze() prevents any external script from:
//      - Replacing window._supabase with a spoof object
//      - Adding properties to intercept auth calls
//      - Deleting properties to break auth flows
//    It does NOT freeze the internal Supabase session state (which needs to
//    mutate on sign-in/sign-out) — only the top-level client reference.
//    Supabase's own methods are unaffected because they operate on internal
//    closures, not on direct property writes to the client object.
Object.freeze(window._supabase);


/* ── CHANGE 2: onAuthStateChange + authStateChanged event ──────────────────
   
   LOCATION: Inside your existing onAuthStateChange callback.
   
   If your current auth.js fires a custom 'authStateChanged' event
   (which settings.html listens for), make sure it also handles the
   PASSWORD_RECOVERY event cleanly so settings.html's listener fires
   before the inline script's own onAuthStateChange watcher does.
   
   Your current dispatch call should look something like this — no
   changes needed here, just confirming the expected shape:
*/

window._supabase.auth.onAuthStateChange(function (event, session) {
  // Dispatch to all pages that listen for auth resolution
  window.dispatchEvent(new CustomEvent('authStateChanged', {
    detail: { event: event, session: session }
  }));

  // Handle sign-out globally (e.g. redirect away from protected pages)
  if (event === 'SIGNED_OUT') {
    // Add any global sign-out teardown here if needed.
    // settings.html's wireSignOutBtn() handles its own redirect.
  }
});


/* ── IMPORTANT NOTE ON admin.deleteUser() ───────────────────────────────────

   The doDelete() function in settings.html calls a Supabase Edge Function
   at /functions/v1/delete-account rather than calling admin.deleteUser()
   directly. This is intentional and correct.

   DO NOT add admin.deleteUser() to auth.js or any browser-side file.
   The admin client requires the SERVICE ROLE KEY which must never be
   exposed to the browser. The Edge Function approach is the safe pattern:

     Browser (anon key JWT)  →  Edge Function (service role key, server-side)
                                  └─ admin.deleteUser(user.id)

   A minimal Edge Function for account deletion looks like:

     import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

     Deno.serve(async (req) => {
       const authHeader = req.headers.get('Authorization')
       const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
         global: { headers: { Authorization: authHeader } }
       })

       // Verify the caller is a real signed-in user
       const { data: { user }, error } = await userClient.auth.getUser()
       if (error || !user) {
         return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
       }

       // Now delete using the admin client (service role key is safe here)
       const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
       const { error: delError } = await adminClient.auth.admin.deleteUser(user.id)
       if (delError) {
         return new Response(JSON.stringify({ error: delError.message }), { status: 500 })
       }

       return new Response(JSON.stringify({ success: true }), { status: 200 })
     })

   Deploy this to supabase/functions/delete-account/index.ts in your repo.
   ─────────────────────────────────────────────────────────────────────────── */
