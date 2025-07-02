// auditGraph.js

export function drawAuditGraph(data) {
  const container = document.querySelector("#audit-graph");
  container.innerHTML = "";

  const svgNS = "http://www.w3.org/2000/svg";
  const width = container.clientWidth || 900; // Responsive width
  const height = 270; // 15% smaller than 320 for a more compact graph
  const barHeight = 48;
  const margin = { top: 60, right: 130, bottom: 30, left: 190 };

  const svg = document.createElementNS(svgNS, "svg");
  svg.setAttribute("width", "100%");
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.style.height = "auto";
  svg.style.maxHeight = "100%";
  svg.style.background = "#fafafa";
  svg.style.borderRadius = "18px";
  svg.style.boxShadow = "0 8px 32px rgba(139,92,246,0.07)";
  svg.style.padding = "18px";

  if (!data || typeof data.up !== 'number' || typeof data.down !== 'number') {
    container.textContent = "No audit data";
    return;
  }

  const { up, down } = data;
  const max = Math.max(up, down);
  const scaleX = val => (val / max) * (width - margin.left - margin.right);

  // Title
  const title = document.createElementNS(svgNS, "text");
  title.setAttribute("x", width / 2);
  title.setAttribute("y", 48);
  title.setAttribute("text-anchor", "middle");
  title.setAttribute("font-size", "28");
  title.setAttribute("font-weight", "bold");
  title.setAttribute("fill", "#4c1d95");
  // title.textContent = "Audits Done vs Received";
  svg.appendChild(title);

  const drawBar = (y, label, value, color) => {
    const barWidth = scaleX(value);

    const rect = document.createElementNS(svgNS, "rect");
    rect.setAttribute("x", margin.left);
    rect.setAttribute("y", y);
    rect.setAttribute("width", barWidth);
    rect.setAttribute("height", barHeight);
    rect.setAttribute("fill", color);
    rect.setAttribute("rx", 14);
    svg.appendChild(rect);

    const labelText = document.createElementNS(svgNS, "text");
    labelText.setAttribute("x", margin.left - 20);
    labelText.setAttribute("y", y + barHeight / 2);
    labelText.setAttribute("text-anchor", "end");
    labelText.setAttribute("dominant-baseline", "middle");
    labelText.setAttribute("font-size", "18");
    labelText.setAttribute("fill", "#8B4513");
    labelText.setAttribute("font-weight", "700");
    labelText.textContent = label;
    svg.appendChild(labelText);

    const valueText = document.createElementNS(svgNS, "text");
    valueText.setAttribute("x", margin.left + barWidth + 18);
    valueText.setAttribute("y", y + barHeight / 2);
    valueText.setAttribute("dominant-baseline", "middle");
    valueText.setAttribute("font-size", "17");
    valueText.setAttribute("fill", "#8B4513");
    valueText.setAttribute("font-weight", "600");
    valueText.textContent = `${value.toLocaleString()} XP`;
    svg.appendChild(valueText);
  };

  drawBar(margin.top, "Audits Done", up, "url(#auditDoneGradient)");
  drawBar(margin.top + barHeight + 40, "Audits Received", down, "url(#auditReceivedGradient)");

  // Gradients
  const defs = document.createElementNS(svgNS, "defs");
  defs.innerHTML = `
    <linearGradient id="auditDoneGradient" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#b96a7a"/>
      <stop offset="100%" stop-color="#a855f7"/>
    </linearGradient>
    <linearGradient id="auditReceivedGradient" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#8a2437"/>
      <stop offset="100%" stop-color="#818cf8"/>
    </linearGradient>
  `;
  svg.appendChild(defs);

  container.appendChild(svg);

  // Add download icon after SVG is rendered (global-safe)
  if (typeof window.addSVGDownloadButtons === 'function') {
    window.addSVGDownloadButtons('#audit-graph', '#audit-graph svg', 'audit-points-graph');
  } else if (typeof addSVGDownloadButtons === 'function') {
    addSVGDownloadButtons('#audit-graph', '#audit-graph svg', 'audit-points-graph');
  }
}
