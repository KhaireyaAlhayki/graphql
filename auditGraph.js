// auditGraph.js

export function drawAuditGraph(data) {
  const container = document.querySelector("#audit-graph");
  container.innerHTML = "";

  const svgNS = "http://www.w3.org/2000/svg";
  const width = 600;
  const height = 240;
  const barHeight = 30;
  const margin = { top: 60, right: 40, bottom: 30, left: 120 };

  const svg = document.createElementNS(svgNS, "svg");
  svg.setAttribute("width", "100%");
  svg.setAttribute("height", height);
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.style.background = "#fafafa";
  svg.style.border = "1px solid #ddd";
  svg.style.borderRadius = "12px";
  svg.style.boxShadow = "0 6px 20px rgba(0,0,0,0.05)";
  svg.style.padding = "10px";

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
  title.setAttribute("y", 35);
  title.setAttribute("text-anchor", "middle");
  title.setAttribute("font-size", "20");
  title.setAttribute("font-weight", "bold");
  title.setAttribute("fill", "#222");
  title.textContent = "Audit Ratio";
  svg.appendChild(title);

  const drawBar = (y, label, value, color) => {
    const barWidth = scaleX(value);

    const rect = document.createElementNS(svgNS, "rect");
    rect.setAttribute("x", margin.left);
    rect.setAttribute("y", y);
    rect.setAttribute("width", barWidth);
    rect.setAttribute("height", barHeight);
    rect.setAttribute("fill", color);
    rect.setAttribute("rx", 8);
    svg.appendChild(rect);

    const labelText = document.createElementNS(svgNS, "text");
    labelText.setAttribute("x", margin.left - 15);
    labelText.setAttribute("y", y + barHeight / 2);
    labelText.setAttribute("text-anchor", "end");
    labelText.setAttribute("dominant-baseline", "middle");
    labelText.setAttribute("font-size", "14");
    labelText.setAttribute("fill", "#444");
    labelText.textContent = label;
    svg.appendChild(labelText);

    const valueText = document.createElementNS(svgNS, "text");
    valueText.setAttribute("x", margin.left + barWidth + 10);
    valueText.setAttribute("y", y + barHeight / 2);
    valueText.setAttribute("dominant-baseline", "middle");
    valueText.setAttribute("font-size", "13");
    valueText.setAttribute("fill", "#333");
    valueText.textContent = `${value.toLocaleString()} XP`;
    svg.appendChild(valueText);
  };

  drawBar(margin.top, "Audits Done", up, "#a855f7");
  drawBar(margin.top + barHeight + 30, "Audits Received", down, "#6366f1");

  container.appendChild(svg);
}
