// 22 - paskyra /paskyra: prisijungimas, registracija, slaptažodžio atkūrimas; prisijungus - užsakymai (būsena, siunta,
// atsiliepimas), profilis, adresas ir mėgstamas paštomatas, nuolaidos kodai, nustatymai (slaptažodis, duomenų
// atsisiuntimas, paskyros ištrynimas - BDAR). Pirkti galima ir be paskyros.
const ACC_TABS = [
  ["uzsakymai", t("acc.orders"), "box"],
  ["profilis", t("acc.profile"), "user"],
  ["adresai", t("acc.delivery"), "pin"],
  ["kodai", t("acc.codes"), "tag"],
  ["nustatymai", t("acc.settings"), "gear"]
];
const ORDER_STATUS = {
  paid: [t("status.paid"), "blue"],
  packed: [t("status.packed"), "blue"],
  shipped: [t("status.shipped"), "amber"],
  delivered: [t("status.delivered"), "green"],
  refunded: [t("status.refunded"), "red"],
  cancelled: [t("status.cancelled"), "red"]
};
const accState = { tab: "", mode: "login", orders: null };
const statusPill = s => `<span class="pill ${ORDER_STATUS[s]?.[1] || ""}">${esc(ORDER_STATUS[s]?.[0] || s)}</span>`;

function renderAccount(sub = "") {
  const root = $("#accRoot");
  if (!SB) {
    root.innerHTML = `<header class="pageHead"><h1 id="accTitle">${t("acc.title")}</h1></header><div class="empty"><h3>${t("acc.off")}</h3><p>${t("acc.offText")}</p><a class="btn primary" href="kvepalai" data-nav>${t("fav.toCatalog")}</a></div>`;
    return;
  }
  if (auth.recovery && auth.session) return renderNewPassword(root);
  if (!auth.session) return renderAuthForms(root);
  if (!auth.user) {
    root.innerHTML = `<p class="loadingTxt">${t("common.loading")}</p>`;
    loadMe().then(() => ui.view === "account" && renderAccount(sub));
    return;
  }
  accState.tab = ACC_TABS.some(tx => tx[0] === sub) ? sub : "uzsakymai";
  const name = auth.profile?.name || auth.user.user_metadata?.name || "";
  root.innerHTML = `<header class="pageHead accHead"><h1 id="accTitle">${name ? t("acc.hello", { name: esc(name.split(" ")[0]) }) : t("nav.myAccount")}</h1><p class="pageSub">${esc(auth.user.email)}</p></header>
<div class="accLayout">
<nav class="accNav" aria-label="${t("acc.title")}">${ACC_TABS.map(
    ([id, label, ico]) => `<a href="paskyra/${id}" data-nav${accState.tab === id ? ' aria-current="page"' : ""}>${glyph(ico)}<span>${label}</span></a>`
  ).join("")}${auth.isAdmin ? `<a href="admin" data-nav class="accAdmin">${glyph("gear")}<span>${t("acc.admin")}</span></a>` : ""}<button type="button" data-logout>${glyph("logout")}<span>${t("acc.logout")}</span></button></nav>
<div class="accBody" id="accBody"></div>
</div>`;
  const body = $("#accBody");
  ({ uzsakymai: accOrders, profilis: accProfile, adresai: accAddress, kodai: accCodes, nustatymai: accSettings })[accState.tab](body);
}

