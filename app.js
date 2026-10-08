// Edit to match your Transaction Type values: [label, sign applied to Net Impact]
const TYPES = [
  ["⭕️ Expense", -1],
  ["🟢 Income", 1],
];
const K = "ledger1";
let S = {
    accounts: [],
    cats: [],
    shops: [],
    txns: [],
    rules: [],
    tpls: [],
    tplDef: "",
    accHide: [],
  },
  F = {},
  lim = 100;
try {
  S = Object.assign(S, JSON.parse(localStorage.getItem(K) || "{}"));
} catch (e) {}
const fixT = (t) => (t == "✅ Income" ? "🟢 Income" : t);
[...S.txns, ...S.rules, ...S.tpls].forEach((x) => (x.type = fixT(x.type)));
const save = () => {
  try {
    localStorage.setItem(K, JSON.stringify(S));
  } catch (e) {
    alert("Could not save: browser storage is blocked or full.");
  }
};
const $ = (i) => document.getElementById(i),
  h = (s) =>
    String(s ?? "").replace(
      /[&<>"]/g,
      (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c],
    );
const money = (n) =>
  (n < 0 ? "-" : "") +
  "$" +
  Math.abs(n).toLocaleString("en-AU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
const num = (s) => {
  s = String(s ?? "").replace(/[$,\s]/g, "");
  if (/^\(.*\)$/.test(s)) s = "-" + s.slice(1, -1);
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
};
const iso = (s) => {
  const m = s.match(/^(\d+)\/(\d+)\/(\d{4})/);
  return m
    ? `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`
    : s.slice(0, 10);
};
function csv(t) {
  const r = [];
  let row = [],
    f = "",
    q = 0;
  t = t.replace(/^\uFEFF/, "");
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (q) {
      if (c == '"') {
        if (t[i + 1] == '"') {
          f += '"';
          i++;
        } else q = 0;
      } else f += c;
    } else if (c == '"') q = 1;
    else if (c == ",") {
      row.push(f);
      f = "";
    } else if (c == "\n" || c == "\r") {
      if (c == "\r" && t[i + 1] == "\n") i++;
      row.push(f);
      r.push(row);
      row = [];
      f = "";
    } else f += c;
  }
  if (f || row.length) {
    row.push(f);
    r.push(row);
  }
  const hd = (r.shift() || []).map((x) => x.trim());
  return r
    .filter((x) => x.some((y) => y.trim()))
    .map((x) => Object.fromEntries(hd.map((k, i) => [k, (x[i] || "").trim()])));
}
const cesc = (v) => {
  v = String(v ?? "");
  return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
};
const hue = (s) => {
    let x = 0;
    for (const c of String(s || "")) x = (x * 47 + c.charCodeAt(0)) % 360;
    return x;
  },
  PAL = (k) => `hsl(${hue(k)} 60% 50%)`;
const bad = (s) =>
  !s || /^(n\/?a|0(\.0+)?|none|null|undefined|-)$/i.test(String(s).trim());
const chip = (s) =>
  bad(s) ? "" : `<span class="chip" style="--h:${hue(s)}">${h(s)}</span>`;
const today = () => new Date().toLocaleDateString("en-CA"),
  z2 = (n) => String(n).padStart(2, "0");
const opt = (el, a, v, first) => {
  el.innerHTML =
    (first != null ? `<option value="">${first}</option>` : "") +
    a.map((x) => `<option>${h(x)}</option>`).join("");
  if (v != null && [...el.options].some((o) => o.value == v)) el.value = v;
};
const acct = (n) => S.accounts.find((a) => a.name == n),
  phone = () => S.txns.filter((t) => !t.hist);
const shops = () =>
  [
    ...new Set(
      [
        ...S.shops,
        ...S.tpls.map((t) => t.shop),
        ...S.txns.map((t) => t.shop),
      ].filter(Boolean),
    ),
  ].sort((a, b) => a.localeCompare(b));
const parents = () => [...new Set(S.cats.map((c) => c.p).filter(Boolean))];
const info = (a) => {
  const t = S.txns.filter((x) => x.acct == a.name),
    u = (a.init || 0) + t.reduce((s, x) => s + x.net, 0);
  if (a.type != "Shares") return { v: u };
  const p = t
      .filter((x) => x.price && x.date)
      .sort((x, y) => (x.date < y.date ? 1 : -1))[0],
    pr = (p ? p.price : a.price) || 0;
  return { v: u * pr, u, pr };
};
const bal = (a) => info(a).v;

// ---------- add form ----------
function fillForm() {
  opt($("ty"), [...TYPES.map((t) => t[0]), ""]);
  opt(
    $("ac"),
    S.accounts.map((a) => a.name),
    $("ac").value,
  );
  opt($("pc"), ["", ...parents()], $("pc").value);
  fillCat();
  fillShop($("sh").value);
  acChg();
}
const fillCat = () =>
  opt(
    $("ct"),
    [
      "",
      ...S.cats.filter((c) => c.p == $("pc").value && c.c).map((c) => c.c),
      "＋ New category…",
    ],
    $("ct").value,
  );
const fillShop = (v) => opt($("sh"), ["", ...shops(), "＋ New shop…"], v);
function acChg() {
  const a = acct($("ac").value),
    sh = a && a.type == "Shares";
  $("pw").style.display = sh ? "block" : "none";
  if (sh && a.price && !$("pr").value) $("pr").value = a.price;
}
$("pc").onchange = fillCat;
$("ct").onchange = () => {
  if ($("ct").value[0] != "＋") return;
  const c = (prompt("New category name") || "").trim();
  if (!c) return fillCat();
  const p = (
    prompt(
      `Parent category for "${c}"? Type an existing one or a new name. Leave blank for none.\nExisting: ${parents().join(", ")}`,
      $("pc").value,
    ) || ""
  ).trim();
  if (!S.cats.some((x) => x.p == p && x.c == c)) {
    S.cats.push({ p, c });
    save();
  }
  fillForm();
  $("pc").value = p;
  fillCat();
  $("ct").value = c;
};
$("ac").onchange = () => {
  $("pr").value = "";
  acChg();
};
$("rp").onchange = () =>
  ($("rw").style.display = $("rp").value ? "block" : "none");
$("sh").onchange = () => {
  if ($("sh").value[0] == "＋") {
    const n = (prompt("New company/shop name") || "").trim();
    if (n && !shops().includes(n)) {
      S.shops.push(n);
      save();
    }
    fillShop(n);
  }
};
$("sv").onclick = () => {
  const amt = num($("am").value),
    a = acct($("ac").value),
    tt = TYPES.find((t) => t[0] == $("ty").value);
  if (!$("d").value || !a || (tt && !amt))
    return ($("msg").textContent =
      "Enter a date, account and amount (amount is optional when Type is blank). Import accounts on the Sync tab first.");
  const sh = a.type == "Shares";
  const f = {
    date: $("d").value,
    type: $("ty").value,
    name: $("nm").value.trim(),
    shop: $("sh").value,
    acct: a.name,
    net: tt ? tt[1] * Math.abs(amt) : amt || 0,
    parent: $("pc").value,
    price: sh ? num($("pr").value) : null,
    cat: $("ct").value,
    amt: Math.abs(amt || 0),
    budget: $("bd").value.trim(),
  };
  if ($("rp").value) {
    S.rules.push({
      ...f,
      id: Date.now().toString(36),
      start: f.date,
      freq: $("rp").value,
      end: $("re").value,
      n: 0,
    });
    genRules();
  } else
    S.txns.push({
      id:
        "P" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
      ts: Date.now(),
      sent: 0,
      ...f,
    });
  save();
  ["am", "nm", "bd"].forEach((i) => ($(i).value = ""));
  $("rp").value = "";
  $("rp").onchange();
  applyDef();
  $("msg").textContent = "Saved. Export it from the Sync tab when ready.";
  render();
};

// ---------- templates ----------
function applyTpl(id) {
  const t = S.tpls.find((x) => x.id == id);
  if (!t) return;
  if (TYPES.some((x) => x[0] == t.type) || !t.type)
    $("ty").value = t.type || "";
  $("am").value = t.amt ?? "";
  $("nm").value = t.nm || "";
  fillShop(t.shop || "");
  if (acct(t.acct)) {
    $("ac").value = t.acct;
    $("pr").value = "";
    acChg();
  }
  $("pc").value = t.parent || "";
  fillCat();
  $("ct").value = t.cat || "";
  $("bd").value = t.budget || "";
}
const applyDef = () => {
  if (S.tpls.some((t) => t.id == S.tplDef)) {
    $("tp").value = S.tplDef;
    applyTpl(S.tplDef);
  }
};
$("tp").onchange = () => applyTpl($("tp").value);
$("sat").onclick = () => {
  const n = (prompt("Template name") || "").trim();
  if (!n) return;
  const id = Date.now().toString(36);
  S.tpls.push({
    id,
    name: n,
    type: $("ty").value,
    amt: num($("am").value),
    nm: $("nm").value.trim(),
    shop: $("sh").value,
    acct: $("ac").value,
    parent: $("pc").value,
    cat: $("ct").value,
    budget: $("bd").value.trim(),
  });
  save();
  render();
  $("tp").value = id;
};
let TT = null;
function openTpl(t) {
  TT = t || { id: Date.now().toString(36) };
  t = t || {};
  $("tf").innerHTML =
    '<label>Template name</label><input id="t_name"><label>Type</label><select id="t_type"></select><label>Amount (optional)</label><input id="t_amt" type="number" step="0.01" inputmode="decimal"><label>Transaction name</label><input id="t_nm"><label>Company/shop</label><select id="t_shop"></select><label>Account</label><select id="t_acct"></select><label>Parent category</label><select id="t_parent"></select><label>Spending category</label><select id="t_cat"></select><label>Affected budget</label><input id="t_bd"><label><input type="checkbox" id="t_def" style="width:auto"> Fill the Add tab with this by default</label>';
  $("t_name").value = t.name || "";
  opt(
    $("t_type"),
    withCur(
      TYPES.map((x) => x[0]),
      t.type,
    ),
    t.type || "",
  );
  $("t_amt").value = t.amt ?? "";
  $("t_nm").value = t.nm || "";
  opt($("t_shop"), withCur(shops(), t.shop), t.shop || "");
  opt(
    $("t_acct"),
    withCur(
      S.accounts.map((a) => a.name),
      t.acct,
    ),
    t.acct || "",
  );
  opt($("t_parent"), withCur(parents(), t.parent), t.parent || "");
  opt(
    $("t_cat"),
    withCur(
      S.cats.filter((c) => c.p == t.parent).map((c) => c.c),
      t.cat,
    ),
    t.cat || "",
  );
  $("t_bd").value = t.budget || "";
  $("t_def").checked = S.tplDef == TT.id;
  $("tpd").style.display = t.name ? "block" : "none";
  $("t_parent").onchange = () =>
    opt(
      $("t_cat"),
      withCur(
        S.cats.filter((c) => c.p == $("t_parent").value).map((c) => c.c),
        "",
      ),
      "",
    );
  $("td").showModal();
}
$("tpn").onclick = () => openTpl();
$("tpl").onclick = (e) => {
  const d = e.target.closest(".li");
  if (d) openTpl(S.tpls.find((t) => t.id == d.dataset.id));
};
$("tpc").onclick = () => $("td").close();
$("tps").onclick = () => {
  const n = $("t_name").value.trim();
  if (!n) return alert("Enter a template name.");
  Object.assign(TT, {
    name: n,
    type: $("t_type").value,
    amt: num($("t_amt").value),
    nm: $("t_nm").value.trim(),
    shop: $("t_shop").value,
    acct: $("t_acct").value,
    parent: $("t_parent").value,
    cat: $("t_cat").value,
    budget: $("t_bd").value.trim(),
  });
  if (!S.tpls.some((x) => x.id == TT.id)) S.tpls.push(TT);
  if ($("t_def").checked) S.tplDef = TT.id;
  else if (S.tplDef == TT.id) S.tplDef = "";
  save();
  $("td").close();
  render();
  fillForm();
};
$("tpd").onclick = () => {
  if (confirm("Delete this template?")) {
    S.tpls = S.tpls.filter((x) => x.id != TT.id);
    if (S.tplDef == TT.id) S.tplDef = "";
    save();
    $("td").close();
    render();
  }
};

// ---------- recurring ----------
const FQ = { w: "Weekly", f: "Fortnightly", m: "Monthly", y: "Yearly" };
function occ(r, n) {
  const [y, m, d] = r.start.split("-").map(Number);
  if (r.freq == "w" || r.freq == "f")
    return new Date(Date.UTC(y, m - 1, d + n * (r.freq == "w" ? 7 : 14)))
      .toISOString()
      .slice(0, 10);
  const t = m - 1 + (r.freq == "m" ? n : n * 12),
    yy = y + Math.floor(t / 12),
    mm = t % 12,
    last = new Date(Date.UTC(yy, mm + 1, 0)).getUTCDate();
  return `${yy}-${z2(mm + 1)}-${z2(Math.min(d, last))}`;
}
function genRules() {
  let c = 0;
  const td = today();
  S.rules.forEach((r) => {
    if (r.off) return;
    for (let i = 0; i < 500; i++) {
      const d = occ(r, r.n);
      if (d > td || (r.end && d > r.end)) break;
      S.txns.push({
        id: "R" + r.id + "_" + d,
        ts: Date.now(),
        sent: 0,
        date: d,
        type: r.type,
        name: r.name,
        shop: r.shop,
        acct: r.acct,
        net: r.net,
        parent: r.parent,
        price: r.price,
        cat: r.cat,
        amt: r.amt,
        budget: r.budget,
      });
      r.n++;
      c++;
    }
  });
  if (c) save();
  return c;
}
window.rulePause = (id) => {
  const r = S.rules.find((x) => x.id == id);
  r.off = !r.off;
  if (!r.off) genRules();
  save();
  render();
};
window.ruleDel = (id) => {
  if (confirm("Delete this repeat? Transactions already created stay.")) {
    S.rules = S.rules.filter((x) => x.id != id);
    save();
    render();
  }
};

// ---------- transactions ----------
const FF = [
  ["type", "Type"],
  ["acct", "Account"],
  ["shop", "Company/shop"],
  ["parent", "Parent category"],
  ["cat", "Category"],
];
const vals = (k) =>
  [...new Set(S.txns.map((t) => t[k]).filter(Boolean))].sort();
function filtered() {
  const q = ($("q").value || "").toLowerCase();
  return S.txns
    .filter(
      (t) =>
        FF.every(([k]) => !F[k] || t[k] == F[k]) &&
        (!F.from || t.date >= F.from) &&
        (!F.to || t.date <= F.to) &&
        (!q ||
          [t.name, t.shop, t.cat, t.parent, t.acct, t.budget]
            .join(" ")
            .toLowerCase()
            .includes(q)),
    )
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}
function renderTx() {
  const r = filtered(),
    k = Object.values(F).filter(Boolean).length;
  $("fo").textContent = "Filter" + (k ? ` (${k})` : "");
  $("ts").textContent =
    `${r.length} of ${S.txns.length} · net ${money(r.reduce((s, t) => s + t.net, 0))}`;
  $("tl").innerHTML =
    r
      .slice(0, lim)
      .map(
        (
          t,
        ) => `<div class="tx" data-id="${h(t.id)}" style="--h:${hue(t.type)}"><div class="top"><b>${h([t.name, t.cat, t.type].find((x) => !bad(x)) || "")}</b><span class="amt ${t.net < 0 ? "n" : ""}">${t.net ? money(t.net) : ""}</span></div>
 <small>${h(t.date)}${bad(t.shop) ? "" : " · " + h(t.shop)}${t.hist || t.sent ? "" : " · not exported"}</small><div>${chip(t.type)}${chip(t.acct)}${chip(t.parent)}${chip(t.cat)}</div></div>`,
      )
      .join("") || '<p class="mute">No transactions match.</p>';
  $("more").style.display = r.length > lim ? "block" : "none";
}
$("more").onclick = () => {
  lim += 100;
  renderTx();
};
$("q").oninput = () => {
  lim = 100;
  renderTx();
};
$("fo").onclick = () => {
  $("ff").innerHTML =
    FF.map(([k, l]) => `<label>${l}</label><select id="f_${k}"></select>`).join(
      "",
    ) +
    '<div class="row"><div><label>From</label><input type="date" id="f_from"></div><div><label>To</label><input type="date" id="f_to"></div></div>';
  FF.forEach(([k]) => opt($("f_" + k), vals(k), F[k] || "", "All"));
  $("f_from").value = F.from || "";
  $("f_to").value = F.to || "";
  $("fd").showModal();
};
$("fa").onclick = () => {
  [...FF.map((x) => x[0]), "from", "to"].forEach(
    (k) => (F[k] = $("f_" + k).value),
  );
  lim = 100;
  $("fd").close();
  renderTx();
};
$("fr").onclick = () => {
  F = {};
  $("fd").close();
  renderTx();
};

// ---------- edit ----------
let ET = null;
const withCur = (l, c) => ["", ...(c && !l.includes(c) ? [c] : []), ...l];
$("tl").onclick = (e) => {
  const d = e.target.closest(".tx");
  ET = d && S.txns.find((t) => t.id == d.dataset.id);
  if (!ET) return;
  const t = ET;
  $("ef").innerHTML =
    '<label>Date</label><input type="date" id="e_date"><label>Type</label><select id="e_type"></select><label>Net impact (negative = money out)</label><input id="e_net" type="number" step="0.01" inputmode="decimal"><label>Transaction name</label><input id="e_name"><label>Company/shop</label><select id="e_shop"></select><label>Account</label><select id="e_acct"></select><label>Share price (Shares accounts only)</label><input id="e_price" type="number" step="0.0001" inputmode="decimal"><label>Parent category</label><select id="e_parent"></select><label>Spending category</label><select id="e_cat"></select><label>Affected budget</label><input id="e_budget">';
  $("e_date").value = t.date || "";
  opt(
    $("e_type"),
    withCur(
      TYPES.map((x) => x[0]),
      t.type,
    ),
    t.type || "",
  );
  $("e_net").value = t.net || "";
  $("e_name").value = t.name || "";
  opt($("e_shop"), withCur(shops(), t.shop), t.shop || "");
  opt(
    $("e_acct"),
    withCur(
      S.accounts.map((a) => a.name),
      t.acct,
    ),
    t.acct || "",
  );
  $("e_price").value = t.price ?? "";
  opt($("e_parent"), withCur(parents(), t.parent), t.parent || "");
  opt(
    $("e_cat"),
    withCur(
      S.cats.filter((c) => c.p == t.parent).map((c) => c.c),
      t.cat,
    ),
    t.cat || "",
  );
  $("e_budget").value = t.budget || "";
  $("e_parent").onchange = () =>
    opt(
      $("e_cat"),
      withCur(
        S.cats.filter((c) => c.p == $("e_parent").value).map((c) => c.c),
        "",
      ),
      "",
    );
  $("ed").showModal();
};
$("ec").onclick = () => $("ed").close();
$("es").onclick = () => {
  const net = num($("e_net").value) || 0;
  if (!$("e_date").value) return alert("Enter a date.");
  Object.assign(ET, {
    date: $("e_date").value,
    type: $("e_type").value,
    net,
    amt: Math.abs(net),
    name: $("e_name").value.trim(),
    shop: $("e_shop").value,
    acct: $("e_acct").value,
    price: num($("e_price").value),
    parent: $("e_parent").value,
    cat: $("e_cat").value,
    budget: $("e_budget").value.trim(),
  });
  if (!ET.hist) ET.sent = 0;
  save();
  $("ed").close();
  render();
};
$("edl").onclick = () => {
  if (confirm("Delete this transaction from this phone?")) {
    S.txns = S.txns.filter((x) => x !== ET);
    save();
    $("ed").close();
    render();
  }
};

$("al").onclick = (e) => {
  const d = e.target.closest(".li[data-n]");
  if (!d) return;
  F = { acct: d.dataset.n };
  $("q").value = "";
  lim = 100;
  location.hash = "#tx";
  renderTx();
};
$("amc").onchange = (e) => {
  const n = e.target.dataset.n;
  if (n == null) return;
  const x = new Set(S.accHide || []);
  e.target.checked ? x.delete(n) : x.add(n);
  S.accHide = [...x];
  save();
  render();
};
$("amc").onclick = (e) => {
  const a = e.target.dataset.all;
  if (a == null) return;
  S.accHide = a == "1" ? [] : S.accounts.map((x) => x.name);
  save();
  render();
};

// ---------- charts ----------
const COL = (i) => `hsl(${Math.round(i * 137.508) % 360} 65% 50%)`;
function donut(items) {
  const tot = items.reduce((s, x) => s + x[1], 0);
  if (!tot) return '<p class="mute">No data.</p>';
  let o = 0;
  const C = 2 * Math.PI * 40;
  return `<div class="dn"><svg viewBox="0 0 120 120" width="150">${items
    .map(([k, v], i) => {
      const l = (v / tot) * C,
        s = `<circle r="40" cx="60" cy="60" fill="none" stroke="${COL(i)}" stroke-width="22" stroke-dasharray="${l} ${C - l}" stroke-dashoffset="${-o}" transform="rotate(-90 60 60)"><title>${h(k)}: ${money(v)}</title></circle>`;
      o += l;
      return s;
    })
    .join("")}</svg>
 <div>${items.map(([k, v], i) => `<div class="lg"><i style="background:${COL(i)}"></i>${h(k)} <span class="mute">${money(v)}</span></div>`).join("")}</div></div>`;
}
const nice = (v) => {
    const e = 10 ** Math.floor(Math.log10(v)),
      f = v / e;
    return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * e;
  },
  kf = (v) => "$" + (v >= 1e3 ? +(v / 1e3).toFixed(1) + "k" : Math.round(v));
function plot(ser, kind) {
  const P = ser[0] ? ser[0].p : [];
  if (!P.length) return '<p class="mute">No data.</p>';
  const W = 330,
    H = 170,
    L = 46,
    R = 8,
    B = 20,
    T = 8,
    n = P.length,
    m = nice(Math.max(...ser.flatMap((s) => s.p.map((p) => p[1])), 1)),
    y = (v) => H - B - (v / m) * (H - B - T),
    bw = (W - L - R) / n,
    X = (i) =>
      kind == "line"
        ? L + (i * (W - L - R)) / Math.max(n - 1, 1)
        : L + (i + 0.5) * bw;
  let g = "";
  [0, 0.5, 1].forEach(
    (f) =>
      (g += `<line x1="${L}" x2="${W - R}" y1="${y(m * f)}" y2="${y(m * f)}" style="stroke:var(--line)"/><text x="${L - 4}" y="${y(m * f) + 3}" text-anchor="end" class="ax">${kf(m * f)}</text>`),
  );
  const body = ser
    .map((s) =>
      kind == "line"
        ? `<polyline fill="none" stroke-width="2" style="stroke:${s.c}" points="${s.p.map((p, i) => X(i) + "," + y(p[1])).join(" ")}"/>` +
          (n <= 60
            ? s.p
                .map(
                  (p, i) =>
                    `<circle cx="${X(i)}" cy="${y(p[1])}" r="2.2" style="fill:${s.c}"><title>${p[0]}: ${money(p[1])}</title></circle>`,
                )
                .join("")
            : "")
        : s.p
            .map(
              (p, i) =>
                `<rect x="${L + i * bw + 1}" y="${y(p[1])}" width="${Math.max(bw - 2, 1)}" height="${y(0) - y(p[1])}" style="fill:${s.c}"><title>${p[0]}: ${money(p[1])}</title></rect>`,
            )
            .join(""),
    )
    .join("");
  const lab = (i, a) =>
    `<text x="${X(i)}" y="${H - 5}" text-anchor="${a}" class="ax">${P[i][0]}</text>`;
  return `<svg viewBox="0 0 ${W} ${H}" width="100%">${g}${body}${lab(0, "start")}${n > 4 ? lab(n >> 1, "middle") : ""}${n > 1 ? lab(n - 1, "end") : ""}</svg>`;
}
function mrange(a, b) {
  const r = [];
  let [y, m] = a.split("-").map(Number);
  while (`${y}-${z2(m)}` <= b && r.length < 600) {
    r.push(`${y}-${z2(m)}`);
    if (++m > 12) {
      m = 1;
      y++;
    }
  }
  return r;
}
function bars(e) {
  const mx = e.length ? e[0][1] : 1;
  return e.length
    ? e
        .map(
          ([k, v]) =>
            `<div class="bar"><span>${h(k)}</span><span><i style="width:${(v / mx) * 100}%;background:${PAL(k)}"></i></span><span class="amt">${money(v)}</span></div>`,
        )
        .join("")
    : '<p class="mute">No data.</p>';
}
function renderCharts() {
  $("c0").innerHTML = donut(
    S.accounts
      .map((a) => [a.name, bal(a)])
      .filter((x) => x[1] > 0)
      .sort((a, b) => b[1] - a[1]),
  );

  const ex = {},
    inc = {};
  S.txns
    .filter((t) => t.net && t.date.length >= 7)
    .forEach((t) => {
      const m = t.date.slice(0, 7);
      if (t.net < 0) ex[m] = (ex[m] || 0) - t.net;
      else inc[m] = (inc[m] || 0) + t.net;
    });
  const ks = [...Object.keys(ex), ...Object.keys(inc)].sort();
  if (ks.length) {
    let a = ks[0],
      b = ks.at(-1);
    if ($("r1").value > a) a = $("r1").value;
    if ($("r2").value && $("r2").value < b) b = $("r2").value;
    const mm = mrange(a, b);
    $("c1").innerHTML =
      '<div class="lg"><i style="background:var(--neg)"></i>Expenses <i style="background:var(--pos);margin-left:12px"></i>Income</div>' +
      plot(
        [
          { c: "var(--neg)", p: mm.map((k) => [k, ex[k] || 0]) },
          { c: "var(--pos)", p: mm.map((k) => [k, inc[k] || 0]) },
        ],
        "line",
      );
  } else $("c1").innerHTML = plot([]);
  const yrs = [
    ...new Set(S.txns.map((t) => t.date.slice(0, 4)).filter(Boolean)),
  ]
    .sort()
    .reverse();
  let v = $("ey").value;
  if (!$("ey").dataset.i && yrs.length) {
    $("ey").dataset.i = 1;
    v = yrs[0];
  }
  opt($("ey"), yrs, v, "All years");
  if (!$("em").options.length)
    $("em").innerHTML =
      '<option value="">All months</option>' +
      [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ]
        .map((m, i) => `<option value="${z2(i + 1)}">${m}</option>`)
        .join("");
  const y = $("ey").value;
  $("em").disabled = !y;
  if (!y) $("em").value = "";
  const mo = $("em").value,
    k = $("ek").value,
    g = $("eg").value,
    pre = y && mo ? `${y}-${mo}` : y;
  const rows = S.txns.filter(
    (t) =>
      (k == "e" ? t.net < 0 : t.net > 0) &&
      t.date.length >= 7 &&
      t.date.startsWith(pre || ""),
  );
  const sum = {};
  rows.forEach((t) => {
    const d = y && mo ? t.date : t.date.slice(0, 7);
    sum[d] = (sum[d] || 0) + Math.abs(t.net);
  });
  let keys;
  if (y && mo)
    keys = [...Array(new Date(+y, +mo, 0).getDate())].map(
      (_, i) => `${y}-${mo}-${z2(i + 1)}`,
    );
  else if (y) keys = [...Array(12)].map((_, i) => `${y}-${z2(i + 1)}`);
  else {
    const a = Object.keys(sum).sort();
    keys = a.length ? mrange(a[0], a.at(-1)) : [];
  }
  $("t2").textContent =
    (k == "e" ? "Spending" : "Income") +
    " by " +
    (y && mo ? "day" : "month") +
    " · " +
    money(rows.reduce((s, t) => s + Math.abs(t.net), 0));
  $("c2").innerHTML = plot(
    [
      {
        c: k == "e" ? "var(--neg)" : "var(--pos)",
        p: keys.map((d) => [d, sum[d] || 0]),
      },
    ],
    "bars",
  );
  const gr = {};
  rows.forEach((t) => {
    const key = t[g] || "(none)";
    gr[key] = (gr[key] || 0) + Math.abs(t.net);
  });
  $("c3").innerHTML = bars(
    Object.entries(gr)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15),
  );
}
["ek", "ey", "em", "eg", "r1", "r2"].forEach(
  (i) => ($(i).onchange = renderCharts),
);

