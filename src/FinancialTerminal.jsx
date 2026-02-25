import { useState, useRef, useEffect, useCallback } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// SYSTEM PROMPT — upgraded: no **, richer data, explicit chart data blocks
// ─────────────────────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are a senior financial analyst at a top-tier Wall Street investment bank (Goldman Sachs / Morgan Stanley tier). You produce institutional-grade equity research.

FORMATTING RULES — CRITICAL, FOLLOW EXACTLY:
- NEVER use markdown ** for bold. Never use # headers. Never use markdown tables.
- Use ALLCAPS words for emphasis instead of bold markers.
- Use these exact section markers: 🎯 💡 🔍 📋 ■ ▸ ① through ⑩ → ⚠
- Numbers get data tags: [Actual] [Estimated] [Assumed]
- Every [Actual] must cite source in parentheses.

CHART DATA BLOCKS — OUTPUT ALL OF THESE IN ORDER — CRITICAL, DO NOT SKIP ANY:

After the Reverse DCF section:
<<<CHART:SCENARIO_BARS>>>
BULL|[price]|#00ff88
BASE|[price]|#00ccff
BEAR|[price]|#ff4444
CURRENT|[price]|#ffaa00
<<<END_CHART>>>

After the Forward DCF 5-year revenue projections:
<<<CHART:REVENUE_MODEL>>>
YEAR|BULL|BASE|BEAR
FY1|[bull_rev_$b]|[base_rev_$b]|[bear_rev_$b]
FY2|[bull_rev_$b]|[base_rev_$b]|[bear_rev_$b]
FY3|[bull_rev_$b]|[base_rev_$b]|[bear_rev_$b]
FY4|[bull_rev_$b]|[base_rev_$b]|[bear_rev_$b]
FY5|[bull_rev_$b]|[base_rev_$b]|[bear_rev_$b]
<<<END_CHART>>>

After the margin analysis in Forward DCF:
<<<CHART:MARGIN_BRIDGE>>>
GROSS|[pct]
EBITDA|[pct]
EBIT|[pct]
NET|[pct]
FCF|[pct]
<<<END_CHART>>>

After the FCFF calculation in Forward DCF:
<<<CHART:FCF_BRIDGE>>>
EBITDA|[value_$b]|positive
DA_ADD|[value_$b]|positive
CAPEX|[value_$b]|negative
WC_CHANGE|[value_$b]|negative
TAX|[value_$b]|negative
FCFF|[value_$b]|result
<<<END_CHART>>>

After the Narrative section describing segment breakdown:
<<<CHART:GROWTH_DECOMP>>>
SEGMENT|REVENUE|GROWTH|MARGIN|COLOR
[segment]|[rev_$b]|[growth_pct]|[margin_pct]|#00ff88
[segment]|[rev_$b]|[growth_pct]|[margin_pct]|#00ccff
[segment]|[rev_$b]|[growth_pct]|[margin_pct]|#ffaa00
[segment]|[rev_$b]|[growth_pct]|[margin_pct]|#aa44ff
<<<END_CHART>>>

After the Comps section:
<<<CHART:COMPS_TABLE>>>
COMPANY|EV/EBITDA|P/E|EV/REV|COLOR
[ticker]|[val]|[val]|[val]|#color
[ticker]|[val]|[val]|[val]|#color
[Target ticker — HIGHLIGHT]|[val]|[val]|[val]|#00ff88
<<<END_CHART>>>

After the Sensitivity section:
<<<CHART:SENSITIVITY>>>
WACC\GROWTH|[g1]%|[g2]%|[g3]%|[g4]%|[g5]%
[w1]%|[price]|[price]|[price]|[price]|[price]
[w2]%|[price]|[price]|[price]|[price]|[price]
[w3]%|[price]|[price]|[price]|[price]|[price]
[w4]%|[price]|[price]|[price]|[price]|[price]
[w5]%|[price]|[price]|[price]|[price]|[price]
<<<END_CHART>>>

After the capital structure / balance sheet analysis:
<<<CHART:CAPITAL_STRUCTURE>>>
DEBT|[value_$b]|#ff4444
EQUITY|[value_$b]|#00ff88
CASH|[value_$b]|#00ccff
NET_DEBT_EBITDA|[ratio]
INTEREST_COVERAGE|[ratio]
<<<END_CHART>>>

After the probability-weighted fair value in So What section:
<<<CHART:PROBABILITY_WHEEL>>>
BULL|[probability_pct]|[price]|#00ff88
BASE|[probability_pct]|[price]|#00ccff
BEAR|[probability_pct]|[price]|#ff4444
CURRENT|[current_price]
<<<END_CHART>>>

After the event calendar in So What section:
<<<CHART:CATALYST_TIMELINE>>>
[event name short]|[weeks_from_now]|[price_impact_pct]|[BULLISH or BEARISH or NEUTRAL]
[event name short]|[weeks_from_now]|[price_impact_pct]|[BULLISH or BEARISH or NEUTRAL]
[event name short]|[weeks_from_now]|[price_impact_pct]|[BULLISH or BEARISH or NEUTRAL]
[event name short]|[weeks_from_now]|[price_impact_pct]|[BULLISH or BEARISH or NEUTRAL]
[event name short]|[weeks_from_now]|[price_impact_pct]|[BULLISH or BEARISH or NEUTRAL]
<<<END_CHART>>>

OUTPUT STRUCTURE — follow this order exactly:

🎯 [TICKER] ANALYSIS — 10 KEY POINTS
① FINAL VERDICT: [one crisp sentence verdict with specific price target]
② NARRATIVE: [what story the market is betting on, 2-3 sentences]
③ REVERSE DCF INSIGHT: [exact revenue CAGR, EBIT margin, reinvestment rate the current price implies]
④ NARRATIVE REALITY CHECK: [can the company actually hit those implied metrics? Evidence-based]
⑤ DCF INSIGHT: [your intrinsic value range, base case with key drivers]
⑥ COMPS INSIGHT: [premium/discount to peers, what it implies]
⑦ THE ONE VARIABLE THAT MATTERS: [single most important driver with quantified impact]
⑧ WHAT THE MARKET IS MISSING: [your edge — specific insight not in consensus]
⑨ BIGGEST RISK + DEAL RADAR: [top risk quantified + M&A/activist intel]
⑩ UPSIDE CATALYST + ACTION ITEMS: [specific events with timing and price impact]

■ NARRATIVE ANALYSIS
[3-4 paragraphs. Business model, competitive moat, secular tailwinds, market narrative. Include revenue breakdown by segment with % contribution, growth rate, and margin for each segment.]

[INSERT CHART:GROWTH_DECOMP HERE]

■ REVERSE DCF ANALYSIS
[Start with current stock price. Reverse-engineer growth rate, margins, WACC, terminal value. Formula: Enterprise Value = FCFF / (WACC - g). State required revenue CAGR%, EBIT margin%, FCF conversion%. Compare to historical actuals.]

[INSERT CHART:SCENARIO_BARS HERE]

■ FORWARD DCF MODEL
[Bull/Base/Bear cases. Year-by-year revenue for 5 years, EBIT margin path, D&A, capex, working capital, FCFF, terminal value, WACC derivation. Show all formulas. Include capital structure analysis: debt/equity split, net debt/EBITDA, interest coverage.]

[INSERT CHART:REVENUE_MODEL HERE]

[INSERT CHART:MARGIN_BRIDGE HERE]

[INSERT CHART:FCF_BRIDGE HERE]

[INSERT CHART:CAPITAL_STRUCTURE HERE]

■ TRADING COMPARABLES
[5-7 real peers. EV/EBITDA NTM, P/E NTM, EV/Revenue, 1-line description. State vs peer median.]

[INSERT CHART:COMPS_TABLE HERE]

■ SENSITIVITY ANALYSIS
[5x5 WACC vs terminal growth matrix. Interpret clustering.]

[INSERT CHART:SENSITIVITY HERE]

🔍 DEAL RADAR
[M&A activity: confirmed deals, rumors, activist positions, stake changes. OFFICIAL vs RUMOR. Source every item.]

💡 SO WHAT — INVESTMENT DECISION
[Probability-weighted fair value. Bull/Base/Bear case probabilities and prices. Weighted average vs current = upside/downside %. One-line verdict in ALLCAPS. Event calendar: 3-5 upcoming events with timing and ±% price impact.]

[INSERT CHART:PROBABILITY_WHEEL HERE]

[INSERT CHART:CATALYST_TIMELINE HERE]

■ ASSUMPTIONS SUMMARY
[List every key modeling assumption with the data tag and rationale]

📋 CONFIDENCE CHECKLIST
[Rate each section: VERIFIED / ESTIMATED / ASSUMED. Overall confidence score /10]

⚠ DISCLAIMER: AI-generated analysis. Not investment advice. Conduct independent due diligence.`;

// ─────────────────────────────────────────────────────────────────────────────
// CHART PARSERS
// ─────────────────────────────────────────────────────────────────────────────
function parseCharts(text) {
  const charts = [];
  const chartRegex = /<<<CHART:(\w+)>>>([\s\S]*?)<<<END_CHART>>>/g;
  let match;
  while ((match = chartRegex.exec(text)) !== null) {
    charts.push({ type: match[1], raw: match[2].trim(), index: match.index });
  }
  return charts;
}

function parseScenarioBars(raw) {
  return raw.split("\n").map(l => {
    const [label, price, color] = l.split("|");
    return { label: label?.trim(), price: parseFloat(price), color: color?.trim() };
  }).filter(d => d.label && !isNaN(d.price));
}

function parseCompsTable(raw) {
  const lines = raw.split("\n").filter(l => l.trim());
  const rows = lines.slice(1).map(l => {
    const cols = l.split("|").map(c => c.trim());
    return { company: cols[0], ev_ebitda: cols[1], pe: cols[2], ev_rev: cols[3], color: cols[4] || "#4a7a60", highlight: l.toUpperCase().includes("HIGHLIGHT") };
  });
  return { rows };
}

function parseSensitivity(raw) {
  const lines = raw.split("\n").filter(l => l.trim());
  const header = lines[0].split("|").map(c => c.trim());
  const rows = lines.slice(1).map(l => {
    const cols = l.split("|").map(c => c.trim());
    return { wacc: cols[0], values: cols.slice(1) };
  });
  return { header, rows };
}

function parseRevenueModel(raw) {
  const lines = raw.split("\n").filter(l => l.trim());
  const rows = lines.slice(1).map(l => {
    const [year, bull, base, bear] = l.split("|").map(c => c.trim());
    return { year, bull: parseFloat(bull), base: parseFloat(base), bear: parseFloat(bear) };
  }).filter(r => r.year && !isNaN(r.base));
  return rows;
}

function parseMarginBridge(raw) {
  return raw.split("\n").filter(l => l.trim()).map(l => {
    const [label, pct] = l.split("|").map(c => c.trim());
    return { label, pct: parseFloat(pct) };
  }).filter(r => r.label && !isNaN(r.pct));
}

function parseFCFBridge(raw) {
  return raw.split("\n").filter(l => l.trim()).map(l => {
    const [label, value, type] = l.split("|").map(c => c.trim());
    return { label, value: parseFloat(value), type: type || "positive" };
  }).filter(r => r.label && !isNaN(r.value));
}

function parseGrowthDecomp(raw) {
  const lines = raw.split("\n").filter(l => l.trim());
  return lines.slice(1).map(l => {
    const [segment, revenue, growth, margin, color] = l.split("|").map(c => c.trim());
    return { segment, revenue: parseFloat(revenue), growth: parseFloat(growth), margin: parseFloat(margin), color: color || "#00ff88" };
  }).filter(r => r.segment && !isNaN(r.revenue));
}

function parseCapitalStructure(raw) {
  const lines = raw.split("\n").filter(l => l.trim());
  const result = { items: [], ratios: [] };
  lines.forEach(l => {
    const parts = l.split("|").map(c => c.trim());
    if (parts[0] === "NET_DEBT_EBITDA" || parts[0] === "INTEREST_COVERAGE") {
      result.ratios.push({ label: parts[0].replace(/_/g," "), value: parts[1] });
    } else {
      result.items.push({ label: parts[0], value: parseFloat(parts[1]), color: parts[2] || "#00ff88" });
    }
  });
  return result;
}

function parseProbabilityWheel(raw) {
  const lines = raw.split("\n").filter(l => l.trim());
  const scenarios = [];
  let current = null;
  lines.forEach(l => {
    const parts = l.split("|").map(c => c.trim());
    if (parts[0] === "CURRENT") { current = parseFloat(parts[1]); }
    else { scenarios.push({ label: parts[0], prob: parseFloat(parts[1]), price: parseFloat(parts[2]), color: parts[3] || "#00ff88" }); }
  });
  return { scenarios: scenarios.filter(s => !isNaN(s.prob)), current };
}

function parseCatalystTimeline(raw) {
  return raw.split("\n").filter(l => l.trim()).map(l => {
    const [name, weeks, impact, sentiment] = l.split("|").map(c => c.trim());
    return { name, weeks: parseFloat(weeks), impact: parseFloat(impact), sentiment: sentiment || "NEUTRAL" };
  }).filter(r => r.name && !isNaN(r.weeks));
}

// ─────────────────────────────────────────────────────────────────────────────
// INLINE CHART COMPONENTS — terminal aesthetic
// ─────────────────────────────────────────────────────────────────────────────
function ScenarioBarsChart({ data }) {
  const max = Math.max(...data.map(d => d.price)) * 1.15;
  return (
    <div style={{ background: "#010c07", border: "1px solid #0a2318", borderRadius: 2, padding: "1rem 1.2rem", margin: "0.8rem 0", fontFamily: "monospace" }}>
      <div style={{ fontSize: "0.58rem", color: "#336644", letterSpacing: "0.2em", marginBottom: "0.8rem" }}>[ SCENARIO VALUATION — PRICE TARGETS ]</div>
      {data.map((d, i) => {
        const pct = (d.price / max) * 100;
        return (
          <div key={i} style={{ marginBottom: "0.6rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.62rem", marginBottom: "0.22rem" }}>
              <span style={{ color: "#336644", width: 70 }}>{d.label}</span>
              <span style={{ color: d.color, fontWeight: 700 }}>${d.price.toFixed(2)}</span>
            </div>
            <div style={{ height: 8, background: "#051a0d", borderRadius: 1, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${pct}%`, background: d.color, borderRadius: 1, boxShadow: `0 0 8px ${d.color}66`, transition: "width 1s ease" }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function CompsChart({ data }) {
  if (!data.rows?.length) return null;
  const vals = data.rows.map(r => parseFloat(r.ev_ebitda) || 0);
  const max = Math.max(...vals) * 1.2 || 30;
  return (
    <div style={{ background: "#010c07", border: "1px solid #0a2318", borderRadius: 2, padding: "1rem 1.2rem", margin: "0.8rem 0", fontFamily: "monospace" }}>
      <div style={{ fontSize: "0.58rem", color: "#336644", letterSpacing: "0.2em", marginBottom: "0.8rem" }}>[ COMPARABLE COMPANY ANALYSIS — EV/EBITDA NTM ]</div>
      <div style={{ display: "grid", gridTemplateColumns: "90px 1fr 70px 60px 65px", gap: "0.2rem 0.5rem", fontSize: "0.6rem", color: "#1a5a30", marginBottom: "0.4rem", borderBottom: "1px solid #0a2318", paddingBottom: "0.3rem" }}>
        <span>TICKER</span><span>EBITDA BAR</span><span style={{ textAlign: "right" }}>EV/EBITDA</span><span style={{ textAlign: "right" }}>P/E</span><span style={{ textAlign: "right" }}>EV/REV</span>
      </div>
      {data.rows.map((r, i) => {
        const val = parseFloat(r.ev_ebitda) || 0;
        const pct = (val / max) * 100;
        const col = r.highlight ? "#00ff88" : (r.color || "#4a7a60");
        const name = r.company.replace(/ ?[—–-]? ?HIGHLIGHT/gi, "").trim();
        return (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "90px 1fr 70px 60px 65px", gap: "0.2rem 0.5rem", alignItems: "center", marginBottom: "0.3rem", background: r.highlight ? "rgba(0,255,136,0.04)" : "transparent", padding: r.highlight ? "0.15rem 0.2rem" : "0" }}>
            <span style={{ fontSize: "0.63rem", color: col, fontWeight: r.highlight ? 700 : 400 }}>{name}</span>
            <div style={{ height: 6, background: "#051a0d", borderRadius: 1 }}>
              <div style={{ height: "100%", width: `${pct}%`, background: col, borderRadius: 1, boxShadow: r.highlight ? `0 0 6px ${col}` : "none" }} />
            </div>
            <span style={{ fontSize: "0.62rem", color: col, textAlign: "right" }}>{r.ev_ebitda}x</span>
            <span style={{ fontSize: "0.62rem", color: "#4a8a60", textAlign: "right" }}>{r.pe}x</span>
            <span style={{ fontSize: "0.62rem", color: "#4a8a60", textAlign: "right" }}>{r.ev_rev}x</span>
          </div>
        );
      })}
    </div>
  );
}