// ── Prisijungimas / registracija ───────────────────────
function renderAuthForms(root) {
  const m = accState.mode;
  const title = { login: t("nav.signIn"), signup: t("auth.signupTitle"), recover: t("auth.recoverTitle") }[m];
  root.innerHTML = `<div class="authBox">
<header class="pageHead"><h1 id="accTitle">${title}</h1><p class="pageSub">${
    m === "recover" ? t("auth.recoverSub") : t("auth.sub")
  }</p></header>
${m !== "recover" ? `<div class="seg" role="tablist"><button role="tab" type="button" data-auth-mode="login" aria-selected="${m === "login"}">${t("nav.signIn")}</button><button role="tab" type="button" data-auth-mode="signup" aria-selected="${m === "signup"}">${t("auth.register")}</button></div>` : ""}
<form class="authForm" novalidate>
${m === "signup" ? `<label class="field"><span>${t("form.firstName")}</span><input name="name" autocomplete="name" required maxlength="60" /></label>` : ""}
<label class="field"><span>${t("form.email")}</span><input name="email" type="email" autocomplete="email" inputmode="email" required /></label>
${
  m !== "recover"
    ? `<label class="field"><span>${t("form.password")}</span><input name="password" type="password" autocomplete="${m === "signup" ? "new-password" : "current-password"}" required minlength="8" />${
        m === "signup" ? `<small>${t("form.pwHint")}</small>` : ""
      }</label>`
    : ""
}
<p class="formErr" role="alert" hidden></p><p class="formOk" role="status" hidden></p>
<button class="btn primary block" type="submit">${{ login: t("nav.signIn"), signup: t("auth.signupTitle"), recover: t("auth.sendLink") }[m]}</button>
</form>
<div class="authLinks">${
    m === "login"
      ? `<button class="linkBtn" type="button" data-auth-mode="recover">${t("auth.forgot")}</button>`
      : m === "recover"
        ? `<button class="linkBtn" type="button" data-auth-mode="login">${t("auth.backToLogin")}</button>`
        : `<span>${t("auth.agree", { terms: `<a href="salygos">${t("auth.agreeTerms")}</a>`, privacy: `<a href="privatumas">${t("auth.agreePrivacy")}</a>` })}</span>`
  }</div>
<p class="authGuest">${glyph("bag")}${t("auth.guest", { link: `<a href="kvepalai" data-nav>${t("auth.guestLink")}</a>` })}</p>
</div>`;
  const form = $(".authForm", root);
  root.onclick = e => {
    const b = e.target instanceof Element && e.target.closest("[data-auth-mode]");
    if (b) {
      accState.mode = b.dataset.authMode;
      renderAuthForms(root);
      $(".authForm input", root)?.focus();
    }
  };
  form.addEventListener("submit", async e => {
    e.preventDefault();
    const err = $(".formErr", form);
    const ok = $(".formOk", form);
    const btn = $("button[type=submit]", form);
    const f = Object.fromEntries(new FormData(form));
    err.hidden = ok.hidden = true;
    const fail = msg => {
      err.textContent = msg;
      err.hidden = false;
    };
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(f.email || "")) return fail(t("form.emailBad"));
    if (m !== "recover" && (f.password || "").length < 8) return fail(t("form.pwShort"));
    if (m === "signup" && !f.name?.trim()) return fail(t("form.nameMissing"));
    btn.disabled = true;
    try {
      if (m === "login") {
        await signIn(f.email.trim(), f.password);
        toast(t("auth.signedIn"), { icon: "check" });
        renderAccount();
        renderHeaderAccount();
      } else if (m === "signup") {
        const d = await signUp(f.email.trim(), f.password, f.name.trim());
        if (d.access_token) {
          await loadMe();
          renderAccount();
        } else {
          ok.textContent = t("auth.confirmSent", { email: f.email.trim() });
          ok.hidden = false;
          form.reset();
        }
      } else {
        await recoverPassword(f.email.trim());
        ok.textContent = t("auth.recoverSent");
        ok.hidden = false;
      }
    } catch (ex) {
      fail(authMsg(ex));
    } finally {
      btn.disabled = false;
    }
  });
}
function renderNewPassword(root) {
  root.innerHTML = `<div class="authBox"><header class="pageHead"><h1 id="accTitle">${t("auth.newPw")}</h1></header>
<form class="authForm" novalidate><label class="field"><span>${t("auth.newPw")}</span><input name="password" type="password" autocomplete="new-password" minlength="8" required /><small>${t("form.pwHint")}</small></label>
<p class="formErr" role="alert" hidden></p><button class="btn primary block" type="submit">${t("common.save")}</button></form></div>`;
  const form = $(".authForm", root);
  form.addEventListener("submit", async e => {
    e.preventDefault();
    const err = $(".formErr", form);
    const pw = form.elements.password.value;
    if (pw.length < 8) return ((err.textContent = t("form.pwHint")), (err.hidden = false));
    try {
      await updatePassword(pw);
      toast(t("auth.pwChanged"), { icon: "check" });
      await loadMe();
      renderAccount();
    } catch (ex) {
      err.textContent = authMsg(ex);
      err.hidden = false;
    }
  });
}