// ---------- accounts / recurring / sync ----------
function render() {
  $("d").value = $("d").value || today();
  const hid = new Set(S.accHide || []),
    b = S.accounts.filter((a) => !hid.has(a.name)).map((a) => [a, info(a)]);
  $("ams").textContent = `Accounts: ${b.length} of ${S.accounts.length} shown`;
  $("amc").innerHTML =
    '<div class="row"><button class="s sm" data-all="1">All</button><button class="s sm" data-all="0">None</button></div>' +
    S.accounts
      .map(
        (a) =>
          `<label class="ck"><input type="checkbox" data-n="${h(a.name)}" ${hid.has(a.name) ? "" : "checked"}> ${h(a.name)}</label>`,
      )
      .join("");
  $("al").innerHTML = S.accounts.length
    ? `<div class="li"><b>Total</b><b class="amt">${money(b.reduce((s, x) => s + x[1].v, 0))}</b></div>` +
      b
        .map(
          ([a, i]) =>
            `<div class="li" data-n="${h(a.name)}" style="cursor:pointer"><div>${h(a.name)}<small>${bad(a.inst) ? "" : h(a.inst) + " "}${i.pr != null ? `<br>${i.u.toLocaleString("en-AU", { maximumFractionDigits: 4 })} units @ ${money(i.pr)}` : ""}</small></div><div class="amt ${i.v < 0 ? "n" : ""}">${money(i.v)}<br>${chip(a.type)}</div></div>`,
        )
        .join("") +
      '<p class="mute">Tap an account to see its transactions.</p>'
    : '<p class="mute">No accounts yet. Save your Accounts table as CSV and import it on the Sync tab.</p>';
  $("rl2").innerHTML =
    S.rules
      .map(
        (
          r,
        ) => `<div class="li"><div>${h(r.name || r.cat)}<small>${FQ[r.freq]} · next ${r.off ? "paused" : occ(r, r.n)}${r.end ? " · until " + r.end : ""}</small>${chip(r.acct)}${chip(r.cat)}
  <br><button class="s sm" onclick="rulePause('${r.id}')">${r.off ? "Resume" : "Pause"}</button><button class="s sm" onclick="ruleDel('${r.id}')">Delete</button></div><div class="amt ${r.net < 0 ? "n" : ""}">${money(r.net)}</div></div>`,
      )
      .join("") || '<p class="mute">No repeating transactions yet.</p>';
  const cur = $("tp").value;
  $("tp").innerHTML =
    '<option value="">No template</option>' +
    S.tpls
      .map((t) => `<option value="${h(t.id)}">${h(t.name)}</option>`)
      .join("");
  $("tp").value = cur;
  $("tpl").innerHTML =
    S.tpls
      .map(
        (t) =>
          `<div class="li" data-id="${h(t.id)}" style="cursor:pointer"><div>${h(t.name)}${S.tplDef == t.id ? " · default" : ""}<small>${h(t.nm || "")}</small>${chip(t.acct)}${chip(t.cat)}</div><div class="amt">${t.amt ? money(t.amt) : ""}</div></div>`,
      )
      .join("") || '<p class="mute">No templates yet.</p>';
  const p = phone(),
    u = p.filter((t) => !t.sent).length;
  $("st").textContent =
    `${u} not yet exported · ${p.length} entered on this phone · ${S.txns.length - p.length} history rows · ${S.accounts.length} accounts · ${shops().length} shops`;
  $("rl").innerHTML =
    p
      .slice(-10)
      .reverse()
      .map(
        (t) =>
          `<div class="li"><div>${h(t.name || t.cat)}<small>${t.date} · ${h(t.acct)}${t.sent ? "" : " · not exported"}</small></div><div class="amt ${t.net < 0 ? "n" : ""}">${money(t.net)}</div></div>`,
      )
      .join("") || '<p class="mute">Nothing yet.</p>';
  renderTx();
  renderCharts();
}

