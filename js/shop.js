/* Vespera shop front: products, bag, mood finder.
   Change prices, names and notes here. Prices are in South African rand (ZAR). */
(() => {
  const CURRENCY = "ZAR";
  const FREE_SHIPPING_OVER = 1500;

  const PRODUCTS = [
    { id: "golden-hour", no: "No. 01", name: "Golden Hour", img: "assets/img/product-golden.webp",
      notes: "Bergamot · Magnolia · Amber", blurb: "Warm skin, last sun. The signature.",
      moods: ["calm", "romantic"], prices: { 50: 1450, 100: 2250 } },
    { id: "blue-hour", no: "No. 02", name: "Blue Hour", img: "assets/img/product-blue.webp",
      notes: "Sea salt · Iris · Cedar", blurb: "Cool, clear and quietly confident.",
      moods: ["fresh", "calm"], prices: { 50: 1450, 100: 2250 } },
    { id: "garden", no: "No. 03", name: "Garden", img: "assets/img/product-garden.webp",
      notes: "Peony · Magnolia · White musk", blurb: "Petals after rain. Soft and bright.",
      moods: ["romantic", "joyful"], prices: { 50: 1550, 100: 2350 } },
    { id: "noir", no: "No. 04", name: "Noir", img: "assets/img/product-noir.webp",
      notes: "Black pepper · Oud · Vanilla", blurb: "After dark. Deep, smoky, unforgettable.",
      moods: ["bold", "mysterious"], prices: { 50: 1650, 100: 2550 } },
  ];

  const MOOD_COPY = {
    calm: "Unhurried and glowing.", fresh: "Clean air and open windows.",
    romantic: "Soft, close, a little daring.", joyful: "Light on your feet.",
    bold: "Walk in like you own the room.", mysterious: "A scent people follow.",
  };

  const money = new Intl.NumberFormat("en-ZA", { style: "currency", currency: CURRENCY, maximumFractionDigits: 0 });
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const byId = (id) => PRODUCTS.find((p) => p.id === id);

  // ---------- Cart state ----------
  const KEY = "vespera-bag-v1";
  let cart = [];
  try { cart = JSON.parse(localStorage.getItem(KEY) || "[]").filter((l) => byId(l.id)); } catch { cart = []; }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(cart)); } catch { /* storage may be blocked */ } };

  const lineKey = (l) => l.id + "|" + l.size;
  const count = () => cart.reduce((n, l) => n + l.qty, 0);
  const subtotal = () => cart.reduce((s, l) => s + byId(l.id).prices[l.size] * l.qty, 0);

  function add(id, size) {
    const found = cart.find((l) => l.id === id && l.size === size);
    if (found) found.qty += 1; else cart.push({ id, size, qty: 1 });
    save(); renderCart(); openDrawer();
  }
  function change(key, delta) {
    const l = cart.find((x) => lineKey(x) === key);
    if (!l) return;
    l.qty += delta;
    if (l.qty <= 0) cart = cart.filter((x) => x !== l);
    save(); renderCart();
  }

  // ---------- Products ----------
  const grid = $("#products");
  function renderProducts() {
    grid.textContent = "";
    PRODUCTS.forEach((p) => {
      const card = document.createElement("article");
      card.className = "product";
      card.id = "p-" + p.id;
      card.dataset.size = "100";

      const fig = document.createElement("div");
      fig.className = "product__img";
      const img = document.createElement("img");
      img.src = p.img; img.alt = `Vespera ${p.name} bottle`; img.loading = "lazy"; img.width = 900; img.height = 1200;
      fig.appendChild(img);

      const body = document.createElement("div");
      body.className = "product__body";
      const no = document.createElement("p"); no.className = "eyebrow"; no.textContent = p.no;
      const h3 = document.createElement("h3"); h3.textContent = p.name;
      const notes = document.createElement("p"); notes.className = "product__notes"; notes.textContent = p.notes;
      const blurb = document.createElement("p"); blurb.className = "product__blurb"; blurb.textContent = p.blurb;

      const sizes = document.createElement("div");
      sizes.className = "sizes"; sizes.setAttribute("role", "group"); sizes.setAttribute("aria-label", `${p.name} size`);
      [50, 100].forEach((s) => {
        const b = document.createElement("button");
        b.type = "button"; b.className = "size" + (s === 100 ? " is-on" : "");
        b.dataset.size = s; b.textContent = s + " ml"; b.setAttribute("aria-pressed", s === 100 ? "true" : "false");
        b.addEventListener("click", () => {
          card.dataset.size = String(s);
          $$(".size", sizes).forEach((x) => { const on = x === b; x.classList.toggle("is-on", on); x.setAttribute("aria-pressed", on ? "true" : "false"); });
          price.textContent = money.format(p.prices[s]);
        });
        sizes.appendChild(b);
      });

      const row = document.createElement("div");
      row.className = "product__row";
      const price = document.createElement("strong"); price.className = "product__price"; price.textContent = money.format(p.prices[100]);
      const addBtn = document.createElement("button");
      addBtn.type = "button"; addBtn.className = "btn btn--gold"; addBtn.textContent = "Add to bag";
      addBtn.addEventListener("click", () => add(p.id, Number(card.dataset.size)));
      row.append(price, addBtn);

      body.append(no, h3, notes, blurb, sizes, row);
      card.append(fig, body);
      grid.appendChild(card);
    });
  }

  // ---------- Bag drawer ----------
  const drawer = $("#drawer"), scrim = $(".scrim");
  const itemsEl = $("#cartItems"), emptyEl = $("#cartEmpty"), subEl = $("#cartSubtotal"), shipEl = $("#cartShip"), checkoutBtn = $("#checkoutBtn");
  let lastFocus = null;

  function renderCart() {
    $$("[data-cart-count]").forEach((el) => { el.textContent = String(count()); });
    itemsEl.textContent = "";
    cart.forEach((l) => {
      const p = byId(l.id);
      const li = document.createElement("li"); li.className = "line";
      const img = document.createElement("img"); img.src = p.img; img.alt = ""; img.width = 64; img.height = 80;
      const info = document.createElement("div");
      const name = document.createElement("strong"); name.textContent = `${p.name} · ${l.size} ml`;
      const each = document.createElement("span"); each.textContent = money.format(p.prices[l.size]);
      info.append(name, each);
      const qty = document.createElement("div"); qty.className = "qty";
      const minus = document.createElement("button"); minus.type = "button"; minus.textContent = "−"; minus.setAttribute("aria-label", `Remove one ${p.name}`);
      const n = document.createElement("span"); n.textContent = String(l.qty);
      const plus = document.createElement("button"); plus.type = "button"; plus.textContent = "+"; plus.setAttribute("aria-label", `Add one ${p.name}`);
      minus.addEventListener("click", () => change(lineKey(l), -1));
      plus.addEventListener("click", () => change(lineKey(l), +1));
      qty.append(minus, n, plus);
      li.append(img, info, qty);
      itemsEl.appendChild(li);
    });
    const total = subtotal();
    emptyEl.hidden = cart.length > 0;
    subEl.textContent = money.format(total);
    checkoutBtn.disabled = cart.length === 0;
    shipEl.textContent = total === 0 ? `Free delivery over ${money.format(FREE_SHIPPING_OVER)}.`
      : total >= FREE_SHIPPING_OVER ? "You've unlocked free delivery ✦"
      : `Add ${money.format(FREE_SHIPPING_OVER - total)} more for free delivery.`;
  }

  function openDrawer() {
    lastFocus = document.activeElement;
    scrim.hidden = false; drawer.classList.add("is-open"); drawer.setAttribute("aria-hidden", "false");
    document.body.classList.add("no-scroll");
    window.__lenis && window.__lenis.stop();
    $(".drawer__close", drawer).focus();
  }
  function closeDrawer() {
    scrim.hidden = true; drawer.classList.remove("is-open"); drawer.setAttribute("aria-hidden", "true");
    document.body.classList.remove("no-scroll");
    window.__lenis && window.__lenis.start();
    lastFocus && lastFocus.focus && lastFocus.focus();
  }
  $$("[data-cart-open]").forEach((b) => b.addEventListener("click", openDrawer));
  $$("[data-cart-close]").forEach((b) => b.addEventListener("click", closeDrawer));
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && drawer.classList.contains("is-open")) closeDrawer(); });

  // ---------- Checkout (demo) ----------
  const modal = $("#checkoutModal");
  checkoutBtn.addEventListener("click", () => {
    $("#checkoutSummary").textContent = `${count()} item${count() === 1 ? "" : "s"} · ${money.format(subtotal())}`;
    if (modal.showModal) modal.showModal(); else modal.setAttribute("open", "");
  });
  $("#checkoutClose").addEventListener("click", () => (modal.close ? modal.close() : modal.removeAttribute("open")));

  // ---------- Mood finder ----------
  const result = $("#finderResult");
  $$(".mood").forEach((btn) => {
    btn.addEventListener("click", () => {
      $$(".mood").forEach((b) => b.classList.toggle("is-on", b === btn));
      const mood = btn.dataset.mood;
      const match = PRODUCTS.find((p) => p.moods[0] === mood) || PRODUCTS.find((p) => p.moods.includes(mood));
      if (!match) return;
      result.textContent = "";
      const img = document.createElement("img"); img.src = match.img; img.alt = `${match.name} bottle`; img.width = 180; img.height = 240;
      const txt = document.createElement("div");
      const lead = document.createElement("p"); lead.className = "eyebrow"; lead.textContent = MOOD_COPY[mood];
      const h = document.createElement("h3"); h.textContent = `${match.no} ${match.name}`;
      const n = document.createElement("p"); n.textContent = match.notes;
      const go = document.createElement("a"); go.className = "btn btn--gold"; go.href = "#p-" + match.id; go.textContent = "See it in the shop";
      go.addEventListener("click", (e) => {
        e.preventDefault();
        const target = document.getElementById("p-" + match.id);
        if (window.__lenis) window.__lenis.scrollTo(target, { offset: -90 }); else target.scrollIntoView({ behavior: "smooth", block: "center" });
        target.classList.add("is-flash"); setTimeout(() => target.classList.remove("is-flash"), 1800);
      });
      txt.append(lead, h, n, go);
      result.append(img, txt);
      result.hidden = false;
    });
  });

  renderProducts();
  renderCart();
})();