// ── Užsakymai ──────────────────────────────────────────
async function loadOrders() {
  accState.orders = (await sbRest("orders?select=*&order=created_at.desc&limit=100")) || [];
  return accState.orders;
}
function orderItemsText(o) {
  return (o.items || []).map(i => `${L(BY_ID.get(i.id), "name") || i.name}${i.qty > 1 ? ` × ${i.qty}` : ""}`).join(", ");
}
async function accOrders(body) {
  body.innerHTML = `<p class="loadingTxt">${t("acc.loadingOrders")}</p>`;
  let list;
  try {
    list = await loadOrders();
  } catch (err) {
    body.innerHTML = `<div class="empty"><h3>${t("errors.loadFail")}</h3><p>${esc(err.message)}</p></div>`;
    return;
  }
  if (!list.length) {
    body.innerHTML = `<div class="empty">${emptyBagSVG()}<h3>${t("acc.noOrders")}</h3><p>${t("acc.noOrdersText")}</p><a class="btn primary" href="kvepalai" data-nav>${t("fav.toCatalog")}</a></div>`;
    return;
  }
  body.innerHTML = `<div class="orders">${list
    .map(
      o => `<details class="order">
<summary><span class="oMain"><b>${t("acc.order", { ref: esc(o.ref) })}</b><small>${fmtDate(o.created_at)} · ${esc(orderItemsText(o))}</small></span>${statusPill(o.status)}<b class="money">${eur(o.amount_total / 100)}</b>${glyph("chev-down")}</summary>
<div class="oBody">
${o.tracking ? `<p class="oTrack">${glyph("truck")}${t("acc.tracking")}: <b>${esc(o.tracking)}</b></p>` : ""}
<div class="oItems">${(o.items || [])
        .map(i => {
          const p = BY_ID.get(i.id);
          const canReview = p && ["paid", "packed", "shipped", "delivered"].includes(o.status) && !i.picks;
          return `<div class="oItem">${p ? `<a class="art" href="${productUrl(p)}" data-nav style="--tint:${p.look.tint}">${artImg(p)}</a>` : `<span class="art"></span>`}<span><b>${esc((p && L(p, "name")) || i.name)}</b><small>${i.qty} × ${eur(i.unit / 100)}</small></span>${
            canReview ? `<button class="btn ghost small" type="button" data-review="${esc(i.id)}">${glyph("star")}${t("acc.rate")}</button>` : ""
          }</div>`;
        })
        .join("")}</div>
<p class="oMeta">${esc(o.shipping?.locker ? `${t("locker.title")}: ${o.shipping.locker}` : o.shipping?.address || "")}${o.gift ? ` · ${t("cart.giftWrap")}` : ""}</p>
${o.credit_code ? `<p class="oMeta">${t("acc.sampleCode")}: <b>${esc(o.credit_code)}</b></p>` : ""}
<div class="oActs"><button class="btn ghost small" type="button" data-reorder="${esc(o.id)}">${glyph("bag")}${t("acc.reorder")}</button></div>
</div></details>`
    )
    .join("")}</div>`;
}
function openReviewForm(productId) {
  const p = BY_ID.get(productId);
  let rating = 5;
  openSheet({
    title: t("review.title"),
    html: `<form class="sheetPad reviewForm" novalidate><p class="notifyLead">${t("review.lead", { name: `<b>${esc(L(p, "name"))}</b>` })}</p>
<div class="rateRow" role="radiogroup" aria-label="${t("review.rating")}">${[1, 2, 3, 4, 5].map(n => `<button type="button" role="radio" data-rate="${n}" aria-checked="${n === rating}" aria-label="${t("reviews.stars", { r: n })}">★</button>`).join("")}</div>
<label class="field"><span>${t("review.name")}</span><input name="name" maxlength="60" required value="${esc((auth.profile?.name || "").split(" ").map((w, i) => (i ? `${w[0] || ""}.` : w)).join(" "))}" /></label>
<label class="field"><span>${t("review.text")}</span><textarea name="text" minlength="10" maxlength="1200" required placeholder="${t("review.ph")}"></textarea></label>
<p class="formErr" role="alert" hidden></p><button class="btn primary block" type="submit">${t("common.send")}</button></form>`
  });
  const form = $("#sheetBody form");
  const paint = () => $$("[data-rate]", form).forEach(b => b.setAttribute("aria-checked", String(Number(b.dataset.rate) <= rating)));
  paint();
  form.addEventListener("click", e => {
    const b = e.target instanceof Element && e.target.closest("[data-rate]");
    if (b) {
      rating = Number(b.dataset.rate);
      paint();
    }
  });
  form.addEventListener("submit", async e => {
    e.preventDefault();
    const err = $(".formErr", form);
    const f = Object.fromEntries(new FormData(form));
    if (!f.name.trim() || f.text.trim().length < 10) return ((err.textContent = t("review.short")), (err.hidden = false));
    try {
      await sbRest("reviews", { method: "POST", body: { product_id: p.id, user_id: auth.user.id, name: f.name.trim(), text: f.text.trim(), rating } });
      closeSheet();
      toast(t("review.thanks"), { icon: "check", ms: 3600 });
    } catch (ex) {
      err.textContent = ex.status === 403 || /row-level/i.test(ex.message) ? t("review.onlyBought") : ex.message;
      err.hidden = false;
    }
  });
}