const COLS = [
  "Transaction Date",
  "Transaction Type",
  "Transaction Name",
  "Company/Shop",
  "Linked Account",
  "Net Impact",
  "Parent Category",
  "Share Price",
  "Spending Category",
  "Transaction Amount",
  "Affected Budget",
  "Phone ID",
];
function exp(all) {
  const r = phone().filter((t) => all || !t.sent);
  if (!r.length) return alert("Nothing to export.");
  const rows = r.map((t) => [
    t.date,
    t.type,
    t.name,
    t.shop,
    t.acct,
    t.net.toFixed(2),
    t.parent,
    t.price ?? "",
    t.cat,
    t.amt.toFixed(2),
    t.budget,
    t.id,
  ]);
  const b = new Blob(
      [
        "\uFEFF" +
          [COLS, ...rows].map((x) => x.map(cesc).join(",")).join("\r\n"),
      ],
      { type: "text/csv" },
    ),
    a = document.createElement("a"),
    n = new Date();
  a.href = URL.createObjectURL(b);
  a.download = `phone_txns_${n.getFullYear()}${z2(n.getMonth() + 1)}${z2(n.getDate())}_${z2(n.getHours())}${z2(n.getMinutes())}${z2(n.getSeconds())}.csv`;
  a.click();
  r.forEach((t) => (t.sent = 1));
  save();
  render();
}
async function put(name, text) {
  const b = new Blob(["\uFEFF" + text], { type: "text/csv" });
  if (window.showSaveFilePicker) {
    try {
      const fh = await showSaveFilePicker({
        suggestedName: name,
        types: [{ description: "CSV", accept: { "text/csv": [".csv"] } }],
      });
      const w = await fh.createWritable();
      await w.write(b);
      await w.close();
      return 1;
    } catch (e) {
      if (e.name == "AbortError") return 0;
    }
  }
  const a = document.createElement("a");
  a.href = URL.createObjectURL(b);
  a.download = name;
  a.click();
  return 1;
}
async function expFull() {
  if (!S.txns.length) return alert("Nothing to export.");
  const rows = S.txns.map((t) => [
    t.date,
    t.type,
    t.name,
    t.shop,
    t.acct,
    t.net ? t.net.toFixed(2) : "",
    t.parent,
    t.price ?? "",
    t.cat,
    t.amt ? t.amt.toFixed(2) : "",
    t.budget,
    /^H\d+$/.test(t.id) ? "" : t.id,
  ]);
  if (
    await put(
      "transactions.csv",
      [COLS, ...rows].map((x) => x.map(cesc).join(",")).join("\r\n"),
    )
  ) {
    phone().forEach((t) => (t.sent = 1));
    save();
    render();
  }
}
$("exf").onclick = expFull;
$("ex").onclick = () => exp(0);
$("exa").onclick = () => exp(1);
const dlcsv = (name, head, rows) =>
  put(name, [head, ...rows].map((x) => x.map(cesc).join(",")).join("\r\n"));
