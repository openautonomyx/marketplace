/*
 * OpenAutonomyX Marketplace — modular front-end components.
 *
 * Native Web Components (custom elements), no framework, no build step.
 * Content lives in the data lists below; section components render from them,
 * composing the reusable atoms (oax-card, oax-step, oax-tag, oax-list).
 * All components are registered at the bottom via registerComponents().
 */

/* ------------------------------------------------------------------ data --- */

const PILLARS = [
  {
    icon: "🎯",
    title: "Contextual, not universal",
    body: "One skill, many scores — each measured against your real environment, never a single global rating."
  },
  {
    icon: "📊",
    title: "Certified & benchmarked",
    body: "Evaluated across 12 dimensions and benchmarked on representative enterprise work across 13 more."
  },
  {
    icon: "🔐",
    title: "Signed & governable",
    body: "Signed skill contracts and a certification ladder from Unreviewed to Enterprise Approved that procurement can stand behind."
  }
];

const PIPELINE = ["Context", "Evaluate", "Benchmark", "Certify", "Sign", "Trust", "Register"];

const VIEWS = [
  { label: "Enterprise-approved", gold: true },
  { label: "Certified" },
  { label: "Best by workflow" },
  { label: "Best by toolchain" },
  { label: "Best by industry" },
  { label: "Best by governance profile" },
  { label: "Low-risk" },
  { label: "Requires human approval" },
  { label: "Restricted by policy" },
  { label: "Popular" }
];

// Example certified agents/skills rendered as agent cards in the registry grid.
const AGENTS = [
  {
    name: "GitHub PR Review",
    publisher: "OpenAutonomyX",
    workType: "code-review",
    level: "Certified Gold",
    trust: 88,
    fit: 97
  },
  {
    name: "Incident Triage",
    publisher: "OpenAutonomyX",
    workType: "incident-triage",
    level: "Certified Silver",
    trust: 81,
    fit: 90
  },
  {
    name: "Vendor Security Review",
    publisher: "OpenAutonomyX",
    workType: "vendor-review",
    level: "Enterprise Approved",
    trust: 93,
    fit: 95
  }
];

/** Map a certification level to a badge modifier class. */
const levelClass = (level) => {
  const l = String(level).toLowerCase();
  if (l.includes("enterprise")) return "enterprise";
  if (l.includes("gold")) return "gold";
  if (l.includes("silver")) return "silver";
  if (l.includes("bronze")) return "bronze";
  if (l.includes("restricted") || l.includes("revoked") || l.includes("suspended")) return "restricted";
  return "neutral";
};

/* ------------------------------------------------------------- utilities --- */

/** Minimal HTML-escape for attribute-sourced text. */
const esc = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/**
 * Define a light-DOM custom element.
 * @param {string} name  tag name
 * @param {(el:HTMLElement)=>string} render  returns innerHTML
 * @param {string} [hostClass]  class(es) applied to the host element
 */
function component(name, render, hostClass) {
  if (customElements.get(name)) return;
  customElements.define(
    name,
    class extends HTMLElement {
      connectedCallback() {
        if (hostClass) this.classList.add(...hostClass.split(" "));
        this.innerHTML = render(this);
      }
    }
  );
}

/* --------------------------------------------------------------- atoms ----- */

// <oax-card icon title body>
const cardEl = (el) => `
  <div class="ic">${esc(el.getAttribute("icon"))}</div>
  <h3>${esc(el.getAttribute("title"))}</h3>
  <p>${esc(el.getAttribute("body"))}</p>`;

// <oax-step n label>
const stepEl = (el) => `
  <div class="n">${esc(el.getAttribute("n"))}</div>
  <div class="s">${esc(el.getAttribute("label"))}</div>`;

// <oax-tag gold>label</oax-tag>  (label taken from text content)
function tagEl(el) {
  if (el.hasAttribute("gold")) el.classList.add("gold");
  return esc(el.textContent);
}

// <oax-list> — reusable list: renders <oax-tag> children from a JSON `items` attr
const listEl = (el) => {
  let items = [];
  try {
    items = JSON.parse(el.getAttribute("items") || "[]");
  } catch {
    items = [];
  }
  return `<div class="views">${items
    .map((i) => `<oax-tag${i.gold ? " gold" : ""}>${esc(i.label)}</oax-tag>`)
    .join("")}</div>`;
};

/* ------------------------------------------------------------- sections ---- */

const navEl = () => `
  <div class="wrap nav-inner">
    <div class="logo"><span class="mark"></span> OpenAutonomyX</div>
    <nav class="nav-links">
      <a href="#how">How it works</a>
      <a href="#pillars">Why us</a>
      <a href="#views">Registry</a>
      <a href="#start">Get started</a>
    </nav>
    <a class="btn btn-primary" href="#start">Browse certified skills</a>
  </div>`;