// ── Profilis, pristatymas, kodai, nustatymai ───────────
function accProfile(body) {
  const p = auth.profile || {};
  body.innerHTML = `<form class="accForm" novalidate><h2>${t("acc.profile")}</h2>
<label class="field"><span>${t("form.fullName")}</span><input name="name" autocomplete="name" maxlength="80" value="${esc(p.name || "")}" /></label>
<label class="field"><span>${t("form.phone")}</span><input name="phone" type="tel" autocomplete="tel" maxlength="30" value="${esc(p.phone || "")}" /><small>${t("form.phoneHint")}</small></label>
<label class="field"><span>${t("form.email")}</span><input value="${esc(auth.user.email)}" disabled /></label>
<p class="formErr" role="alert" hidden></p><button class="btn primary" type="submit">${t("common.save")}</button></form>`;
  bindAccForm(body, f => saveProfile({ name: f.name.trim(), phone: f.phone.trim() }));
}
function accAddress(body) {
  const a = auth.profile?.address || {};
  const lk = state.ship.locker || auth.profile?.locker;
  body.innerHTML = `<section><h2>${t("acc.favLocker")}</h2>
<div class="group">${
    lk ? lockerRowHTML(lk, true) : `<div class="row"><span class="rowTxt">${t("acc.notChosen")}<small>${t("acc.notChosenSub")}</small></span></div>`
  }<button class="row sub" type="button" data-acc-locker><span class="rowTxt">${lk ? t("locker.change") : t("locker.pick")}</span><span class="chev">${glyph("chev-right")}</span></button></div></section>
<form class="accForm" novalidate style="margin-top:32px"><h2>${t("acc.courierAddr")}</h2>
<label class="field"><span>${t("form.recipient")}</span><input name="name" autocomplete="name" maxlength="80" value="${esc(a.name || auth.profile?.name || "")}" /></label>
<label class="field"><span>${t("form.line1")}</span><input name="line1" autocomplete="address-line1" maxlength="120" value="${esc(a.line1 || "")}" /></label>
<div class="fieldRow"><label class="field"><span>${t("form.city")}</span><input name="city" autocomplete="address-level2" maxlength="60" value="${esc(a.city || "")}" /></label>
<label class="field"><span>${t("form.postal")}</span><input name="postal" autocomplete="postal-code" maxlength="12" value="${esc(a.postal || "")}" /></label></div>
<label class="field"><span>${t("form.country")}</span><select name="country">${SET.countries.map(c => `<option value="${c}"${(a.country || "LT") === c ? " selected" : ""}>${esc(regionName(c))}</option>`).join("")}</select></label>
<small class="formHint">${t("acc.addrHint")}</small>
<p class="formErr" role="alert" hidden></p><button class="btn primary" type="submit">${t("acc.saveAddr")}</button></form>`;
  bindAccForm(body, f => saveProfile({ address: { name: f.name.trim(), line1: f.line1.trim(), city: f.city.trim(), postal: f.postal.trim(), country: f.country } }));
  $("[data-acc-locker]", body).addEventListener("click", () => openLockerPicker());
}
async function accCodes(body) {
  body.innerHTML = `<p class="loadingTxt">${t("common.loading")}</p>`;
  const list = (accState.orders || (await loadOrders().catch(() => []))).filter(o => o.credit_code);
  const days = SET.sampleCredit?.days || 30;
  body.innerHTML = `<h2>${t("acc.codes")}</h2><p class="pageSub" style="margin-bottom:16px">${esc(creditText())}</p>${
    list.length
      ? `<div class="group">${list
          .map(o => {
            const until = new Date(new Date(o.created_at).getTime() + days * 864e5);
            const valid = until > new Date();
            return `<div class="row"><span class="rowIco" style="background:${valid ? "var(--pink)" : "var(--ink4)"}">${glyph("tag")}</span><span class="rowTxt"><b>${esc(o.credit_code)}</b><small>${valid ? t("acc.validUntil", { date: fmtDate(until) }) : t("acc.expired")} · ${t("acc.orderLower", { ref: esc(o.ref) })}</small></span>${
              valid ? `<button class="btn ghost small" type="button" data-copy="${esc(o.credit_code)}">${glyph("copy")}${t("common.copy")}</button>` : ""
            }</div>`;
          })
          .join("")}</div>`
      : `<div class="empty"><h3>${t("acc.noCodes")}</h3><p>${t("acc.noCodesText")}</p><a class="btn primary" href="meginukai" data-nav>${t("nav.samples")}</a></div>`
  }`;
}
function accSettings(body) {
  body.innerHTML = `<form class="accForm" novalidate><h2>${t("form.password")}</h2>
<label class="field"><span>${t("auth.newPw")}</span><input name="password" type="password" autocomplete="new-password" minlength="8" /><small>${t("form.pwHint")}</small></label>
<p class="formErr" role="alert" hidden></p><button class="btn primary" type="submit">${t("acc.changePw")}</button></form>
<section class="accDanger"><h2>${t("acc.myData")}</h2><p class="pageSub">${t("acc.myDataText")}</p>
<div class="accActs"><button class="btn ghost" type="button" data-export>${glyph("upload")}${t("acc.export")}</button><button class="btn danger" type="button" data-delete-acc>${glyph("trash")}${t("acc.delete")}</button></div></section>`;
  bindAccForm(body, async f => {
    if ((f.password || "").length < 8) throw new Error(t("form.pwShort"));
    await updatePassword(f.password);
    $("form", body).reset();
  });
  $("[data-export]", body).addEventListener("click", async () => {
    const [orders, reviews] = await Promise.all([sbRest("orders?select=*"), sbRest(`reviews?select=*&user_id=eq.${auth.user.id}`)]);
    const blob = new Blob([JSON.stringify({ user: { id: auth.user.id, email: auth.user.email, created_at: auth.user.created_at }, profile: auth.profile, orders, reviews }, null, 2)], {
      type: "application/json"
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `vaidore-duomenys-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  });
  $("[data-delete-acc]", body).addEventListener("click", async () => {
    const ok = await askConfirm(t("acc.deleteText"), {
    title: t("acc.deleteQ"),
    ok: t("common.delete"),
      danger: true
    });
    if (!ok) return;
    const r = await sbFn("shop/account", { method: "POST", body: JSON.stringify({ action: "delete" }) });
    if (!r.ok) return toast(t("acc.deleteFail"), { icon: "info" });
    await signOut();
    toast(t("acc.deleted"), { icon: "check" });
    navigate("");
  });
}
function bindAccForm(body, save) {
  const form = $("form", body);
  form.addEventListener("submit", async e => {
    e.preventDefault();
    const err = $(".formErr", form);
    const btn = $("button[type=submit]", form);
    err.hidden = true;
    btn.disabled = true;
    try {
      await save(Object.fromEntries(new FormData(form)));
      toast(t("common.saved"), { icon: "check" });
    } catch (ex) {
      err.textContent = authMsg(ex);
      err.hidden = false;
    } finally {
      btn.disabled = false;
    }
  });
}
function renderHeaderAccount() {
  $("#accDot").hidden = !auth.user;
  $(".accBtn").setAttribute("aria-label", auth.user ? t("acc.ariaIn") : t("nav.signIn"));
}
document.addEventListener("click", async e => {
  const tx = e.target instanceof Element ? e.target : null;
  if (tx?.closest("[data-logout]")) {
    await signOut();
    accState.orders = null;
    toast(t("auth.signedOut"), { icon: "logout" });
    navigate("");
    return;
  }
  const rv = tx?.closest("[data-review]");
  if (rv) return openReviewForm(rv.dataset.review);
  const cp = tx?.closest("[data-copy]");
  if (cp) {
    navigator.clipboard?.writeText(cp.dataset.copy).then(() => toast(t("common.copied"), { icon: "copy" }));
    return;
  }
  const re = tx?.closest("[data-reorder]");
  if (re) {
    const o = accState.orders?.find(x => x.id === re.dataset.reorder);
    let n = 0;
    for (const i of o?.items || []) {
      if (i.picks && DISC && i.picks.every(id => BY_ID.has(id) && inStock(BY_ID.get(id)))) (addToCart(DISC.id, 0, i.qty, i.picks), n++);
      else if (BY_ID.has(i.id) && inStock(BY_ID.get(i.id)) && priceOf(BY_ID.get(i.id), i.ml) != null) (addToCart(i.id, i.ml, i.qty), n++);
    }
    n ? openMiniCart({ added: "Užsakymas" }) : toast(t("acc.reorderNone"), { icon: "info" });
  }
});