const KINDS = {
  accounts: {
    l: "accounts",
    n: () => S.accounts.length,
    exp: () =>
      dlcsv(
        "accounts.csv",
        [
          "Type",
          "Institution",
          "Account Name",
          "Initial Balance",
          "Latest Share Price",
        ],
        S.accounts.map((a) => [a.type, a.inst, a.name, a.init, a.price ?? ""]),
      ),
  },
  cats: {
    l: "categories",
    n: () => S.cats.length,
    exp: () =>
      dlcsv(
        "categories.csv",
        ["Parent Category Name", "Category Name"],
        S.cats.filter((c) => c.c).map((c) => [c.p, c.c]),
      ),
  },
  shops: {
    l: "shops",
    n: () => S.shops.length,
    exp: () =>
      dlcsv(
        "shops.csv",
        ["Company/Shop"],
        shops().map((x) => [x]),
      ),
  },
  hist: {
    l: "history rows",
    n: () => S.txns.filter((t) => t.hist).length,
    exp: () => expFull(),
  },
};
$("xr").onclick = (e) => {
  const k = e.target.dataset.x;
  if (k) KINDS[k].exp();
};
const ask = (K) =>
  new Promise((r) => {
    $("ovt").textContent =
      `Importing will overwrite the ${K.n()} ${K.l} currently on this phone. Download a copy of the existing data first?`;
    const done = (v) => {
      $("ov").close();
      r(v);
    };
    $("ov").oncancel = () => r(0);
    $("ovb").onclick = async () => {
      await K.exp();
      done(1);
    };
    $("ovg").onclick = () => done(1);
    $("ovn").onclick = () => done(0);
    $("ov").showModal();
  });
