/**
 * Spazio operator console — foundation shell (build plan §1.7, §0.1#5).
 * Vanilla JS over the session-guarded /api/v1/operator API; no framework, no
 * build step. The three queues here are skeletons — the full curation, review,
 * and fulfilment UX belongs to FEAT-015 / FEAT-006 / FEAT-011.
 */
(() => {
  "use strict";

  const API = "/api/v1/operator";
  const $ = (id) => document.getElementById(id);
  const cop = new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  });

  /** Same-origin fetch; a 401 anywhere sends the operator back to sign-in. */
  async function api(path, options = {}) {
    const response = await fetch(API + path, {
      credentials: "same-origin",
      headers: options.body ? { "content-type": "application/json" } : undefined,
      ...options,
    });
    if (response.status === 401) {
      showLogin();
      throw new Error("unauthorized");
    }
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body.message || `Request failed (${response.status})`);
    }
    return response.status === 204 ? null : response.json();
  }

  // Monotonic token per queue: a response only renders if it is still the
  // latest request for that queue (drops stale/raced responses).
  const viewTokens = { renders: 0, catalog: 0, orders: 0 };

  function invalidateViews() {
    for (const name of Object.keys(viewTokens)) viewTokens[name] += 1;
  }

  function showLogin() {
    invalidateViews();
    $("shell-view").hidden = true;
    $("login-view").hidden = false;
  }

  /** Fresh shell state: renders tab active, all queue lists emptied. */
  function resetShell() {
    invalidateViews();
    document.querySelectorAll(".tab").forEach((tab) => {
      tab.classList.toggle("active", tab.dataset.tab === "renders");
    });
    document.querySelectorAll(".tab-panel").forEach((panel) => {
      panel.hidden = panel.id !== "tab-renders";
    });
    for (const name of Object.keys(viewTokens)) $(`${name}-list`).replaceChildren();
  }

  function showShell(operator) {
    $("login-view").hidden = true;
    $("shell-view").hidden = false;
    $("operator-name").textContent = operator.role
      ? `${operator.name} · ${operator.role}`
      : operator.name;
    resetShell();
    refresh("renders");
  }

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function renderEmpty(container, message) {
    container.replaceChildren(el("div", "empty", message));
  }

  function row({ title, badges = [], meta = [], actions = [] }) {
    const root = el("div", "row");
    const grow = el("div", "grow");
    grow.append(el("div", "title", title));
    for (const item of meta) grow.append(el("div", "muted", item));
    root.append(grow);
    for (const badge of badges) root.append(el("span", "badge", badge));
    if (actions.length > 0) {
      const actionBox = el("div", "actions");
      for (const { label, className, onClick } of actions) {
        const button = el("button", className, label);
        button.addEventListener("click", async () => {
          button.disabled = true;
          try {
            await onClick();
          } catch (error) {
            alert(error.message);
          } finally {
            button.disabled = false;
          }
        });
        actionBox.append(button);
      }
      root.append(actionBox);
    }
    return root;
  }

  // --- Render review queue (FR-027) ---
  async function loadRenders(token) {
    const status = $("renders-status").value;
    const { renders } = await api(`/renders?status=${status}`);
    if (token !== viewTokens.renders) return;
    const list = $("renders-list");
    if (renders.length === 0) return renderEmpty(list, `No ${status} renders.`);
    list.replaceChildren(
      ...renders.map((render) =>
        row({
          title: `Render ${render.id.slice(0, 8)}`,
          meta: [
            `project ${render.projectId.slice(0, 8)} · created ${new Date(render.createdAt).toLocaleString()}`,
            render.imageKey ? `image: ${render.imageKey}` : "image: not yet produced",
          ],
          badges: [render.reviewStatus],
          actions:
            render.reviewStatus === "pending_review"
              ? [
                  {
                    label: "Approve",
                    className: "primary",
                    onClick: async () => {
                      await api(`/renders/${render.id}/approve`, { method: "POST" });
                      refresh("renders");
                    },
                  },
                  {
                    label: "Reject",
                    className: "danger",
                    onClick: async () => {
                      await api(`/renders/${render.id}/reject`, { method: "POST" });
                      refresh("renders");
                    },
                  },
                ]
              : [],
        }),
      ),
    );
  }

  // --- Catalog curation (FR-056–059) ---
  async function loadCatalog(token) {
    const filter = $("catalog-filter").value;
    const { products } = await api(`/catalog/products${filter ? `?filter=${filter}` : ""}`);
    if (token !== viewTokens.catalog) return;
    const list = $("catalog-list");
    if (products.length === 0) return renderEmpty(list, "No SKUs match this filter.");
    list.replaceChildren(
      ...products.map((product) =>
        row({
          title: `${product.name} (${product.sku})`,
          meta: [
            `${product.category} · ${cop.format(product.priceCop)} · ${product.classification}` +
              (product.stock != null ? ` · stock ${product.stock}` : ""),
            `styles: ${product.styleAttributes.join(", ") || "—"}`,
          ],
          badges: [product.completenessStatus, product.approvalStatus],
          actions:
            product.approvalStatus === "pending"
              ? [
                  {
                    label: "Approve",
                    className: "primary",
                    onClick: async () => {
                      await api(`/catalog/products/${product.id}/approve`, { method: "POST" });
                      refresh("catalog");
                    },
                  },
                  {
                    label: "Reject",
                    className: "danger",
                    onClick: async () => {
                      await api(`/catalog/products/${product.id}/reject`, { method: "POST" });
                      refresh("catalog");
                    },
                  },
                ]
              : [],
        }),
      ),
    );
  }

  // --- Order forwarding (FR-061) ---
  async function loadOrders(token) {
    const status = $("orders-status").value;
    const { orders } = await api(`/orders?status=${status}`);
    if (token !== viewTokens.orders) return;
    const list = $("orders-list");
    if (orders.length === 0) return renderEmpty(list, `No ${status} orders.`);
    list.replaceChildren(
      ...orders.map((order) =>
        row({
          title: `Order ${order.id.slice(0, 8)} · ${cop.format(order.totalCop)}`,
          meta: [
            `${order.contactEmail} · ${order.contactPhone} · ${order.shippingCity}`,
            `${order.purchaseOrders.length} purchase order(s) · created ${new Date(order.createdAt).toLocaleString()}`,
          ],
          badges: [order.status],
          actions:
            order.status === "paid_unforwarded"
              ? [
                  {
                    label: "Mark forwarded",
                    className: "primary",
                    onClick: async () => {
                      await api(`/orders/${order.id}/forward`, { method: "POST" });
                      refresh("orders");
                    },
                  },
                ]
              : [],
        }),
      ),
    );
  }

  const loaders = { renders: loadRenders, catalog: loadCatalog, orders: loadOrders };

  function refresh(name) {
    const token = ++viewTokens[name];
    loaders[name](token).catch((error) => {
      if (error.message !== "unauthorized" && token === viewTokens[name]) {
        renderEmpty($(`${name}-list`), `Could not load: ${error.message}`);
      }
    });
  }

  // --- Wiring ---
  $("login-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const errorBox = $("login-error");
    errorBox.hidden = true;
    try {
      const { operator } = await api("/session", {
        method: "POST",
        body: JSON.stringify({
          email: $("login-email").value.trim(),
          password: $("login-password").value,
        }),
      });
      $("login-password").value = "";
      showShell(operator);
    } catch (error) {
      errorBox.textContent =
        error.message === "unauthorized" ? "Invalid credentials." : error.message;
      errorBox.hidden = false;
    }
  });

  $("logout").addEventListener("click", async () => {
    await api("/session", { method: "DELETE" }).catch(() => {});
    showLogin();
  });

  document.querySelectorAll(".tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      document.querySelectorAll(".tab-panel").forEach((panel) => (panel.hidden = true));
      $(`tab-${tab.dataset.tab}`).hidden = false;
      refresh(tab.dataset.tab);
    });
  });

  document.querySelectorAll(".refresh").forEach((button) => {
    button.addEventListener("click", () => refresh(button.dataset.refresh));
  });

  $("renders-status").addEventListener("change", () => refresh("renders"));
  $("catalog-filter").addEventListener("change", () => refresh("catalog"));
  $("orders-status").addEventListener("change", () => refresh("orders"));

  // Boot: resume an existing session or show sign-in.
  api("/session")
    .then(({ operator }) => showShell(operator))
    .catch(() => showLogin());
})();
