// Account page: sign in, create an account, reset a password, and view / edit your profile.
// Accounts and profiles live in Supabase (js/supabase-config.js). A profile row is created by the database
// at sign-up (supabase/migrations/); customers can edit their name, institution and research area only.
// "Verified" is set by Aura Pharma after checking research affiliation.
(function () {
  const box = document.getElementById("acct"), title = document.getElementById("acct-title");
  const { url, key } = window.AURA_SUPABASE;
  const sb = window.supabase.createClient(url, key);
  const e = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const here = location.origin + location.pathname;            // where email links bring people back
  let recovering = /type=recovery/.test(location.hash);
  let confirmed = false;   // set when the visitor lands here from the sign-up confirmation email

  const eye = `<button type="button" class="pw-toggle" aria-label="Show password" aria-pressed="false"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg></button>`;
  const field = (id, label, type = "text", attrs = "") => type === "password"
    ? `<label for="${id}">${label} <span aria-hidden="true">*</span></label><div class="pw"><input id="${id}" class="field" type="password" ${attrs}>${eye}</div>`
    : `<label for="${id}">${label}${/required/.test(attrs) ? ' <span aria-hidden="true">*</span>' : ""}</label><input id="${id}" class="field" type="${type}" ${attrs}>`;
  const msg = (text, err = false) => { const m = box.querySelector(".portal-msg"); m.textContent = text; m.classList.toggle("err", err); };
  const wire = () => box.querySelectorAll(".pw-toggle").forEach((t) => (t.onclick = () => {
    const i = t.previousElementSibling, show = i.type === "password";
    i.type = show ? "text" : "password"; t.setAttribute("aria-pressed", show); t.setAttribute("aria-label", show ? "Hide password" : "Show password");
  }));
  const busy = (form, on) => form.querySelectorAll("button, input").forEach((x) => (x.disabled = on));

  // ---- signed out: sign in / create account
  function signedOut(tab = "in") {
    title.textContent = tab === "in" ? "Sign in" : "Create account";
    box.innerHTML = `
      <div class="acct-tabs" role="tablist">
        <button role="tab" aria-selected="${tab === "in"}" data-t="in">Sign in</button>
        <button role="tab" aria-selected="${tab === "up"}" data-t="up">Create account</button>
      </div>
      <form id="f" novalidate>${tab === "in" ? `
        ${field("email", "Email", "email", 'autocomplete="email" required')}
        ${field("pass", "Password", "password", 'autocomplete="current-password" required')}
        <button class="btn portal-login" type="submit">Sign in</button>
        <p class="portal-msg" role="status"></p>
        <div class="portal-links"><a href="#" id="forgot">Forgot your password?</a></div>` : `
        ${field("name", "Full name", "text", 'autocomplete="name" required')}
        ${field("email", "Email", "email", 'autocomplete="email" required')}
        ${field("pass", "Password (8+ characters)", "password", 'autocomplete="new-password" minlength="8" required')}
        ${field("inst", "Institution or company", "text", 'autocomplete="organization" required')}
        ${field("area", "Research area", "text", 'placeholder="e.g. in vitro peptide research"')}
        <label class="acct-check"><input id="ruo" type="checkbox"> I am 21 or older and a qualified researcher buying for laboratory research only, not for human or veterinary use.</label>
        <button class="btn portal-login" type="submit">Create account</button>
        <p class="portal-msg" role="status"></p>
        <p class="acct-note">New accounts are checked for research affiliation before the first order.</p>`}
      </form>`;
    wire();
    box.querySelectorAll(".acct-tabs button").forEach((b) => (b.onclick = () => signedOut(b.dataset.t)));
    const f = box.querySelector("#f"), v = (id) => box.querySelector("#" + id)?.value.trim() ?? "";
    if (tab === "in") box.querySelector("#forgot").onclick = async (ev) => {
      ev.preventDefault();
      if (!v("email")) return msg("Enter your email above, then choose Forgot your password.", true);
      const { error } = await sb.auth.resetPasswordForEmail(v("email"), { redirectTo: here });
      msg(error ? error.message : "If that email has an account, a reset link is on its way.", !!error);
    };
    f.onsubmit = async (ev) => {
      ev.preventDefault();
      const pass = box.querySelector("#pass").value;
      if (tab === "in") {
        if (!v("email") || !pass) return msg("Enter your email and password.", true);
        busy(f, true); const { error } = await sb.auth.signInWithPassword({ email: v("email"), password: pass }); busy(f, false);
        if (error) return msg(/confirm/i.test(error.message) ? "Confirm your email first: open the link we sent you." : "Email or password is incorrect.", true);
        return show();
      }
      if (!v("name") || !v("email") || !v("inst")) return msg("Fill in your name, email and institution.", true);
      if (pass.length < 8) return msg("Use a password of at least 8 characters.", true);
      if (!box.querySelector("#ruo").checked) return msg("Please confirm research use to create an account.", true);
      busy(f, true);
      const { data, error } = await sb.auth.signUp({ email: v("email"), password: pass,
        options: { emailRedirectTo: here, data: { full_name: v("name"), institution: v("inst"), research_area: v("area") } } });
      busy(f, false);
      if (error) return msg(error.message, true);
      if (data.session) return show();
      title.textContent = "Check your email";
      box.innerHTML = `<p>We sent a confirmation link to <b>${e(v("email"))}</b>. Open it to finish creating your account, then sign in here.</p>
        <p class="portal-msg" role="status"></p><div class="portal-links"><a href="account.html">Back to sign in</a></div>`;
    };
  }

  // ---- arrived from a password-reset email: choose a new password
  function newPassword() {
    title.textContent = "Choose a new password";
    box.innerHTML = `<form id="f" novalidate>${field("pass", "New password (8+ characters)", "password", 'autocomplete="new-password" minlength="8" required')}
      <button class="btn portal-login" type="submit">Save password</button><p class="portal-msg" role="status"></p></form>`;
    wire();
    box.querySelector("#f").onsubmit = async (ev) => {
      ev.preventDefault();
      const pass = box.querySelector("#pass").value;
      if (pass.length < 8) return msg("Use a password of at least 8 characters.", true);
      const { error } = await sb.auth.updateUser({ password: pass });
      if (error) return msg(error.message, true);
      recovering = false; history.replaceState(null, "", here); show("Password updated.");
    };
  }

  // ---- signed in: profile
  async function profile(user, note = "") {
    title.textContent = "Your account";
    const { data: p, error } = await sb.from("profiles").select("email, full_name, institution, research_area, verified, role, created_at").eq("id", user.id).maybeSingle();
    if (error || !p) { box.innerHTML = `<p class="portal-msg err">Couldn't load your profile (${e(error?.message ?? "not found")}).</p><button class="btn" id="out">Sign out</button>`; box.querySelector("#out").onclick = signOut; return; }
    box.innerHTML = `
      <div class="acct-head"><div><b>${e(p.full_name || p.email)}</b><span class="muted">${e(p.email)}</span></div>
        <div class="acct-badges">
          ${user.email_confirmed_at ? `<span class="acct-badge ok">Email verified</span>` : `<span class="acct-badge">Email not confirmed</span>`}
          ${p.verified ? `<span class="acct-badge ok">Verified researcher</span>` : ""}
        </div></div>
      ${p.verified ? "" : `<p class="acct-note acct-note-top">We check research affiliation before your first order ships. We'll email you if we need anything.</p>`}
      <form id="f" novalidate>
        ${field("name", "Full name", "text", `autocomplete="name" value="${e(p.full_name)}"`)}
        ${field("inst", "Institution or company", "text", `autocomplete="organization" value="${e(p.institution)}"`)}
        ${field("area", "Research area", "text", `value="${e(p.research_area)}"`)}
        <button class="btn portal-login" type="submit">Save changes</button>
        <p class="portal-msg" role="status"></p>
        <div class="portal-links"><span class="muted">Member since ${new Date(p.created_at).toLocaleDateString("en-US", { month: "short", year: "numeric" })}</span><a href="#" id="out">Sign out</a></div>
      </form>`;
    if (note) msg(note);
    // arrived from the confirmation email: say so, with a way into the shop
    if (confirmed) {
      confirmed = false;
      box.insertAdjacentHTML("afterbegin", `<div class="acct-welcome"><b>Your email is confirmed.</b> Your account is ready.
        <a class="btn small" href="shop.html">Continue to the shop →</a></div>`);
    }
    box.querySelector("#out").onclick = (ev) => { ev.preventDefault(); signOut(); };
    box.querySelector("#f").onsubmit = async (ev) => {
      ev.preventDefault();
      const v = (id) => box.querySelector("#" + id).value.trim() || null;
      const { error } = await sb.from("profiles").update({ full_name: v("name"), institution: v("inst"), research_area: v("area") }).eq("id", user.id);
      msg(error ? error.message : "Saved.", !!error);
    };
  }

  async function signOut() { await sb.auth.signOut(); signedOut("in"); }

  async function show(note) {
    if (recovering) return newPassword();
    const { data: { session } } = await sb.auth.getSession();
    session ? profile(session.user, note) : signedOut(new URLSearchParams(location.search).get("tab") === "signup" ? "up" : "in");
  }

  sb.auth.onAuthStateChange((event) => {
    if (event === "PASSWORD_RECOVERY") { recovering = true; newPassword(); }
    else if (event === "SIGNED_IN" && /access_token|code=/.test(location.href)) {   // back from an email link
      confirmed = /type=signup|type=email/.test(location.href) || !/type=recovery/.test(location.href);
      history.replaceState(null, "", here); show();
    }
  });
  show();
})();