$("im").onchange = async (e) => {
  const log = [];
  for (const f of e.target.files) {
    const r = csv(await f.text()),
      x0 = r[0] || {},
      k =
        "Account Name" in x0
          ? "accounts"
          : "Category Name" in x0
            ? "cats"
            : "Transaction Date" in x0
              ? "hist"
              : "Company/Shop" in x0
                ? "shops"
                : "";
    if (!k) {
      log.push("skipped " + f.name);
      continue;
    }
    if (KINDS[k].n() && !(await ask(KINDS[k]))) {
      log.push("cancelled " + KINDS[k].l);
      continue;
    }
    if (k == "accounts") {
      S.accounts = r
        .filter((x) => x["Account Name"])
        .map((x) => ({
          type: x.Type,
          inst: x.Institution,
          name: x["Account Name"],
          init: num(x["Initial Balance"]) || 0,
          price: num(x["Latest Share Price"]),
        }));
      log.push("accounts");
    } else if (k == "cats") {
      S.cats = r
        .filter((x) => x["Category Name"])
        .map((x) => ({ p: x["Parent Category Name"], c: x["Category Name"] }));
      log.push("categories");
    } else if (k == "shops") {
      S.shops = r.map((x) => x["Company/Shop"]).filter(Boolean);
      log.push("shops");
    } else {
      const hs = r.map((x, i) => ({
        hist: 1,
        id: x["Phone ID"] || "H" + i,
        date: iso(x["Transaction Date"]),
        type: fixT(x["Transaction Type"]),
        name: x["Transaction Name"],
        shop: x["Company/Shop"],
        acct: x["Linked Account"],
        net: num(x["Net Impact"]) || 0,
        price: num(x["Share Price"]),
        parent: x["Parent Category"],
        cat: x["Spending Category"],
        amt: num(x["Transaction Amount"]) || 0,
        budget: x["Affected Budget"],
      }));
      const ids = new Set(hs.map((x) => x.id));
      S.txns = [...hs, ...S.txns.filter((t) => !t.hist && !ids.has(t.id))];
      log.push(hs.length + " history rows");
    }
  }
  save();
  fillForm();
  render();
  alert("Imported: " + log.join(", "));
  e.target.value = "";
};
$("clr").onclick = () => {
  if (
    confirm(
      "Delete all data on this phone? Unexported transactions will be lost.",
    )
  ) {
    S = {
      accounts: [],
      cats: [],
      shops: [],
      txns: [],
      rules: [],
      tpls: [],
      tplDef: "",
      accHide: [],
    };
    save();
    fillForm();
    render();
  }
};

const tabs = [...document.querySelectorAll("nav a")];
function nav() {
  const t = (location.hash || "#add").slice(1);
  document
    .querySelectorAll(".sec")
    .forEach((s) => s.classList.toggle("on", s.id == t));
  tabs.forEach((a) => a.classList.toggle("on", a.hash == "#" + t));
  scrollTo(0, 0);
}
addEventListener("hashchange", nav);
document.addEventListener("visibilitychange", () => {
  if (!document.hidden && genRules()) render();
});
genRules();
fillForm();
render();
applyDef();
nav();
if ("serviceWorker" in navigator)
  navigator.serviceWorker.register("sw.js").catch(() => {});