const heroEl = () => `
  <div class="wrap">
    <span class="eyebrow"><span class="dot"></span> Certified skill marketplace for the enterprise</span>
    <h1>Skills you can trust —<br /><span class="accent">in your context.</span></h1>
    <p class="lede">
      OpenAutonomyX certifies AI &amp; MCP skills by proven performance inside your
      organization, toolchain, data boundary, and governance — not by how many
      people downloaded them.
    </p>
    <div class="cta-row">
      <a class="btn btn-primary" href="#start">Browse certified skills</a>
      <a class="btn btn-ghost" href="#start">Get a Skill Readiness Assessment</a>
    </div>
    <p class="micro">Evaluated · Benchmarked · Signed · Registered</p>
    <div class="thesis">
      <p><span class="v">Popular means many people tried it.</span><br />
      <span class="t">Certified performance-in-context means an enterprise can trust it for a specific job, environment, toolchain, data boundary, and governance boundary.</span></p>
    </div>
  </div>`;

const pillarsEl = () => `
  <section id="pillars">
    <div class="wrap">
      <div class="section-head">
        <span class="kicker">Why OpenAutonomyX</span>
        <h2>Popularity is a vanity metric. Trust is contextual.</h2>
      </div>
      <div class="grid">
        ${PILLARS.map(
          (p) => `<oax-card icon="${esc(p.icon)}" title="${esc(p.title)}" body="${esc(p.body)}"></oax-card>`
        ).join("")}
      </div>
    </div>
  </section>`;

const pipelineEl = () => `
  <section id="how" style="padding-top:0;">
    <div class="wrap">
      <div class="section-head">
        <span class="kicker">How it works</span>
        <h2>From declaration to trusted registry entry</h2>
      </div>
      <div class="identity">Skill + Context = DeploymentEvaluation</div>
      <div class="pipe">
        ${PIPELINE.map(
          (s, i) => `<oax-step n="${String(i + 1).padStart(2, "0")}" label="${esc(s)}"></oax-step>`
        ).join("")}
      </div>
    </div>
  </section>`;

const viewsEl = () => `
  <section id="views" style="padding-top:0;">
    <div class="wrap">
      <div class="section-head">
        <span class="kicker">The registry</span>
        <h2>Find skills proven to perform <em>here</em></h2>
      </div>
      <oax-list items='${JSON.stringify(VIEWS).replace(/'/g, "&#39;")}'></oax-list>
    </div>
  </section>`;

// <oax-agent-card name publisher worktype level trust fit>
const agentCardEl = (el) => {
  const level = el.getAttribute("level") || "Unreviewed";
  return `
    <div class="ac-head">
      <span class="ac-mark"></span>
      <div class="ac-id">
        <h3>${esc(el.getAttribute("name"))}</h3>
        <span class="ac-pub">by ${esc(el.getAttribute("publisher"))}</span>
      </div>
      <span class="ac-badge ${levelClass(level)}">${esc(level)}</span>
    </div>
    <p class="ac-work">${esc(el.getAttribute("worktype"))}</p>
    <div class="ac-metrics">
      <div><span class="ac-num">${esc(el.getAttribute("trust"))}</span><span class="ac-lbl">Trust</span></div>
      <div><span class="ac-num">${esc(el.getAttribute("fit"))}%</span><span class="ac-lbl">Context fit</span></div>
    </div>`;
};

const registryEl = () => `
  <section id="registry" style="padding-top:0;">
    <div class="wrap">
      <div class="section-head">
        <span class="kicker">Certified agents</span>
        <h2>Agents, scored for your context</h2>
      </div>
      <div class="grid">
        ${AGENTS.map(
          (a) =>
            `<oax-agent-card name="${esc(a.name)}" publisher="${esc(a.publisher)}" worktype="${esc(a.workType)}" level="${esc(a.level)}" trust="${esc(a.trust)}" fit="${esc(a.fit)}"></oax-agent-card>`
        ).join("")}
      </div>
    </div>
  </section>`;

const ctaEl = () => `
  <section id="start" style="padding-top:0;">
    <div class="wrap">
      <div class="cta">
        <span class="kicker">Get started</span>
        <h2>Know it works here — before you deploy it here.</h2>
        <p>Enterprise-grade certification, benchmarking, and signed contracts for every AI &amp; MCP skill in your stack.</p>
        <div class="cta-row">
          <a class="btn btn-primary" href="#">Browse certified skills</a>
          <a class="btn btn-ghost" href="#">Request a benchmark report</a>
        </div>
      </div>
    </div>
  </section>`;

const footerEl = () => `
  <div class="wrap foot-inner">
    <div class="logo"><span class="mark"></span> OpenAutonomyX Marketplace</div>
    <span class="badge">Open source · Apache-2.0</span>
    <span>© 2026 OpenAutonomyX — Certified performance-in-context.</span>
  </div>`;

/* ----------------------------------------------------------- registration -- */

export function registerComponents() {
  // atoms
  component("oax-card", cardEl, "card");
  component("oax-step", stepEl, "step");
  component("oax-tag", tagEl, "tag");
  component("oax-list", listEl);
  component("oax-agent-card", agentCardEl, "card agent-card");
  // sections
  component("oax-nav", navEl);
  component("oax-hero", heroEl);
  component("oax-pillars", pillarsEl);
  component("oax-pipeline", pipelineEl);
  component("oax-views", viewsEl);
  component("oax-registry", registryEl);
  component("oax-cta", ctaEl);
  component("oax-footer", footerEl);
}

registerComponents();
