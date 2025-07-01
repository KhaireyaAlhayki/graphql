export function drawXPLineGraph(transactions, containerId) {
  const container = document.querySelector(containerId);
  if (!container || !transactions?.length) return;

  const getProjectName = (path) => {
    if (!path?.startsWith("/bahrain/bh-module/")) return null;
    if (path === "/bahrain/bh-module/piscine-js") return "piscine-js";
    if (path.includes("piscine-js")) return null;
    const match = path.match(/^\/bahrain\/bh-module\/([^\/]+)/);
    return match ? match[1] : null;
  };

  const sortedTx = [...transactions].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  const labelOrder = [];
  const xpByProject = {};
  sortedTx.forEach(tx => {
    if (!tx.path || !tx.amount) return;
    const label = getProjectName(tx.path);
    if (!label || label.toLowerCase().includes("checkpoint")) return;
    if (!xpByProject[label]) {
      xpByProject[label] = 0;
      labelOrder.push(label);
    }
    xpByProject[label] += tx.amount;
  });

  let cumulativeXP = 0;
  const points = labelOrder.map(label => {
    cumulativeXP += xpByProject[label];
    return { label, xp: cumulativeXP };
  });

  const width = container.clientWidth;   // Match container's actual width
  const height = 420;
  const padding = 110;

  const xps = points.map(p => p.xp);
  const maxXP = Math.max(...xps);
  const minXP = Math.min(...xps);
  const yTicks = 5;

  const roundedMin = Math.floor(minXP / 100000) * 100000;
  const roundedMax = Math.ceil(maxXP / 100000) * 100000;
  const step = Math.ceil((roundedMax - roundedMin) / yTicks / 10000) * 10000;
  const niceMin = roundedMin;
  const niceMax = niceMin + step * yTicks;

  const stepY = (height - 2 * padding) / (niceMax - niceMin);
  const stepX = (width - 2 * padding) / (points.length - 1 || 1);

  const svgNS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNS, "svg");
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.setAttribute("width", "100%");
  svg.setAttribute("height", height);
  svg.style.borderRadius = "10px";
  svg.style.boxShadow = "0 4px 10px rgba(0,0,0,0.06)";
  svg.style.background = "#fff";

  const tooltip = document.createElement("div");
  Object.assign(tooltip.style, {
    position: "absolute",
    background: "#1f1f1f",
    color: "#fff",
    padding: "6px 10px",
    borderRadius: "4px",
    fontSize: "12px",
    pointerEvents: "none",
    opacity: 0,
    transition: "opacity 0.2s ease",
    zIndex: 1000
  });
  document.body.appendChild(tooltip);

  const showTooltip = (x, y, text) => {
    tooltip.textContent = text;
    tooltip.style.left = `${x + 10}px`;
    tooltip.style.top = `${y - 30}px`;
    tooltip.style.opacity = 1;
  };
  const hideTooltip = () => {
    tooltip.style.opacity = 0;
  };

  // Y-axis grid + labels
  for (let i = 0; i <= yTicks; i++) {
    const value = niceMax - i * step;
    const y = padding + i * ((height - 2 * padding) / yTicks);

    const line = document.createElementNS(svgNS, "line");
    line.setAttribute("x1", padding);
    line.setAttribute("y1", y);
    line.setAttribute("x2", width - padding);
    line.setAttribute("y2", y);
    line.setAttribute("stroke", "#eee");
    svg.appendChild(line);

    const label = document.createElementNS(svgNS, "text");
    label.setAttribute("x", padding - 15);
    label.setAttribute("y", y + 4);
    label.setAttribute("text-anchor", "end");
    label.setAttribute("font-size", "11");
    label.setAttribute("fill", "#444");
    label.textContent = value >= 1000 ? `${value / 1000}k` : value;
    svg.appendChild(label);
  }

  // X-axis labels
  points.forEach((p, i) => {
    const x = padding + i * stepX;
    const label = document.createElementNS(svgNS, "text");
    label.setAttribute("x", x);
    label.setAttribute("y", height - padding + 40);
    label.setAttribute("text-anchor", "end");
    label.setAttribute("font-size", "11");
    label.setAttribute("transform", `rotate(-40 ${x},${height - padding + 40})`);
    label.setAttribute("fill", "#333");
    label.textContent = p.label;
    svg.appendChild(label);
  });

  // Line path
  const pathData = points.map((p, i) => {
    const x = padding + i * stepX;
    const y = height - padding - (p.xp - niceMin) * stepY;
    return `${i === 0 ? "M" : "L"}${x},${y}`;
  }).join(" ");

  const path = document.createElementNS(svgNS, "path");
  path.setAttribute("d", pathData);
  path.setAttribute("fill", "none");
  path.setAttribute("stroke", "#3498db");
  path.setAttribute("stroke-width", "2.5");
  svg.appendChild(path);

  // Points
  points.forEach((p, i) => {
    const x = padding + i * stepX;
    const y = height - padding - (p.xp - niceMin) * stepY;

    const dot = document.createElementNS(svgNS, "circle");
    dot.setAttribute("cx", x);
    dot.setAttribute("cy", y);
    dot.setAttribute("r", "4");
    dot.setAttribute("fill", "#3498db");
    dot.style.cursor = "pointer";

    dot.addEventListener("mouseover", e =>
      showTooltip(e.pageX, e.pageY, `${p.label}: ${p.xp.toLocaleString()} XP`)
    );
    dot.addEventListener("mouseout", hideTooltip);

    svg.appendChild(dot);
  });

  container.innerHTML = "";
  container.appendChild(svg);
}