function SensitivityChart({ data }) {
  if (!data.rows?.length) return null;
  const allVals = data.rows.flatMap(r => r.values.map(v => parseFloat(v.replace(/[$,]/g, "")) || 0)).filter(v => v > 0);
  const min = Math.min(...allVals), max = Math.max(...allVals);
  const getStyle = (v) => {
    const val = parseFloat(v.replace(/[$,]/g, "")) || 0;
    const pct = max > min ? (val - min) / (max - min) : 0.5;
    if (pct > 0.7) return { bg: "rgba(0,255,136,0.15)", color: "#00ff88" };
    if (pct > 0.4) return { bg: "rgba(0,204,255,0.1)", color: "#00ccff" };
    if (pct > 0.2) return { bg: "rgba(255,170,0,0.08)", color: "#ffaa00" };
    return { bg: "rgba(255,68,68,0.09)", color: "#ff4444" };
  };
  return (
    <div style={{ background: "#010c07", border: "1px solid #0a2318", borderRadius: 2, padding: "1rem 1.2rem", margin: "0.8rem 0", fontFamily: "monospace", overflowX: "auto" }}>
      <div style={{ fontSize: "0.58rem", color: "#336644", letterSpacing: "0.2em", marginBottom: "0.8rem" }}>[ SENSITIVITY MATRIX — WACC vs TERMINAL GROWTH RATE ]</div>
      <table style={{ borderCollapse: "collapse", fontSize: "0.6rem", width: "100%" }}>
        <thead>
          <tr>
            {data.header.map((h, i) => (
              <th key={i} style={{ padding: "0.25rem 0.5rem", color: "#1a5a30", fontWeight: 400, textAlign: i === 0 ? "left" : "center", borderBottom: "1px solid #0a2318", whiteSpace: "nowrap" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.rows.map((row, ri) => (
            <tr key={ri}>
              <td style={{ padding: "0.25rem 0.5rem", color: "#336644", whiteSpace: "nowrap" }}>{row.wacc}</td>
              {row.values.map((v, vi) => {
                const { bg, color } = getStyle(v);
                return <td key={vi} style={{ padding: "0.2rem 0.45rem", background: bg, color, textAlign: "center", fontWeight: 600, fontSize: "0.63rem", whiteSpace: "nowrap" }}>{v}</td>;
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ marginTop: "0.5rem", display: "flex", gap: "0.8rem", fontSize: "0.55rem" }}>
        <span style={{ color: "#00ff88" }}>■ BULL</span><span style={{ color: "#00ccff" }}>■ BASE</span><span style={{ color: "#ffaa00" }}>■ NEUTRAL</span><span style={{ color: "#ff4444" }}>■ BEAR</span>
      </div>
    </div>
  );
}


// ─────────────────────────────────────────────────────────────────────────────
// REVENUE MODEL — 5-year bull/base/bear revenue trajectories
// ─────────────────────────────────────────────────────────────────────────────
function RevenueModelChart({ data }) {
  if (!data.length) return null;
  const allVals = data.flatMap(r => [r.bull, r.base, r.bear]).filter(v => !isNaN(v));
  const maxV = Math.max(...allVals) * 1.12;
  const minV = Math.min(...allVals) * 0.9;
  const range = maxV - minV;
  const W = 480, H = 140, padL = 48, padR = 12, padT = 12, padB = 28;
  const plotW = W - padL - padR, plotH = H - padT - padB;
  const xStep = plotW / (data.length - 1);
  const yPos = v => padT + plotH - ((v - minV) / range) * plotH;
  const xPos = i => padL + i * xStep;

  const pathFor = (key, col) => {
    const pts = data.map((r, i) => `${i === 0 ? "M" : "L"}${xPos(i).toFixed(1)},${yPos(r[key]).toFixed(1)}`).join(" ");
    return <path key={key} d={pts} fill="none" stroke={col} strokeWidth="1.5" strokeOpacity="0.85" />;
  };
  const dotsFor = (key, col) => data.map((r, i) => (
    <circle key={i} cx={xPos(i)} cy={yPos(r[key])} r="2.5" fill={col} fillOpacity="0.9" />
  ));

  return (
    <div style={{ background:"#010c07", border:"1px solid #0a2318", borderRadius:2, padding:"1rem 1.2rem", margin:"0.8rem 0", fontFamily:"monospace" }}>
      <div style={{ fontSize:"0.58rem", color:"#336644", letterSpacing:"0.2em", marginBottom:"0.6rem" }}>[ FORWARD DCF — 5-YEAR REVENUE PROJECTIONS ($B) ]</div>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display:"block" }}>
        {/* Grid lines */}
        {[0,0.25,0.5,0.75,1].map(t => {
          const y = padT + plotH * t;
          const val = maxV - (range * t);
          return <g key={t}>
            <line x1={padL} y1={y} x2={W-padR} y2={y} stroke="#0a2318" strokeWidth="0.5" />
            <text x={padL-4} y={y+3} textAnchor="end" fontSize="7" fill="#336644">${val.toFixed(0)}B</text>
          </g>;
        })}
        {/* Year labels */}
        {data.map((r,i) => (
          <text key={i} x={xPos(i)} y={H-6} textAnchor="middle" fontSize="7.5" fill="#336644">{r.year}</text>
        ))}
        {/* Area fills */}
        {(() => {
          const bullPts = data.map((r,i) => `${xPos(i)},${yPos(r.bull)}`).join(" ");
          const bearPts = data.map((r,i) => `${xPos(i)},${yPos(r.bear)}`).join(" ");
          const areaD = `M${xPos(0)},${yPos(data[0].bull)} ${data.map((r,i)=>`L${xPos(i)},${yPos(r.bull)}`).slice(1).join(" ")} L${xPos(data.length-1)},${yPos(data[data.length-1].bear)} ${[...data].reverse().map((r,i)=>`L${xPos(data.length-1-i)},${yPos(r.bear)}`).join(" ")} Z`;
          return <path d={areaD} fill="rgba(0,204,255,0.05)" />;
        })()}
        {pathFor("bull","#00ff88")}
        {pathFor("base","#00ccff")}
        {pathFor("bear","#ff4444")}
        {dotsFor("bull","#00ff88")}
        {dotsFor("base","#00ccff")}
        {dotsFor("bear","#ff4444")}
      </svg>
      <div style={{ display:"flex", gap:"1.2rem", fontSize:"0.52rem", marginTop:"0.3rem" }}>
        <span style={{color:"#00ff88"}}>■ BULL</span>
        <span style={{color:"#00ccff"}}>■ BASE</span>
        <span style={{color:"#ff4444"}}>■ BEAR</span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MARGIN BRIDGE — waterfall from gross to FCF margin
// ─────────────────────────────────────────────────────────────────────────────
function MarginBridgeChart({ data }) {
  if (!data.length) return null;
  const maxPct = Math.max(...data.map(d => d.pct)) * 1.1;
  const COLORS = { GROSS:"#00ff88", EBITDA:"#00ccff", EBIT:"#44aaff", NET:"#ffaa00", FCF:"#ff8844" };
  return (
    <div style={{ background:"#010c07", border:"1px solid #0a2318", borderRadius:2, padding:"1rem 1.2rem", margin:"0.8rem 0", fontFamily:"monospace" }}>
      <div style={{ fontSize:"0.58rem", color:"#336644", letterSpacing:"0.2em", marginBottom:"0.8rem" }}>[ MARGIN BRIDGE — BASE CASE PROFITABILITY STACK ]</div>
      {data.map((d, i) => {
        const col = COLORS[d.label] || "#4a8a60";
        const pct = (d.pct / maxPct) * 100;
        return (
          <div key={i} style={{ marginBottom:"0.5rem" }}>
            <div style={{ display:"flex", justifyContent:"space-between", fontSize:"0.6rem", marginBottom:"0.18rem" }}>
              <span style={{ color:"#336644", width:70 }}>{d.label} MARGIN</span>
              <span style={{ color:col, fontWeight:700 }}>{d.pct.toFixed(1)}%</span>
            </div>
            <div style={{ height:10, background:"#051a0d", borderRadius:1, overflow:"hidden", position:"relative" }}>
              <div style={{ height:"100%", width:`${pct}%`, background:col, borderRadius:1, boxShadow:`0 0 6px ${col}55`, transition:"width 0.8s ease" }} />
            </div>
          </div>
        );
      })}
      <div style={{ marginTop:"0.6rem", fontSize:"0.52rem", color:"#1a4a28" }}>GROSS → EBITDA → EBIT → NET → FCF MARGIN COMPRESSION PATH</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FCF BRIDGE — EBITDA to FCFF waterfall
// ─────────────────────────────────────────────────────────────────────────────
function FCFBridgeChart({ data }) {
  if (!data.length) return null;
  const maxAbs = Math.max(...data.map(d => Math.abs(d.value))) * 1.15;
  return (
    <div style={{ background:"#010c07", border:"1px solid #0a2318", borderRadius:2, padding:"1rem 1.2rem", margin:"0.8rem 0", fontFamily:"monospace" }}>
      <div style={{ fontSize:"0.58rem", color:"#336644", letterSpacing:"0.2em", marginBottom:"0.8rem" }}>[ FCF BRIDGE — EBITDA TO FREE CASH FLOW ($B) ]</div>
      {data.map((d, i) => {
        const isResult = d.type === "result";
        const isNeg = d.type === "negative";
        const col = isResult ? "#ffaa00" : isNeg ? "#ff4444" : "#00ff88";
        const barPct = (Math.abs(d.value) / maxAbs) * 85;
        return (
          <div key={i} style={{ display:"flex", alignItems:"center", gap:"0.6rem", marginBottom:"0.42rem", background: isResult?"rgba(255,170,0,0.05)":"transparent", padding: isResult?"0.25rem 0.3rem":"0", borderRadius:2 }}>
            <span style={{ width:90, fontSize:"0.58rem", color: isResult?"#ffaa00":"#336644", letterSpacing:"0.06em", flexShrink:0 }}>
              {isNeg ? "– " : isResult ? "= " : "+ "}{d.label.replace(/_/g," ")}
            </span>
            <div style={{ flex:1, height:8, background:"#051a0d", borderRadius:1, overflow:"hidden" }}>
              <div style={{ height:"100%", width:`${barPct}%`, background:col, borderRadius:1, boxShadow:`0 0 5px ${col}44`, marginLeft: isNeg ? `${85 - barPct}%` : 0 }} />
            </div>
            <span style={{ width:55, fontSize:"0.63rem", color:col, fontWeight: isResult?700:400, textAlign:"right" }}>
              {isNeg ? "-" : ""}${Math.abs(d.value).toFixed(1)}B
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// GROWTH DECOMP — segment revenue, growth, margin bubble grid
// ─────────────────────────────────────────────────────────────────────────────
function GrowthDecompChart({ data }) {
  if (!data.length) return null;
  const totalRev = data.reduce((s, d) => s + d.revenue, 0);
  return (
    <div style={{ background:"#010c07", border:"1px solid #0a2318", borderRadius:2, padding:"1rem 1.2rem", margin:"0.8rem 0", fontFamily:"monospace" }}>
      <div style={{ fontSize:"0.58rem", color:"#336644", letterSpacing:"0.2em", marginBottom:"0.7rem" }}>[ SEGMENT BREAKDOWN — REVENUE · GROWTH · MARGIN ]</div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))", gap:"0.6rem" }}>
        {data.map((d, i) => {
          const share = totalRev > 0 ? ((d.revenue / totalRev) * 100).toFixed(0) : 0;
          const growthCol = d.growth >= 15 ? "#00ff88" : d.growth >= 5 ? "#00ccff" : d.growth >= 0 ? "#ffaa00" : "#ff4444";
          return (
            <div key={i} style={{ border:`1px solid ${d.color}22`, background:`${d.color}06`, borderRadius:2, padding:"0.6rem 0.75rem" }}>
              <div style={{ fontSize:"0.6rem", color:d.color, fontWeight:700, letterSpacing:"0.08em", marginBottom:"0.3rem", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{d.segment}</div>
              <div style={{ fontSize:"0.7rem", color:"#ccffe8", fontWeight:700 }}>${d.revenue.toFixed(1)}B</div>
              <div style={{ fontSize:"0.52rem", color:"#336644", marginTop:"0.15rem" }}>{share}% of total</div>
              <div style={{ display:"flex", justifyContent:"space-between", marginTop:"0.4rem", fontSize:"0.55rem" }}>
                <span style={{ color:growthCol }}>↑ {d.growth}% YoY</span>
                <span style={{ color:"#4a8a60" }}>{d.margin}% margin</span>
              </div>
              <div style={{ marginTop:"0.35rem", height:3, background:"#051a0d", borderRadius:1 }}>
                <div style={{ height:"100%", width:`${Math.min(share,100)}%`, background:d.color, borderRadius:1, opacity:0.7 }} />
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ marginTop:"0.5rem", fontSize:"0.52rem", color:"#1a4a28" }}>
        TOTAL REVENUE: ${totalRev.toFixed(1)}B · {data.length} SEGMENTS
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CAPITAL STRUCTURE — donut + leverage ratios
// ─────────────────────────────────────────────────────────────────────────────
function CapitalStructureChart({ data }) {
  if (!data.items?.length) return null;
  const total = data.items.reduce((s, d) => s + Math.abs(d.value), 0);
  // Simple SVG donut
  const R = 48, CX = 68, CY = 60, stroke = 18;
  let cumAngle = -90;
  const slices = data.items.map(d => {
    const angle = (Math.abs(d.value) / total) * 360;
    const startA = cumAngle;
    cumAngle += angle;
    return { ...d, startA, angle };
  });
  const polarToXY = (angle, r) => {
    const rad = (angle * Math.PI) / 180;
    return { x: CX + r * Math.cos(rad), y: CY + r * Math.sin(rad) };
  };
  const describeArc = (startA, angle) => {
    const s = polarToXY(startA, R);
    const e = polarToXY(startA + angle - 0.5, R);
    const large = angle > 180 ? 1 : 0;
    return `M ${CX} ${CY} L ${s.x} ${s.y} A ${R} ${R} 0 ${large} 1 ${e.x} ${e.y} Z`;
  };
  return (
    <div style={{ background:"#010c07", border:"1px solid #0a2318", borderRadius:2, padding:"1rem 1.2rem", margin:"0.8rem 0", fontFamily:"monospace" }}>
      <div style={{ fontSize:"0.58rem", color:"#336644", letterSpacing:"0.2em", marginBottom:"0.7rem" }}>[ CAPITAL STRUCTURE — DEBT · EQUITY · CASH ]</div>
      <div style={{ display:"flex", gap:"1.5rem", alignItems:"center" }}>
        <svg width="136" height="120" style={{ flexShrink:0 }}>
          {slices.map((s, i) => (
            <path key={i} d={describeArc(s.startA, s.angle)} fill="none"
              stroke={s.color} strokeWidth={stroke} strokeOpacity="0.85"
              style={{ filter:`drop-shadow(0 0 4px ${s.color}55)` }} />
          ))}
          <circle cx={CX} cy={CY} r={R - stroke/2 - 1} fill="#010c07" />
          <text x={CX} y={CY-6} textAnchor="middle" fontSize="8" fill="#336644" fontFamily="monospace">TOTAL</text>
          <text x={CX} y={CY+7} textAnchor="middle" fontSize="9" fill="#00ffcc" fontFamily="monospace" fontWeight="bold">${total.toFixed(0)}B</text>
        </svg>
        <div style={{ flex:1 }}>
          {data.items.map((d, i) => {
            const pct = total > 0 ? ((Math.abs(d.value)/total)*100).toFixed(0) : 0;
            return (
              <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"0.45rem" }}>
                <div style={{ display:"flex", alignItems:"center", gap:"0.4rem" }}>
                  <div style={{ width:8, height:8, borderRadius:"50%", background:d.color, boxShadow:`0 0 5px ${d.color}66` }} />
                  <span style={{ fontSize:"0.6rem", color:"#336644" }}>{d.label}</span>
                </div>
                <div style={{ textAlign:"right" }}>
                  <span style={{ fontSize:"0.65rem", color:d.color, fontWeight:700 }}>${d.value.toFixed(1)}B</span>
                  <span style={{ fontSize:"0.52rem", color:"#1a4a28", marginLeft:"0.4rem" }}>{pct}%</span>
                </div>
              </div>
            );
          })}
          {data.ratios?.map((r, i) => (
            <div key={i} style={{ marginTop:"0.35rem", padding:"0.3rem 0.5rem", background:"rgba(0,255,136,0.03)", border:"1px solid #0a2318", borderRadius:2 }}>
              <span style={{ fontSize:"0.55rem", color:"#1a5a30" }}>{r.label}: </span>
              <span style={{ fontSize:"0.65rem", color:"#00ffcc", fontWeight:700 }}>{r.value}x</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PROBABILITY WHEEL — scenario probabilities + weighted price
// ─────────────────────────────────────────────────────────────────────────────
function ProbabilityWheelChart({ data }) {
  if (!data.scenarios?.length) return null;
  const { scenarios, current } = data;
  const weighted = scenarios.reduce((s, sc) => s + (sc.prob/100) * sc.price, 0);
  const updown = current ? ((weighted - current) / current * 100) : null;

  const R = 52, CX = 70, CY = 65, SW = 20;
  let cumAngle = -90;
  const slices = scenarios.map(sc => {
    const angle = (sc.prob / 100) * 360;
    const startA = cumAngle;
    cumAngle += angle;
    return { ...sc, startA, angle };
  });
  const polarToXY = (angle, r) => ({ x: CX + r * Math.cos(angle * Math.PI/180), y: CY + r * Math.sin(angle * Math.PI/180) });
  const describeArc = (startA, angle) => {
    const s = polarToXY(startA, R);
    const e = polarToXY(startA + angle - 0.5, R);
    const lg = angle > 180 ? 1 : 0;
    return `M${CX} ${CY} L${s.x.toFixed(1)} ${s.y.toFixed(1)} A${R} ${R} 0 ${lg} 1 ${e.x.toFixed(1)} ${e.y.toFixed(1)}Z`;
  };

  return (
    <div style={{ background:"#010c07", border:"1px solid #0a2318", borderRadius:2, padding:"1rem 1.2rem", margin:"0.8rem 0", fontFamily:"monospace" }}>
      <div style={{ fontSize:"0.58rem", color:"#336644", letterSpacing:"0.2em", marginBottom:"0.7rem" }}>[ PROBABILITY-WEIGHTED OUTCOME — SCENARIO ANALYSIS ]</div>
      <div style={{ display:"flex", gap:"1.5rem", alignItems:"flex-start" }}>
        <svg width="140" height="130" style={{ flexShrink:0 }}>
          {slices.map((s, i) => (
            <path key={i} d={describeArc(s.startA, s.angle)} fill="none"
              stroke={s.color} strokeWidth={SW} strokeOpacity="0.9"
              style={{ filter:`drop-shadow(0 0 4px ${s.color}66)` }} />
          ))}
          <circle cx={CX} cy={CY} r={R-SW/2-1} fill="#010c07" />
          <text x={CX} y={CY-8} textAnchor="middle" fontSize="7" fill="#336644" fontFamily="monospace">WEIGHTED</text>
          <text x={CX} y={CY+4} textAnchor="middle" fontSize="10" fill="#00ffcc" fontFamily="monospace" fontWeight="bold">${weighted.toFixed(0)}</text>
          {updown !== null && (
            <text x={CX} y={CY+16} textAnchor="middle" fontSize="7.5" fill={updown >= 0 ? "#00ff88":"#ff4444"} fontFamily="monospace">
              {updown >= 0 ? "+" : ""}{updown.toFixed(1)}%
            </text>
          )}
        </svg>
        <div style={{ flex:1 }}>
          {scenarios.map((sc, i) => (
            <div key={i} style={{ marginBottom:"0.55rem", padding:"0.35rem 0.55rem", background:`${sc.color}06`, border:`1px solid ${sc.color}22`, borderRadius:2 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <span style={{ fontSize:"0.6rem", color:sc.color, fontWeight:700 }}>{sc.label}</span>
                <span style={{ fontSize:"0.65rem", color:sc.color }}>${sc.price.toFixed(0)}</span>
              </div>
              <div style={{ marginTop:"0.25rem", height:4, background:"#051a0d", borderRadius:1 }}>
                <div style={{ height:"100%", width:`${sc.prob}%`, background:sc.color, borderRadius:1, boxShadow:`0 0 4px ${sc.color}55` }} />
              </div>
              <div style={{ fontSize:"0.52rem", color:"#1a5a30", marginTop:"0.15rem" }}>{sc.prob}% probability · weighted ${ (sc.prob/100*sc.price).toFixed(0) }</div>
            </div>
          ))}
          {current && (
            <div style={{ marginTop:"0.4rem", fontSize:"0.58rem", color:"#ffaa00" }}>
              CURRENT: ${current.toFixed(0)} → WEIGHTED: ${weighted.toFixed(0)} ({updown >= 0 ? "+" : ""}{updown?.toFixed(1)}%)
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CATALYST TIMELINE — horizontal event timeline with impact bars
// ─────────────────────────────────────────────────────────────────────────────
function CatalystTimelineChart({ data }) {
  if (!data.length) return null;
  const sorted = [...data].sort((a,b) => a.weeks - b.weeks);
  const maxWeeks = Math.max(...sorted.map(d => d.weeks), 1);
  const maxImpact = Math.max(...sorted.map(d => Math.abs(d.impact)), 1);
  const sentColor = s => s === "BULLISH" ? "#00ff88" : s === "BEARISH" ? "#ff4444" : "#ffaa00";
  return (
    <div style={{ background:"#010c07", border:"1px solid #0a2318", borderRadius:2, padding:"1rem 1.2rem", margin:"0.8rem 0", fontFamily:"monospace" }}>
      <div style={{ fontSize:"0.58rem", color:"#336644", letterSpacing:"0.2em", marginBottom:"0.8rem" }}>[ CATALYST TIMELINE — UPCOMING EVENTS & PRICE IMPACT ]</div>
      {/* Timeline bar */}
      <div style={{ position:"relative", height:18, marginBottom:"1rem", background:"#051a0d", borderRadius:1 }}>
        <div style={{ position:"absolute", top:0, left:0, right:0, bottom:0, display:"flex", alignItems:"center" }}>
          <div style={{ width:"100%", height:1, background:"#0a3020" }} />
        </div>
        {sorted.map((ev, i) => {
          const left = (ev.weeks / maxWeeks) * 96;
          const col = sentColor(ev.sentiment);
          return (
            <div key={i} style={{ position:"absolute", left:`${left}%`, top:"50%", transform:"translate(-50%,-50%)" }}>
              <div style={{ width:8, height:8, borderRadius:"50%", background:col, boxShadow:`0 0 6px ${col}`, border:"1px solid #010c07" }} />
            </div>
          );
        })}
        <div style={{ position:"absolute", right:2, top:"50%", transform:"translateY(-50%)", fontSize:"0.5rem", color:"#1a4a28" }}>+{maxWeeks}W</div>
        <div style={{ position:"absolute", left:2, top:"50%", transform:"translateY(-50%)", fontSize:"0.5rem", color:"#1a4a28" }}>NOW</div>
      </div>
      {/* Event rows */}
      {sorted.map((ev, i) => {
        const col = sentColor(ev.sentiment);
        const impactPct = (Math.abs(ev.impact) / maxImpact) * 70;
        return (
          <div key={i} style={{ display:"grid", gridTemplateColumns:"28px 1fr 70px 80px", gap:"0.3rem 0.5rem", alignItems:"center", marginBottom:"0.4rem", padding:"0.2rem 0" }}>
            <div style={{ fontSize:"0.52rem", color:"#1a5a30", textAlign:"center" }}>W{ev.weeks}</div>
            <div style={{ fontSize:"0.62rem", color:"#8db8a0", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{ev.name}</div>
            <div style={{ height:6, background:"#051a0d", borderRadius:1 }}>
              <div style={{ height:"100%", width:`${impactPct}%`, background:col, borderRadius:1, boxShadow:`0 0 4px ${col}55` }} />
            </div>
            <div style={{ fontSize:"0.6rem", color:col, textAlign:"right" }}>
              {ev.impact >= 0 ? "+" : ""}{ev.impact}% {ev.sentiment === "BULLISH" ? "▲" : ev.sentiment === "BEARISH" ? "▼" : "◆"}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// REPORT RENDERER — strips ** and renders chart blocks inline
// ─────────────────────────────────────────────────────────────────────────────
function ReportRenderer({ text }) {
  const segments = [];
  const chartRegex = /<<<CHART:(\w+)>>>([\s\S]*?)<<<END_CHART>>>/g;
  let lastIdx = 0, match;
  while ((match = chartRegex.exec(text)) !== null) {
    if (match.index > lastIdx) segments.push({ type: "text", content: text.slice(lastIdx, match.index) });
    segments.push({ type: "chart", chartType: match[1], raw: match[2].trim() });
    lastIdx = match.index + match[0].length;
  }
  if (lastIdx < text.length) segments.push({ type: "text", content: text.slice(lastIdx) });

  return (
    <div>
      {segments.map((seg, si) => {
        if (seg.type === "chart") {
          if (seg.chartType === "SCENARIO_BARS")     return <ScenarioBarsChart key={si}      data={parseScenarioBars(seg.raw)} />;
          if (seg.chartType === "COMPS_TABLE")       return <CompsChart key={si}             data={parseCompsTable(seg.raw)} />;
          if (seg.chartType === "SENSITIVITY")       return <SensitivityChart key={si}       data={parseSensitivity(seg.raw)} />;
          if (seg.chartType === "REVENUE_MODEL")     return <RevenueModelChart key={si}      data={parseRevenueModel(seg.raw)} />;
          if (seg.chartType === "MARGIN_BRIDGE")     return <MarginBridgeChart key={si}      data={parseMarginBridge(seg.raw)} />;
          if (seg.chartType === "FCF_BRIDGE")        return <FCFBridgeChart key={si}         data={parseFCFBridge(seg.raw)} />;
          if (seg.chartType === "GROWTH_DECOMP")     return <GrowthDecompChart key={si}      data={parseGrowthDecomp(seg.raw)} />;
          if (seg.chartType === "CAPITAL_STRUCTURE") return <CapitalStructureChart key={si}  data={parseCapitalStructure(seg.raw)} />;
          if (seg.chartType === "PROBABILITY_WHEEL") return <ProbabilityWheelChart key={si}  data={parseProbabilityWheel(seg.raw)} />;
          if (seg.chartType === "CATALYST_TIMELINE") return <CatalystTimelineChart key={si}  data={parseCatalystTimeline(seg.raw)} />;
          return null;
        }
        return (
          <div key={si}>
            {seg.content.split("\n").map((line, i) => {
              const clean = line.replace(/\*\*/g, "");
              if (!clean.trim()) return <div key={i} style={{ height: "0.5rem" }} />;
              const s = (extra) => ({ fontFamily: "'Courier New', monospace", ...extra });

              if (/^[🎯💡🔍📋]/.test(clean)) return (
                <div key={i} style={s({ fontSize: "0.76rem", fontWeight: 700, color: "#00ffaa", letterSpacing: "0.12em", marginTop: "2rem", marginBottom: "0.6rem", borderBottom: "1px solid rgba(0,255,150,0.18)", paddingBottom: "0.35rem", textTransform: "uppercase" })}>▶ {clean}</div>
              );
              if (/^[①②③④⑤⑥⑦⑧⑨⑩]/.test(clean)) return (
                <div key={i} style={s({ marginTop: "0.5rem", padding: "0.5rem 0.75rem", background: "rgba(0,255,150,0.03)", borderLeft: "2px solid #00ff88", fontSize: "0.75rem", color: "#ccffe8", lineHeight: "1.7" })}>{clean}</div>
              );
              if (/^■/.test(clean)) return (
                <div key={i} style={s({ fontWeight: 700, color: "#00ffcc", fontSize: "0.73rem", letterSpacing: "0.1em", marginTop: "1.4rem", marginBottom: "0.2rem" })}>{clean}</div>
              );
              if (/^▸/.test(clean)) return (
                <div key={i} style={s({ fontSize: "0.72rem", color: "#00ccaa", paddingLeft: "0.8rem", lineHeight: "1.7", marginTop: "0.1rem" })}>{clean}</div>
              );
              if (/^[•\-]/.test(clean)) return (
                <div key={i} style={s({ fontSize: "0.73rem", color: "#88ccaa", paddingLeft: "1.2rem", lineHeight: "1.7", marginTop: "0.12rem" })}>{clean}</div>
              );
              if (/^→/.test(clean)) return (
                <div key={i} style={s({ color: "#00ffaa", fontWeight: 700, fontSize: "0.76rem", marginTop: "0.35rem" })}>{clean}</div>
              );
              if (/^⚠/.test(clean)) return (
                <div key={i} style={s({ background: "rgba(255,180,0,0.05)", border: "1px solid rgba(255,180,0,0.22)", padding: "0.45rem 0.75rem", borderRadius: 2, color: "#ffcc44", fontSize: "0.72rem", marginTop: "0.5rem" })}>{clean}</div>
              );
              return <div key={i} style={s({ fontSize: "0.75rem", color: "#8db8a0", lineHeight: "1.78" })}>{clean}</div>;
            })}
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PDF EXPORT — terminal dark theme using jsPDF
// ─────────────────────────────────────────────────────────────────────────────
async function exportPDF(company, reportText) {
  if (!window.jspdf) {
    await new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
      s.onload = resolve; s.onerror = reject;
      document.head.appendChild(s);
    });
  }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  const PW = doc.internal.pageSize.getWidth();
  const PH = doc.internal.pageSize.getHeight();
  const L = 36, R = PW - 36, TW = PW - 72;

  const hex2rgb = (h) => [parseInt(h.slice(1,3),16), parseInt(h.slice(3,5),16), parseInt(h.slice(5,7),16)];
  const setFill = (h) => { const [r,g,b] = hex2rgb(h); doc.setFillColor(r,g,b); };
  const setDraw = (h) => { const [r,g,b] = hex2rgb(h); doc.setDrawColor(r,g,b); };
  const setTxt  = (h) => { const [r,g,b] = hex2rgb(h); doc.setTextColor(r,g,b); };

  let y = 0, pageNum = 0;

  const drawBg = () => {
    setFill("#030e07"); doc.rect(0, 0, PW, PH, "F");
    setFill("#040f08");
    for (let sy = 0; sy < PH; sy += 4) doc.rect(0, sy, PW, 1.5, "F");
    setFill("#00ff88"); doc.rect(0, 0, 3, PH, "F");
  };
  const drawHeader = () => {
    setFill("#010c07"); doc.rect(0, 0, PW, 28, "F");
    setDraw("#0a2318"); doc.setLineWidth(0.5); doc.line(0, 28, PW, 28);
    doc.setFont("Courier","bold"); doc.setFontSize(7.5); setTxt("#00ff88");
    doc.text("EIC — EQUITY INTELLIGENCE COMMAND", L, 18);
    doc.setFont("Courier","normal"); doc.setFontSize(7); setTxt("#1a4a28");
    doc.text(`${company.toUpperCase()}  |  CLASSIFICATION: INTERNAL  |  ${new Date().toISOString().slice(0,10)}`, R, 18, { align:"right" });
  };
  const drawFooter = () => {
    setDraw("#0a2318"); doc.setLineWidth(0.5); doc.line(L, PH-24, R, PH-24);
    doc.setFont("Courier","normal"); doc.setFontSize(7); setTxt("#1a4a2a");
    doc.text("EIC-MCS v4.3.0  ·  NOT INVESTMENT ADVICE", L, PH-12);
    setTxt("#336644"); doc.text(`${pageNum}`, R, PH-12, {align:"right"});
  };
  const newPage = () => {
    if (pageNum > 0) doc.addPage();
    pageNum++;
    drawBg(); drawHeader(); drawFooter();
    y = 48;
  };
  const checkY = (need) => { if (y + need > PH - 44) newPage(); };

  // ── COVER PAGE ──
  newPage();
  setFill("#010c07"); doc.rect(L-6, 58, TW+12, 190, "F");
  setDraw("#0a3a20"); doc.setLineWidth(0.5); doc.rect(L-6, 58, TW+12, 190, "S");
  setFill("#00ff88"); doc.rect(L-6, 58, TW+12, 3, "F");

  doc.setFont("Courier","bold"); doc.setFontSize(34); setTxt("#00ff88");
  doc.text(company.toUpperCase(), PW/2, 125, {align:"center"});
  doc.setFontSize(10.5); setTxt("#00ccaa");
  doc.text("EQUITY INTELLIGENCE REPORT", PW/2, 148, {align:"center"});
  doc.setFont("Courier","normal"); doc.setFontSize(8); setTxt("#336644");
  doc.text("IB-GRADE  ·  REVERSE DCF ENGINE  ·  LIVE DATA  ·  DEAL RADAR ACTIVE", PW/2, 166, {align:"center"});
  setDraw("#0a3a20"); doc.setLineWidth(0.4); doc.line(L+50, 180, R-50, 180);
  doc.setFontSize(7.5); setTxt("#1a5a30");
  doc.text(`GENERATED: ${new Date().toLocaleString().toUpperCase()}`, PW/2, 194, {align:"center"});
  doc.text("ANALYST EYES ONLY  ·  DO NOT DISTRIBUTE", PW/2, 208, {align:"center"});

  y = 285;
  const statuses = [["NARRATIVE ENG","ACTIVE"],["REVERSE DCF","COMPLETE"],["FORWARD DCF","COMPLETE"],["COMPS","VERIFIED"],["DEAL RADAR","SCANNED"],["WEB UPLINK","LIVE"]];
  setFill("#010c07"); doc.rect(L-4, y-8, TW+8, 76, "F");
  setDraw("#0a2318"); doc.rect(L-4, y-8, TW+8, 76, "S");
  y += 8;
  statuses.forEach((st, i) => {
    const cx = i%2===0 ? L+8 : PW/2+14;
    if (i%2===0 && i>0) y+=18;
    setFill("#00ff88"); doc.circle(cx-4, y-3, 2.5, "F");
    doc.setFont("Courier","normal"); doc.setFontSize(7.5); setTxt("#336644");
    doc.text(`${st[0]}: `, cx+4, y);
    setTxt("#00ff88"); doc.text(st[1], cx+4+doc.getTextWidth(`${st[0]}: `), y);
  });
  y += 28;

  const toc = ["10 KEY POINTS","NARRATIVE ANALYSIS","REVERSE DCF + SCENARIO CHART","FORWARD DCF MODEL","TRADING COMPARABLES + COMPS CHART","SENSITIVITY MATRIX","DEAL RADAR","SO WHAT — INVESTMENT DECISION","ASSUMPTIONS & CONFIDENCE CHECKLIST"];
  setFill("#010c07"); doc.rect(L-4, y, TW+8, toc.length*11+22, "F");
  setDraw("#0a2318"); doc.rect(L-4, y, TW+8, toc.length*11+22, "S");
  y += 12;
  doc.setFont("Courier","bold"); doc.setFontSize(7); setTxt("#00ffcc");
  doc.text("[ REPORT CONTENTS ]", L+6, y); y+=12;
  toc.forEach((s, i) => {
    doc.setFont("Courier","normal"); doc.setFontSize(7.5); setTxt("#1a5a30");
    doc.text(`0${i+1}`, L+6, y); setTxt("#336644"); doc.text(s, L+22, y); y+=11;
  });

  // ── EXTRACT CHART DATA ──
  const extract = (tag, parser, fallback) => { const m=reportText.match(new RegExp("<<<CHART:"+tag+">>>([\\s\\S]*?)<<<END_CHART>>>")); return m?parser(m[1].trim()):fallback; };
  const scenarioData  = extract("SCENARIO_BARS",  parseScenarioBars,  []);
  const compsData     = extract("COMPS_TABLE",    parseCompsTable,    {rows:[]});
  const sensData      = extract("SENSITIVITY",    parseSensitivity,   {header:[],rows:[]});
  const revenueData   = extract("REVENUE_MODEL",  parseRevenueModel,  []);
  const marginData    = extract("MARGIN_BRIDGE",  parseMarginBridge,  []);
  const fcfData       = extract("FCF_BRIDGE",     parseFCFBridge,     []);
  const growthData    = extract("GROWTH_DECOMP",  parseGrowthDecomp,  []);
  const capStrData    = extract("CAPITAL_STRUCTURE", parseCapitalStructure, {items:[],ratios:[]});
  const probData      = extract("PROBABILITY_WHEEL", parseProbabilityWheel, {scenarios:[],current:null});
  const catalystData  = extract("CATALYST_TIMELINE", parseCatalystTimeline, []);

  // ── PDF CHART RENDERERS ──

  const drawGrowthChart = (data) => {
    if(!data.length) return;
    const rowH=18, total=data.length*rowH+52;
    checkY(total);
    setFill("#010c07"); doc.rect(L-4,y-4,TW+8,total,"F");
    setDraw("#0a2318"); doc.rect(L-4,y-4,TW+8,total,"S");
    setFill("#00ccff"); doc.rect(L-4,y-4,TW+8,2,"F");
    doc.setFont("Courier","normal"); doc.setFontSize(6.5); setTxt("#1a5a50");
    doc.text("[ SEGMENT BREAKDOWN — REVENUE · GROWTH · MARGIN ]", L+4, y+10); y+=22;
    const totRev = data.reduce((s,d)=>s+d.revenue,0);
    const maxRev = Math.max(...data.map(d=>d.revenue))*1.1;
    const colW = [90, TW-230, 55, 55, 40];
    let cx=L+4;
    ["SEGMENT","REV BAR","$B","GROWTH","MARGIN"].forEach((h,i)=>{ doc.setFontSize(6); setTxt("#1a5a30"); doc.text(h,cx,y+8); cx+=colW[i]; });
    setDraw("#0a2318"); doc.setLineWidth(0.3); doc.line(L,y+12,R,y+12); y+=16;
    data.forEach(d=>{
      const [rr,rg,rb]=hex2rgb(d.color||"#00ccff");
      doc.setFillColor(rr,rg,rb);
      let cx2=L+4;
      doc.setFont("Courier","normal"); doc.setFontSize(6.5); setTxt(d.color||"#4a8a60");
      doc.text((d.segment||"").slice(0,12),cx2,y+8); cx2+=colW[0];
      const bw=((d.revenue||0)/maxRev)*colW[1];
      doc.setFillColor(rr,rg,rb); doc.rect(cx2,y+2,bw,8,"F"); cx2+=colW[1];
      setTxt("#ccffe8"); doc.text(`$${(d.revenue||0).toFixed(1)}B`,cx2,y+8); cx2+=colW[2];
      const gcol=d.growth>=15?"#00ff88":d.growth>=5?"#00ccff":d.growth>=0?"#ffaa00":"#ff4444";
      setTxt(gcol); doc.text(`${d.growth>=0?"+":""}${d.growth}%`,cx2,y+8); cx2+=colW[3];
      setTxt("#4a8a60"); doc.text(`${d.margin}%`,cx2,y+8);
      y+=rowH;
    });
    y+=14;
  };

  const drawRevenueChart = (data) => {
    if(!data.length) return;
    const boxH=120;
    checkY(boxH+20);
    setFill("#010c07"); doc.rect(L-4,y-4,TW+8,boxH+20,"F");
    setDraw("#0a2318"); doc.rect(L-4,y-4,TW+8,boxH+20,"S");
    setFill("#00ff88"); doc.rect(L-4,y-4,TW+8,2,"F");
    doc.setFont("Courier","normal"); doc.setFontSize(6.5); setTxt("#1a5a30");
    doc.text("[ 5-YEAR REVENUE PROJECTIONS ($B) ]", L+4, y+10); y+=20;
    const allV=data.flatMap(r=>[r.bull,r.base,r.bear]).filter(v=>!isNaN(v));
    const maxV=Math.max(...allV)*1.1, minV=Math.min(...allV)*0.9;
    const pH=boxH-20, pW=TW-30, padL2=30;
    const xS=pW/(data.length-1||1), yScale=pH/(maxV-minV||1);
    const xp=i=>L+padL2+i*xS, yp=v=>y+pH-((v-minV)*yScale);
    [["bull","#00ff88"],["base","#00ccff"],["bear","#ff4444"]].forEach(([k,col])=>{
      const [rr,rg,rb]=hex2rgb(col);
      doc.setDrawColor(rr,rg,rb); doc.setLineWidth(1);
      data.forEach((r,i)=>{
        if(i>0){ doc.line(xp(i-1),yp(data[i-1][k]),xp(i),yp(r[k])); }
        doc.setFillColor(rr,rg,rb); doc.circle(xp(i),yp(r[k]),2,"F");
      });
    });
    data.forEach((r,i)=>{ doc.setFont("Courier","normal"); doc.setFontSize(6); setTxt("#336644"); doc.text(r.year,xp(i),y+pH+10,{align:"center"}); });
    y+=boxH+14;
  };

  const drawMarginChart = (data) => {
    if(!data.length) return;
    const MCOL={GROSS:"#00ff88",EBITDA:"#00ccff",EBIT:"#44aaff",NET:"#ffaa00",FCF:"#ff8844"};
    const boxH=data.length*22+38;
    checkY(boxH);
    setFill("#010c07"); doc.rect(L-4,y-4,TW+8,boxH,"F");
    setDraw("#0a2318"); doc.rect(L-4,y-4,TW+8,boxH,"S");
    setFill("#44aaff"); doc.rect(L-4,y-4,TW+8,2,"F");
    doc.setFont("Courier","normal"); doc.setFontSize(6.5); setTxt("#1a5a50");
    doc.text("[ MARGIN BRIDGE — BASE CASE PROFITABILITY ]", L+4, y+10); y+=20;
    const maxP=Math.max(...data.map(d=>d.pct||0))*1.1||100;
    const BAR_MAX=TW-90;
    data.forEach(d=>{
      const col=MCOL[d.label]||"#4a8a60";
      const bw=(d.pct/maxP)*BAR_MAX;
      const [rr,rg,rb]=hex2rgb(col);
      doc.setFont("Courier","normal"); doc.setFontSize(7); setTxt("#336644");
      doc.text(`${d.label} MARGIN`,L+4,y+8);
      doc.setFillColor(rr,rg,rb); doc.rect(L+80,y,bw,9,"F");
      setTxt(col); doc.setFont("Courier","bold"); doc.setFontSize(7.5);
      doc.text(`${d.pct.toFixed(1)}%`,L+80+bw+5,y+8);
      y+=18;
    });
    y+=12;
  };

  const drawFCFChart = (data) => {
    if(!data.length) return;
    const boxH=data.length*20+38;
    checkY(boxH);
    setFill("#010c07"); doc.rect(L-4,y-4,TW+8,boxH,"F");
    setDraw("#0a2318"); doc.rect(L-4,y-4,TW+8,boxH,"S");
    setFill("#ffaa00"); doc.rect(L-4,y-4,TW+8,2,"F");
    doc.setFont("Courier","normal"); doc.setFontSize(6.5); setTxt("#5a4a10");
    doc.text("[ FCF BRIDGE — EBITDA TO FREE CASH FLOW ($B) ]", L+4, y+10); y+=20;
    const maxA=Math.max(...data.map(d=>Math.abs(d.value)))*1.1;
    const BAR_MAX=(TW-110)/2;
    data.forEach(d=>{
      const isRes=d.type==="result", isNeg=d.type==="negative";
      const col=isRes?"#ffaa00":isNeg?"#ff4444":"#00ff88";
      const prefix=isNeg?"– ":isRes?"= ":"+ ";
      const bw=(Math.abs(d.value)/maxA)*BAR_MAX;
      const [rr,rg,rb]=hex2rgb(col);
      setTxt(isRes?"#ffaa00":"#336644"); doc.setFont("Courier",isRes?"bold":"normal"); doc.setFontSize(6.5);
      doc.text(`${prefix}${d.label.replace(/_/g," ")}`,L+4,y+8);
      const barX=isNeg?L+96+BAR_MAX-bw:L+96;
      doc.setFillColor(rr,rg,rb); doc.rect(barX,y+1,bw,8,"F");
      setTxt(col); doc.setFont("Courier","bold"); doc.setFontSize(7);
      doc.text(`${isNeg?"-":""}$${Math.abs(d.value).toFixed(1)}B`,L+96+BAR_MAX*2+6,y+8);
      y+=18;
    });
    y+=12;
  };

  const drawCapStrChart = (data) => {
    if(!data.items?.length) return;
    const total=data.items.reduce((s,d)=>s+Math.abs(d.value),0);
    const boxH=data.items.length*18+data.ratios?.length*14+52;
    checkY(boxH);
    setFill("#010c07"); doc.rect(L-4,y-4,TW+8,boxH,"F");
    setDraw("#0a2318"); doc.rect(L-4,y-4,TW+8,boxH,"S");
    setFill("#aa44ff"); doc.rect(L-4,y-4,TW+8,2,"F");
    doc.setFont("Courier","normal"); doc.setFontSize(6.5); setTxt("#4a1a5a");
    doc.text("[ CAPITAL STRUCTURE — DEBT · EQUITY · CASH ]", L+4, y+10); y+=20;
    const BAR_MAX=TW-100;
    data.items.forEach(d=>{
      const pct=total>0?((Math.abs(d.value)/total)*100).toFixed(0):0;
      const bw=(Math.abs(d.value)/total)*BAR_MAX;
      const [rr,rg,rb]=hex2rgb(d.color||"#4a8a60");
      doc.setFont("Courier","normal"); doc.setFontSize(7); setTxt("#336644");
      doc.text(d.label,L+4,y+8);
      doc.setFillColor(rr,rg,rb); doc.rect(L+60,y+1,bw,8,"F");
      setTxt(d.color||"#4a8a60"); doc.setFont("Courier","bold"); doc.setFontSize(7);
      doc.text(`$${d.value.toFixed(1)}B (${pct}%)`,L+60+BAR_MAX+6,y+8);
      y+=16;
    });
    data.ratios?.forEach(r=>{
      setFill("#00ff8806"); doc.rect(L,y,TW,12,"F");
      doc.setFont("Courier","normal"); doc.setFontSize(7); setTxt("#1a5a30");
      doc.text(`${r.label}: `,L+4,y+9);
      setTxt("#00ffcc"); doc.setFont("Courier","bold"); doc.text(`${r.value}x`,L+4+doc.getTextWidth(`${r.label}: `),y+9);
      y+=14;
    });
    y+=12;
  };

  const drawProbChart = (data) => {
    if(!data.scenarios?.length) return;
    const weighted=data.scenarios.reduce((s,sc)=>s+(sc.prob/100)*sc.price,0);
    const updown=data.current?((weighted-data.current)/data.current*100):null;
    const boxH=data.scenarios.length*22+52;
    checkY(boxH);
    setFill("#010c07"); doc.rect(L-4,y-4,TW+8,boxH,"F");
    setDraw("#0a2318"); doc.rect(L-4,y-4,TW+8,boxH,"S");
    setFill("#00ccff"); doc.rect(L-4,y-4,TW+8,2,"F");
    doc.setFont("Courier","normal"); doc.setFontSize(6.5); setTxt("#1a5a50");
    doc.text("[ PROBABILITY-WEIGHTED OUTCOME ]", L+4, y+10); y+=20;
    data.scenarios.forEach(sc=>{
      const bw=(sc.prob/100)*(TW-100);
      const [rr,rg,rb]=hex2rgb(sc.color||"#00ccff");
      doc.setFont("Courier","bold"); doc.setFontSize(7); setTxt(sc.color||"#00ccff");
      doc.text(sc.label,L+4,y+8);
      doc.setFillColor(rr,rg,rb); doc.rect(L+50,y+1,bw,8,"F");
      setTxt(sc.color||"#00ccff");
      doc.text(`${sc.prob}% → $${sc.price.toFixed(0)}`,L+50+bw+6,y+8);
      y+=18;
    });
    setFill("#00ccff0a"); doc.rect(L,y,TW,16,"F");
    doc.setFont("Courier","bold"); doc.setFontSize(8); setTxt("#00ffcc");
    doc.text(`WEIGHTED PRICE: $${weighted.toFixed(0)}`,L+4,y+11);
    if(updown!==null){ setTxt(updown>=0?"#00ff88":"#ff4444"); doc.text(`${updown>=0?"+":""}${updown.toFixed(1)}% vs CURRENT`,L+4+doc.getTextWidth(`WEIGHTED PRICE: $${weighted.toFixed(0)}`)+10,y+11); }
    y+=28;
  };

  const drawCatalystChart = (data) => {
    if(!data.length) return;
    const sorted=[...data].sort((a,b)=>a.weeks-b.weeks);
    const boxH=sorted.length*18+52;
    checkY(boxH);
    setFill("#010c07"); doc.rect(L-4,y-4,TW+8,boxH,"F");
    setDraw("#0a2318"); doc.rect(L-4,y-4,TW+8,boxH,"S");
    setFill("#ff8844"); doc.rect(L-4,y-4,TW+8,2,"F");
    doc.setFont("Courier","normal"); doc.setFontSize(6.5); setTxt("#5a3010");
    doc.text("[ CATALYST TIMELINE — UPCOMING EVENTS & PRICE IMPACT ]", L+4, y+10); y+=20;
    const maxI=Math.max(...sorted.map(d=>Math.abs(d.impact)),1);
    const colW2=[28,TW-145,70,40];
    ["WK","EVENT","IMPACT","BIAS"].forEach((h,i)=>{ setTxt("#1a5a30"); doc.setFontSize(6); let cx=L+4; for(let j=0;j<i;j++) cx+=colW2[j]; doc.text(h,cx,y+8); });
    setDraw("#0a2318"); doc.setLineWidth(0.3); doc.line(L,y+12,R,y+12); y+=16;
    sorted.forEach(ev=>{
      const col=ev.sentiment==="BULLISH"?"#00ff88":ev.sentiment==="BEARISH"?"#ff4444":"#ffaa00";
      const bw=(Math.abs(ev.impact)/maxI)*60;
      const [rr,rg,rb]=hex2rgb(col);
      let cx=L+4;
      doc.setFont("Courier","normal"); doc.setFontSize(6.5); setTxt("#336644");
      doc.text(`W${ev.weeks}`,cx,y+8); cx+=colW2[0];
      setTxt("#8db8a0"); doc.text((ev.name||"").slice(0,22),cx,y+8); cx+=colW2[1];
      doc.setFillColor(rr,rg,rb); doc.rect(cx,y+2,bw,7,"F"); cx+=colW2[2];
      setTxt(col); doc.setFont("Courier","bold"); doc.setFontSize(6.5);
      doc.text(`${ev.impact>=0?"+":""}${ev.impact}%`,cx,y+8);
      y+=16;
    });
    y+=10;
  };

  const drawScenarioBars = (data) => {
    if(!data.length) return;
    const boxH = data.length*26+38;
    checkY(boxH);
    setFill("#010c07"); doc.rect(L-4,y-4,TW+8,boxH,"F");
    setDraw("#0a2318"); doc.rect(L-4,y-4,TW+8,boxH,"S");
    setFill("#00ff88"); doc.rect(L-4,y-4,TW+8,2,"F");
    doc.setFont("Courier","normal"); doc.setFontSize(6.5); setTxt("#1a5a30");
    doc.text("[ SCENARIO VALUATION — PRICE TARGETS ]", L+4, y+10);
    y+=22;
    const maxP = Math.max(...data.map(d=>d.price))*1.15;
    const BAR_MAX = TW-90;
    data.forEach(d=>{
      const bw=(d.price/maxP)*BAR_MAX;
      const [r,g,b]=hex2rgb(d.color);
      doc.setFont("Courier","normal"); doc.setFontSize(7.5); setTxt("#336644");
      doc.text(d.label, L+4, y+8);
      doc.setFillColor(r,g,b); doc.rect(L+66,y,bw,10,"F");
      setTxt(d.color); doc.setFont("Courier","bold"); doc.setFontSize(8);
      doc.text(`$${d.price.toFixed(2)}`, L+66+bw+6, y+8);
      y+=20;
    });
    y+=14;
  };

  const drawCompsChart = (data) => {
    if(!data.rows?.length) return;
    const rowH=14, total=data.rows.length*rowH+48;
    checkY(total);
    setFill("#010c07"); doc.rect(L-4,y-4,TW+8,total,"F");
    setDraw("#0a2318"); doc.rect(L-4,y-4,TW+8,total,"S");
    setFill("#00ccff"); doc.rect(L-4,y-4,TW+8,2,"F");
    doc.setFont("Courier","normal"); doc.setFontSize(6.5); setTxt("#1a5a50");
    doc.text("[ TRADING COMPARABLES — EV/EBITDA NTM ]", L+4, y+10);
    y+=22;
    const colW=[80,TW-250,65,55,55];
    [["TICKER","EBITDA BAR","EV/EBITDA","P/E","EV/REV"]].forEach(heads=>{
      let cx=L+4;
      heads.forEach((h,i)=>{ doc.setFontSize(6.5); setTxt("#1a5a30"); doc.text(h,cx,y+8); cx+=colW[i]; });
    });
    setDraw("#0a2318"); doc.setLineWidth(0.3); doc.line(L,y+12,R,y+12);
    y+=16;
    const maxV=Math.max(...data.rows.map(r=>parseFloat(r.ev_ebitda)||0))*1.2||30;
    data.rows.forEach(r=>{
      const isH=r.highlight;
      if(isH){ setFill("#00ff8808"); doc.rect(L,y-2,TW,rowH+2,"F"); }
      const col=isH?"#00ff88":(r.color||"#4a7a60");
      const name=r.company.replace(/ ?[—–-]? ?HIGHLIGHT/gi,"").trim();
      let cx=L+4;
      doc.setFont("Courier",isH?"bold":"normal"); doc.setFontSize(7.5); setTxt(col);
      doc.text(name,cx,y+8); cx+=colW[0];
      const bw=((parseFloat(r.ev_ebitda)||0)/maxV)*colW[1];
      const [rr,rg,rb]=hex2rgb(col); doc.setFillColor(rr,rg,rb); doc.rect(cx,y+2,bw,8,"F"); cx+=colW[1];
      doc.setFont("Courier","normal"); doc.setFontSize(7.5); setTxt(col);
      doc.text(`${r.ev_ebitda}x`,cx,y+8); cx+=colW[2];
      setTxt("#4a8a60"); doc.text(`${r.pe}x`,cx,y+8); cx+=colW[3];
      doc.text(`${r.ev_rev}x`,cx,y+8);
      y+=rowH;
    });
    y+=16;
  };

  const drawSensChart = (data) => {
    if(!data.rows?.length) return;
    const cols=data.header.length, colW=(TW-52)/(cols-1), rowH=16;
    const total=rowH*(data.rows.length+1)+44;
    checkY(total);
    setFill("#010c07"); doc.rect(L-4,y-4,TW+8,total,"F");
    setDraw("#0a2318"); doc.rect(L-4,y-4,TW+8,total,"S");
    setFill("#ffaa00"); doc.rect(L-4,y-4,TW+8,2,"F");
    doc.setFont("Courier","normal"); doc.setFontSize(6.5); setTxt("#5a4a10");
    doc.text("[ SENSITIVITY MATRIX — WACC vs TERMINAL GROWTH RATE ]", L+4, y+10);
    y+=22;
    const allVals=data.rows.flatMap(r=>r.values.map(v=>parseFloat(v.replace(/[$,]/g,""))||0)).filter(v=>v>0);
    const minV=Math.min(...allVals), maxV=Math.max(...allVals);
    doc.setFont("Courier","normal"); doc.setFontSize(6.5); setTxt("#1a5a30");
    doc.text("WACC\\g", L+2, y+8);
    data.header.slice(1).forEach((h,i)=>{ doc.text(h, L+54+i*colW+colW/2, y+8, {align:"center"}); });
    setDraw("#0a2318"); doc.line(L,y+12,R,y+12);
    y+=16;
    data.rows.forEach(row=>{
      setTxt("#1a5a30"); doc.setFont("Courier","normal"); doc.setFontSize(6.5);
      doc.text(row.wacc, L+2, y+8);
      row.values.forEach((v,vi)=>{
        const val=parseFloat(v.replace(/[$,]/g,""))||0;
        const pct=maxV>minV?(val-minV)/(maxV-minV):0.5;
        let bg,txtCol;
        if(pct>0.7){bg="#00ff8820";txtCol="#00ff88";}
        else if(pct>0.4){bg="#00ccff18";txtCol="#00ccff";}
        else if(pct>0.2){bg="#ffaa0014";txtCol="#ffaa00";}
        else{bg="#ff444414";txtCol="#ff4444";}
        const [rr,rg,rb]=hex2rgb(bg.slice(0,7));
        doc.setFillColor(rr,rg,rb); doc.rect(L+54+vi*colW, y, colW-1, rowH-2,"F");
        setTxt(txtCol); doc.setFont("Courier","bold"); doc.setFontSize(6.5);
        doc.text(v, L+54+vi*colW+colW/2, y+8, {align:"center"});
      });
      y+=rowH;
    });
    y+=14;
  };

  // ── MAIN TEXT RENDERER ──
  newPage();
  const textOnly = reportText.replace(/<<<CHART:\w+>>>[\s\S]*?<<<END_CHART>>>/g, "<<<CHART_PLACEHOLDER>>>");
  const cleanText = textOnly.replace(/\*\*/g,"");
  let chartQueue = ["SCENARIO","GROWTH","REVENUE","MARGIN","FCF","CAPSTR","COMPS","SENS","PROB","CATALYST"];
  let chartIdx = 0;

  for (const line of cleanText.split("\n")) {
    const clean = line.trim();
    if (!clean) { y+=3; continue; }

    if (clean === "<<<CHART_PLACEHOLDER>>>") {
      const ct = chartQueue[chartIdx++];
      if(ct==="SCENARIO")  drawScenarioBars(scenarioData);
      else if(ct==="COMPS")    drawCompsChart(compsData);
      else if(ct==="SENS")     drawSensChart(sensData);
      else if(ct==="GROWTH")   drawGrowthChart(growthData);
      else if(ct==="REVENUE")  drawRevenueChart(revenueData);
      else if(ct==="MARGIN")   drawMarginChart(marginData);
      else if(ct==="FCF")      drawFCFChart(fcfData);
      else if(ct==="CAPSTR")   drawCapStrChart(capStrData);
      else if(ct==="PROB")     drawProbChart(probData);
      else if(ct==="CATALYST") drawCatalystChart(catalystData);
      continue;
    }

    if (/^[🎯💡🔍📋]/.test(clean)) {
      checkY(26);
      setFill("#010c07"); doc.rect(L-4,y-2,TW+8,22,"F");
      setFill("#00ffaa"); doc.rect(L-4,y-2,2,22,"F");
      doc.setFont("Courier","bold"); doc.setFontSize(7.5); setTxt("#00ffaa");
      doc.text(("▶ "+clean).toUpperCase().slice(0,90), L+6, y+13);
      setDraw("#0a2318"); doc.setLineWidth(0.3); doc.line(L,y+20,R,y+20);
      y+=28; continue;
    }
    if (/^[①②③④⑤⑥⑦⑧⑨⑩]/.test(clean)) {
      const wrapped=doc.splitTextToSize(clean, TW-18);
      checkY(wrapped.length*11+10);
      setFill("#00ff8806"); doc.rect(L-2,y-1,TW+4,wrapped.length*11+6,"F");
      setFill("#00ff88"); doc.rect(L-2,y-1,2,wrapped.length*11+6,"F");
      doc.setFont("Courier","normal"); doc.setFontSize(7.5); setTxt("#ccffe8");
      wrapped.forEach((wl,wi)=>{ doc.text(wl,L+8,y+9+wi*11); });
      y+=wrapped.length*11+10; continue;
    }
    if (/^■/.test(clean)) {
      checkY(18);
      doc.setFont("Courier","bold"); doc.setFontSize(8); setTxt("#00ffcc");
      const w=doc.splitTextToSize(clean,TW);
      w.forEach((wl,wi)=>{ doc.text(wl,L,y+10+wi*10); });
      y+=w.length*10+10; continue;
    }
    if (/^⚠/.test(clean)) {
      const w=doc.splitTextToSize(clean,TW-16);
      checkY(w.length*10+14);
      setFill("#ffaa0010"); doc.rect(L-4,y-2,TW+8,w.length*10+12,"F");
      setDraw("#ffaa0030"); doc.setLineWidth(0.3); doc.rect(L-4,y-2,TW+8,w.length*10+12,"S");
      doc.setFont("Courier","normal"); doc.setFontSize(7.5); setTxt("#ffcc44");
      w.forEach((wl,wi)=>{ doc.text(wl,L+4,y+8+wi*10); });
      y+=w.length*10+14; continue;
    }

    let color="#8db8a0", bold=false, indent=0;
    if (/^▸/.test(clean)) { color="#00ccaa"; indent=12; }
    else if (/^→/.test(clean)) { color="#00ffaa"; bold=true; }
    else if (/^\[Actual\]|\[Estimated\]|\[Assumed\]/.test(clean)) { color="#ffaa00"; }

    const w=doc.splitTextToSize(clean, TW-indent);
    checkY(w.length*10+3);
    doc.setFont("Courier",bold?"bold":"normal"); doc.setFontSize(7.5); setTxt(color);
    w.forEach((wl,wi)=>{ doc.text(wl,L+indent,y+9+wi*10); });
    y+=w.length*10+3;
  }

  // ── DISCLAIMER PAGE ──
  newPage();
  setFill("#010c07"); doc.rect(L-4,y-4,TW+8,90,"F");
  setDraw("#0a2318"); doc.rect(L-4,y-4,TW+8,90,"S");
  setFill("#ffaa00"); doc.rect(L-4,y-4,TW+8,2,"F");
  y+=10;
  doc.setFont("Courier","bold"); doc.setFontSize(8); setTxt("#ffcc44");
  doc.text("LEGAL DISCLAIMER", L+4, y+10); y+=22;
  const disc="This report is generated by an AI system and is for informational purposes only. It does not constitute investment advice, a solicitation, or an offer to buy or sell any security. Past performance does not guarantee future results. All financial projections are estimates and subject to significant uncertainty. Always conduct independent due diligence and consult a licensed financial advisor before making investment decisions.";
  const dL=doc.splitTextToSize(disc,TW-16);
  doc.setFont("Courier","normal"); doc.setFontSize(7); setTxt("#336644");
  dL.forEach((l,i)=>{ doc.text(l,L+4,y+i*10); });

  doc.save(`EIC_${company.toUpperCase().replace(/\s+/g,"_")}_${new Date().toISOString().slice(0,10)}.pdf`);
}

// ─────────────────────────────────────────────────────────────────────────────
// UI COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────
const GlitchText = ({ text }) => {
  const [g, setG] = useState(false);
  useEffect(() => {
    const t = setInterval(() => { setG(true); setTimeout(() => setG(false), 100); }, 3500 + Math.random() * 2000);
    return () => clearInterval(t);
  }, []);
  return (
    <span style={{ position: "relative", display: "inline-block" }}>
      <span style={{ opacity: g ? 0.4 : 1, transition: "opacity 0.04s" }}>{text}</span>
      {g && <span style={{ position: "absolute", left: 2, top: 0, color: "#00ffe5", opacity: 0.7, clipPath: "inset(25% 0 55% 0)", pointerEvents: "none" }}>{text}</span>}
    </span>
  );
};
const Scanlines = () => <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 9999, background: "repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,255,160,0.012) 2px,rgba(0,255,160,0.012) 4px)" }} />;
const CRTVignette = () => <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 9998, background: "radial-gradient(ellipse at center,transparent 60%,rgba(0,0,0,0.65) 100%)" }} />;
const StatusDot = ({ on }) => <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: on ? "#00ff88" : "#ff3333", boxShadow: on ? "0 0 7px #00ff88" : "0 0 7px #ff3333", marginRight: 5, flexShrink: 0, animation: on ? "blink 2.5s ease-in-out infinite" : "none" }} />;
const TickerBar = () => {
  const items = ["DCF.ENGINE","WACC.CAL","COMPS.OK","RADAR.ON","FCFF.RDY","NTM.SYNC","EBITDA.LOCK","NAV.LIVE","IRR.CALC","EV.TRACK","PDF.EXPORT"];
  const [off, setOff] = useState(0);
  useEffect(() => { const id = setInterval(() => setOff(o => (o+1)%(items.length*110)), 28); return () => clearInterval(id); }, []);
  const rep = [...items,...items,...items,...items];
  return (
    <div style={{ overflow: "hidden", whiteSpace: "nowrap", flex: 1, opacity: 0.45 }}>
      <span style={{ display: "inline-block", transform: `translateX(-${off}px)`, fontSize: "0.58rem", color: "#00ffa3", letterSpacing: "0.15em" }}>
        {rep.map((t,i) => <span key={i}> · {t}</span>)}
      </span>
    </div>
  );
};
const SidePanel = ({ label, children, color="#00ff88" }) => (
  <div style={{ border: `1px solid ${color}22`, borderRadius: 2, background: `${color}05`, padding: "0.8rem", position: "relative", marginBottom: "0.9rem" }}>
    <div style={{ position: "absolute", top: "-0.55rem", left: "0.7rem", background: "#050d09", padding: "0 0.4rem", fontSize: "0.58rem", color, letterSpacing: "0.2em", fontFamily: "monospace" }}>[ {label} ]</div>
    {children}
  </div>
);
const ProgressBar = ({ pct }) => (
  <div>
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.58rem", color: "#2a6a40", marginBottom: 4 }}>
      <span>PROGRESS</span><span style={{ color: "#00ff88" }}>{pct}%</span>
    </div>
    <div style={{ height: 2, background: "#0a2a18", borderRadius: 1 }}>
      <div style={{ height: "100%", width: `${pct}%`, background: "linear-gradient(90deg,#00ff88,#00ccff)", borderRadius: 1, transition: "width 0.7s ease", boxShadow: "0 0 8px rgba(0,255,136,0.6)" }} />
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// MAIN APP
// ─────────────────────────────────────────────────────────────────────────────
export default function App() {
  const [company, setCompany] = useState("");
  const [report, setReport] = useState("");
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");
  const [log, setLog] = useState(["SYSTEM BOOT COMPLETE","ALL MODULES NOMINAL","AWAITING TARGET INPUT..."]);
  const [progress, setProgress] = useState(0);
  const [apiKey, setApiKey] = useState(() => {
    try { return localStorage.getItem("eic_api_key") || ""; } catch { return ""; }
  });
  const [showKey, setShowKey] = useState(false);
  const [keyStatus, setKeyStatus] = useState(() => {
    try { return localStorage.getItem("eic_api_key") ? "SAVED" : "NOT SET"; } catch { return "NOT SET"; }
  });
  const reportRef = useRef(null);
  const logRef = useRef(null);
  const addLog = (msg) => setLog(l => [...l.slice(-30), `[${new Date().toLocaleTimeString()}] ${msg}`]);
  useEffect(() => { if(logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight; }, [log]);

  const saveApiKey = (key) => {
    const trimmed = key.trim();
    setApiKey(trimmed);
    try {
      if (trimmed) { localStorage.setItem("eic_api_key", trimmed); setKeyStatus("SAVED"); }
      else { localStorage.removeItem("eic_api_key"); setKeyStatus("NOT SET"); }
    } catch { setKeyStatus(trimmed ? "SET" : "NOT SET"); }
  };

  const analyze = useCallback(async () => {
    if (!company.trim() || loading) return;
    const key = apiKey.trim();
    if (!key) { setError("API key required — enter your Anthropic key in the API.KEY panel."); return; }
    setLoading(true); setError(""); setReport(""); setProgress(0);
    const stages = [
      [4,"INITIALIZING TARGET LOCK..."],[10,`ACQUIRING: ${company.toUpperCase()}`],
      [18,"DEPLOYING WEB SEARCH ARRAY..."],[26,"PULLING FILINGS & MARKET DATA..."],
      [34,"MAPPING SEGMENT BREAKDOWN..."],[42,"RUNNING REVERSE DCF ENGINE..."],
      [50,"BUILDING REVENUE MODEL..."],[57,"COMPUTING MARGIN BRIDGE..."],
      [64,"CONSTRUCTING FCF BRIDGE..."],[70,"ANALYSING CAPITAL STRUCTURE..."],
      [76,"COMPILING TRADING COMPS..."],[82,"RUNNING SENSITIVITY MATRIX..."],
      [87,"ACTIVATING DEAL RADAR..."],[92,"COMPUTING PROBABILITY WHEEL..."],
      [96,"ASSEMBLING REPORT PAYLOAD..."],
    ];
    let si=0;
    const interval = setInterval(() => { if(si<stages.length){const[p,msg]=stages[si++];setProgress(p);addLog(msg);} }, 850);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages",{
        method:"POST", headers:{"Content-Type":"application/json","x-api-key":key,"anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"},
        body:JSON.stringify({ model:"claude-sonnet-4-20250514", max_tokens:10000, system:SYSTEM_PROMPT,
          tools:[{type:"web_search_20250305",name:"web_search"}],
          messages:[{role:"user",content:`${company} analyze`}] }),
      });
      clearInterval(interval);
      if(!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const text = data.content.filter(b=>b.type==="text").map(b=>b.text).join("\n");
      setProgress(100); addLog("ANALYSIS COMPLETE — REPORT LOCKED");
      setReport(text);
      setTimeout(()=>reportRef.current?.scrollIntoView({behavior:"smooth"}),300);
    } catch(e) { clearInterval(interval); setError(e.message); addLog(`ERROR: ${e.message}`); setProgress(0); }
    finally { setLoading(false); }
  }, [company, loading, apiKey]);

  const handleExportPDF = async () => {
    if (!report || exporting) return;
    setExporting(true); addLog("GENERATING TERMINAL PDF EXPORT...");
    try { await exportPDF(company, report); addLog("PDF EXPORT COMPLETE — FILE DOWNLOADED"); }
    catch(e) { addLog(`PDF ERROR: ${e.message}`); }
    finally { setExporting(false); }
  };

  const frameworks = ["NARRATIVE","GROWTH DECOMP","REVERSE DCF","REVENUE MODEL","MARGIN BRIDGE","FCF BRIDGE","CAP STRUCTURE","TRADING COMPS","SENSITIVITY","PROBABILITY","CATALYSTS","DEAL RADAR","SO WHAT"];

  return (
    <div style={{ minHeight:"100vh", background:"#030e07", color:"#00ff88", fontFamily:"'Courier New',Courier,monospace", display:"flex", flexDirection:"column", overflow:"hidden" }}>
      <Scanlines /><CRTVignette />
      <style>{`
        @keyframes blink{0%,100%{opacity:1}50%{opacity:0.25}}
        @keyframes cursor{0%,100%{opacity:1}50%{opacity:0}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse{0%,100%{box-shadow:0 0 8px rgba(0,204,255,0.3)}50%{box-shadow:0 0 18px rgba(0,204,255,0.7)}}
        *{box-sizing:border-box} input{outline:none!important}
        input:focus{border-color:#00ff88!important;box-shadow:0 0 14px rgba(0,255,136,0.2)!important}
        input::placeholder{color:#1a4a28}
        ::-webkit-scrollbar{width:3px} ::-webkit-scrollbar-track{background:transparent}
        ::-webkit-scrollbar-thumb{background:#0a3020;border-radius:2px}
        .ana-btn:hover:not(:disabled){background:rgba(0,255,136,0.15)!important;box-shadow:0 0 16px rgba(0,255,136,0.25)}
        .pdf-btn:hover:not(:disabled){background:rgba(0,204,255,0.14)!important;border-color:#00ccff!important;color:#00ccff!important}
      `}</style>

      {/* Top Bar */}
      <div style={{ background:"#010a05", borderBottom:"1px solid #0a2318", padding:"0.5rem 1.5rem", display:"flex", alignItems:"center", gap:"1.2rem", flexShrink:0 }}>
        <div style={{ fontSize:"0.62rem", letterSpacing:"0.22em", color:"#00ff88", whiteSpace:"nowrap", fontWeight:700 }}>◈ EIC — EQUITY INTELLIGENCE COMMAND</div>
        <TickerBar />
        <div style={{ fontSize:"0.58rem", color:"#1a4a28", whiteSpace:"nowrap", letterSpacing:"0.08em" }}>{new Date().toISOString().slice(0,19).replace("T"," ")} UTC</div>
      </div>

      {/* Body */}
      <div style={{ display:"flex", flex:1, minHeight:0 }}>
        {/* Sidebar */}
        <div style={{ width:240, flexShrink:0, background:"#010c07", borderRight:"1px solid #0a2318", padding:"1rem 0.85rem", overflowY:"auto", display:"flex", flexDirection:"column" }}>
          <SidePanel label="SYS.STATUS">
            {[["NARRATIVE ENG",true],["GROWTH DECOMP",!loading&&!!report],["REVENUE MODEL",!loading&&!!report],["MARGIN BRIDGE",!loading&&!!report],["FCF BRIDGE",!loading&&!!report],["CAP STRUCTURE",!loading&&!!report],["COMPS",true],["SENSITIVITY",!loading&&!!report],["PROBABILITY",!loading&&!!report],["CATALYSTS",!loading&&!!report],["DEAL RADAR",true],["WEB UPLINK",true]].map(([k,on])=>(
              <div key={k} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", fontSize:"0.62rem", lineHeight:"2", color:"#336644" }}>
                <span>{k}</span><span style={{ display:"flex", alignItems:"center", color:on?"#00ff88":"#ffaa00" }}><StatusDot on={on}/>{on?"LIVE":"STBY"}</span>
              </div>
            ))}
          </SidePanel>

          <SidePanel label="API.KEY" color="#ff8844">
            <div style={{ fontSize:"0.58rem", color:"#5a3010", letterSpacing:"0.1em", marginBottom:"0.4rem", display:"flex", justifyContent:"space-between" }}>
              <span>ANTHROPIC API KEY</span>
              <span style={{ color: keyStatus==="SAVED"?"#00ff88":"#ff4444" }}>● {keyStatus}</span>
            </div>
            <div style={{ position:"relative" }}>
              <input
                type={showKey ? "text" : "password"}
                value={apiKey}
                onChange={e => saveApiKey(e.target.value)}
                placeholder="sk-ant-api03-..."
                style={{ width:"100%", background:"transparent", border:`1px solid ${keyStatus==="SAVED"?"#1a4a20":"#3a1a0a"}`, color:"#ff8844", padding:"0.45rem 2rem 0.45rem 0.55rem", fontSize:"0.65rem", fontFamily:"monospace", letterSpacing:"0.04em", borderRadius:2 }}
              />
              <button
                onClick={() => setShowKey(s => !s)}
                style={{ position:"absolute", right:"0.4rem", top:"50%", transform:"translateY(-50%)", background:"none", border:"none", color:"#5a3010", fontFamily:"monospace", fontSize:"0.6rem", cursor:"pointer", padding:0 }}>
                {showKey ? "HIDE" : "SHOW"}
              </button>
            </div>
            <div style={{ marginTop:"0.4rem", fontSize:"0.52rem", color:"#3a2010", lineHeight:"1.5" }}>
              Get your key at <span style={{ color:"#ff8844" }}>console.anthropic.com</span>. Stored locally in your browser only.
            </div>
            {keyStatus==="SAVED" && (
              <button
                onClick={() => saveApiKey("")}
                style={{ marginTop:"0.4rem", width:"100%", padding:"0.25rem", background:"transparent", border:"1px solid #3a1a0a", color:"#5a3010", fontFamily:"monospace", fontSize:"0.56rem", letterSpacing:"0.1em", cursor:"pointer", borderRadius:2 }}>
                ✕ CLEAR KEY
              </button>
            )}
          </SidePanel>

          <SidePanel label="TARGET.INPUT" color="#00ccff">
            <div style={{ fontSize:"0.58rem", color:"#1a5a50", letterSpacing:"0.1em", marginBottom:"0.45rem" }}>COMPANY DESIGNATION</div>
            <input value={company} onChange={e=>setCompany(e.target.value)} onKeyDown={e=>e.key==="Enter"&&analyze()}
              placeholder="AAPL / TSLA / NVDA..."
              style={{ width:"100%", background:"transparent", border:"1px solid #0a3a20", color:"#00ff88", padding:"0.45rem 0.55rem", fontSize:"0.78rem", fontFamily:"monospace", letterSpacing:"0.1em", borderRadius:2 }} />
            <button className="ana-btn" onClick={analyze} disabled={loading||!company.trim()||!apiKey.trim()}
              style={{ marginTop:"0.55rem", width:"100%", padding:"0.5rem", background:"rgba(0,255,136,0.07)", border:`1px solid ${loading?"#0a3a20":"#00ff88"}`, color:loading?"#2a5a40":"#00ff88", fontFamily:"monospace", fontSize:"0.68rem", letterSpacing:"0.18em", cursor:loading?"not-allowed":"pointer", borderRadius:2, transition:"all 0.2s" }}>
              {loading?"◌  PROCESSING...":"▶  INITIATE ANALYSIS"}
            </button>
            {loading && <div style={{ marginTop:"0.65rem" }}><ProgressBar pct={progress}/></div>}
            {!loading && !apiKey.trim() && (
              <div style={{ marginTop:"0.45rem", fontSize:"0.56rem", color:"#5a3010", textAlign:"center" }}>⚠ API key required above</div>
            )}
          </SidePanel>

          {report && (
            <SidePanel label="EXPORT.PDF" color="#00ccff">
              <div style={{ fontSize:"0.56rem", color:"#1a5a50", marginBottom:"0.45rem" }}>DARK TERMINAL THEME · CHARTS INCLUDED</div>
              <button className="pdf-btn" onClick={handleExportPDF} disabled={exporting}
                style={{ width:"100%", padding:"0.5rem", background:"rgba(0,204,255,0.06)", border:"1px solid #00ccff44", color:exporting?"#1a5a6a":"#00a8cc", fontFamily:"monospace", fontSize:"0.65rem", letterSpacing:"0.16em", cursor:exporting?"not-allowed":"pointer", borderRadius:2, transition:"all 0.2s", animation:!exporting?"pulse 3s ease-in-out infinite":"none" }}>
                {exporting?"◌  GENERATING PDF...":"⬇  EXPORT TO PDF"}
              </button>
            </SidePanel>
          )}

          <SidePanel label="MISSION.LOG" color="#ffaa00">
            <div ref={logRef} style={{ height:150, overflowY:"auto", fontSize:"0.6rem", lineHeight:"1.85" }}>
              {log.map((l,i)=>(
                <div key={i} style={{ color:i===log.length-1?"#00ff88":"#1e4a30" }}>
                  {i===log.length-1&&<span style={{ animation:"cursor 1s infinite" }}>█ </span>}{l}
                </div>
              ))}
            </div>
          </SidePanel>

          <SidePanel label="FRAMEWORKS" color="#aa44ff">
            {frameworks.map(f=>(
              <div key={f} style={{ display:"flex", alignItems:"center", gap:"0.45rem", fontSize:"0.6rem", color:"#2a4a38", marginBottom:"0.28rem" }}>
                <div style={{ width:6, height:6, borderRadius:"50%", background:report?"#00ff88":"#0a2a18", boxShadow:report?"0 0 5px #00ff88":"none", flexShrink:0, transition:"all 0.4s" }}/>
                {f}
              </div>
            ))}
          </SidePanel>
        </div>

        {/* Main Panel */}
        <div style={{ flex:1, overflowY:"auto", padding:"1.5rem 2rem" }}>
          <div style={{ borderBottom:"1px solid #0a2318", paddingBottom:"1rem", marginBottom:"1.5rem", display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
            <div>
              <div style={{ fontSize:"0.58rem", color:"#1a5a30", letterSpacing:"0.22em", marginBottom:"0.25rem" }}>MISSION CONTROL / EQUITY RESEARCH DIVISION</div>
              <div style={{ fontSize:"1.35rem", fontWeight:700, letterSpacing:"0.07em", color:"#00ff88" }}><GlitchText text="FINANCIAL ANALYSIS SYSTEM"/></div>
              <div style={{ fontSize:"0.6rem", color:"#0f3a1a", letterSpacing:"0.16em", marginTop:"0.2rem" }}>IB-GRADE · REVERSE DCF ENGINE · LIVE DATA · DEAL RADAR · PDF EXPORT</div>
            </div>
            <div style={{ textAlign:"right", fontSize:"0.58rem", color:"#1a3a28", lineHeight:"1.9" }}>
              <div>CLASSIFICATION: INTERNAL</div><div>CLEARANCE: ANALYST-1</div>
              <div style={{ color:"#00ff44", display:"flex", alignItems:"center", justifyContent:"flex-end" }}>UPLINK: <StatusDot on={true}/>LIVE</div>
            </div>
          </div>

          {error && (
            <div style={{ border:"1px solid #ff333344", background:"rgba(255,50,50,0.05)", padding:"0.65rem 0.9rem", fontSize:"0.72rem", color:"#ff6666", marginBottom:"1rem" }}>
              ⚠ TRANSMISSION ERROR — {error}
              {(error.includes("401") || error.includes("403") || error.includes("API key")) && (
                <div style={{ marginTop:"0.4rem", fontSize:"0.62rem", color:"#cc4444" }}>→ Check your API key in the API.KEY panel on the left.</div>
              )}
            </div>
          )}

          {!report && !loading && (
            <div style={{ textAlign:"center", marginTop:"6rem", opacity:0.35, animation:"fadeIn 0.5s ease" }}>
              <div style={{ fontSize:"3.5rem", marginBottom:"0.75rem", color:"#00ff88" }}>◎</div>
              <div style={{ fontSize:"0.68rem", letterSpacing:"0.28em", color:"#2a6a40" }}>AWAITING TARGET DESIGNATION</div>
              <div style={{ fontSize:"0.58rem", color:"#1a4a2a", marginTop:"0.4rem", letterSpacing:"0.12em" }}>ENTER COMPANY NAME IN LEFT PANEL → PRESS ENTER OR INITIATE ANALYSIS</div>
              <div style={{ marginTop:"2rem", display:"flex", justifyContent:"center", gap:"0.5rem", flexWrap:"wrap" }}>
                {["AAPL","TSLA","NVDA","MSFT","AMZN","META"].map(t=>(
                  <button key={t} onClick={()=>{setCompany(t);setTimeout(analyze,100);}}
                    style={{ background:"rgba(0,255,136,0.05)", border:"1px solid #0a3a20", color:"#2a6a40", fontFamily:"monospace", fontSize:"0.65rem", padding:"0.3rem 0.65rem", cursor:"pointer", borderRadius:2, letterSpacing:"0.1em", transition:"all 0.2s" }}
                    onMouseEnter={e=>{e.target.style.color="#00ff88";e.target.style.borderColor="#00ff88";}}
                    onMouseLeave={e=>{e.target.style.color="#2a6a40";e.target.style.borderColor="#0a3a20";}}>{t}</button>
                ))}
              </div>
            </div>
          )}

          {loading && !report && (
            <div style={{ textAlign:"center", marginTop:"4rem", animation:"fadeIn 0.3s ease" }}>
              <div style={{ fontSize:"0.68rem", color:"#00ff88", letterSpacing:"0.22em", marginBottom:"2rem" }}>ANALYZING: <GlitchText text={company.toUpperCase()}/></div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:"0.4rem", maxWidth:360, margin:"0 auto" }}>
                {Array.from({length:16}).map((_,i)=>(
                  <div key={i} style={{ height:3, borderRadius:1, background:(i/16)*100<=progress?"#00ff88":"#0a2818", boxShadow:(i/16)*100<=progress?"0 0 6px #00ff88":"none", transition:"all 0.3s" }}/>
                ))}
              </div>
              <div style={{ marginTop:"1.5rem", fontSize:"0.62rem", color:"#1a5a30", letterSpacing:"0.12em" }}>ALL SYSTEMS ENGAGED · STAND BY</div>
            </div>
          )}

          {report && (
            <div ref={reportRef} style={{ animation:"fadeIn 0.5s ease" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"0.55rem 0.9rem", background:"rgba(0,255,136,0.04)", border:"1px solid #0a3a20", marginBottom:"1.5rem", borderRadius:2 }}>
                <div style={{ fontSize:"0.68rem", letterSpacing:"0.14em", display:"flex", alignItems:"center" }}>
                  <StatusDot on={true}/>REPORT LOCKED — <span style={{ color:"#00ffcc", marginLeft:6 }}>{company.toUpperCase()}</span>
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:"1rem" }}>
                  <span style={{ fontSize:"0.58rem", color:"#2a6a40" }}>{new Date().toLocaleString()} · NOT INVESTMENT ADVICE</span>
                  <button className="pdf-btn" onClick={handleExportPDF} disabled={exporting}
                    style={{ padding:"0.3rem 0.75rem", background:"rgba(0,204,255,0.06)", border:"1px solid #00ccff44", color:"#00a8cc", fontFamily:"monospace", fontSize:"0.6rem", letterSpacing:"0.14em", cursor:exporting?"not-allowed":"pointer", borderRadius:2, transition:"all 0.2s" }}>
                    {exporting?"◌ GENERATING...":"⬇ EXPORT PDF"}
                  </button>
                </div>
              </div>
              <div style={{ lineHeight:"1.8" }}><ReportRenderer text={report}/></div>
              <div style={{ marginTop:"2.5rem", padding:"0.65rem 0.9rem", border:"1px solid #0a2318", background:"rgba(255,160,0,0.025)", fontSize:"0.6rem", color:"#2a5030", lineHeight:"1.65" }}>
                ⚠ DISCLAIMER: AI-generated analysis for informational purposes only. Not investment advice. Past performance does not guarantee future results. Always conduct independent due diligence before making investment decisions.
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div style={{ background:"#010a05", borderTop:"1px solid #0a2318", padding:"0.35rem 1.5rem", display:"flex", justifyContent:"space-between", fontSize:"0.55rem", color:"#0f3a1a", letterSpacing:"0.1em", flexShrink:0 }}>
        <span>EIC-MCS v5.0.0 · WALL STREET DIVISION · API KEY AUTH · PDF EXPORT ENGINE ACTIVE</span>
        <span>◈ ALL SYSTEMS NOMINAL</span>
        <span>CLASSIFIED: ANALYST EYES ONLY</span>
      </div>
    </div>
  );
}
