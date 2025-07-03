import { formatNumberShort } from "./graphql.js";

export function drawXPLineGraph(transactions, containerId) {
  const container = document.querySelector(containerId);
  if (!container || !transactions?.length) return;

  const getProjectName = (path) => {
    if (!path?.startsWith("/bahrain/bh-module/")) return null;
    if (path === "/bahrain/bh-module/piscine-js") return "piscine-js";
    if (path.includes("piscine-js")) return null;
    if (path === "/bahrain/bh-module/piscine-rust") return "piscine-rust";
    // Exclude piscine-rust subpaths
    if (path.includes("piscine-rust")) return null;
    
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

  const width = container.clientWidth;   
  const height = 500;
  const padding = 150;

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
    background: "linear-gradient(135deg, rgba(253,247,250,0.92) 60%, rgba(246,227,234,0.85) 100%)", // glassy gradient
    color: "#8a2437", // maroon text
    padding: "14px 22px",
    borderRadius: "18px",
    fontSize: "16px",
    fontWeight: "600",
    boxShadow: "0 8px 32px 0 rgba(162,58,77,0.13), 0 1.5px 8px rgba(162,58,77,0.08)", // maroon shadow
    border: "2.5px solid #a23a4d", // dark pinkish maroon
    opacity: 0,
    pointerEvents: "none",
    zIndex: 1000,
    transition: "opacity 0.25s cubic-bezier(.4,0,.2,1), transform 0.25s cubic-bezier(.4,0,.2,1), box-shadow 0.18s, border-color 0.18s",
    transform: "scale(0.95)",
    backdropFilter: "blur(8px)",
    WebkitBackdropFilter: "blur(8px)",
  });
  document.body.appendChild(tooltip);

  const showTooltip = (x, y, text) => {
    tooltip.textContent = text;
    tooltip.style.left = `${x + 10}px`;
    tooltip.style.top = `${y - 40}px`;
    tooltip.style.opacity = 1;
    tooltip.style.transform = "scale(1)";
  };
  const hideTooltip = () => {
    tooltip.style.opacity = 0;
    tooltip.style.transform = "scale(0.95)";
  };

  // Add hover effect for border glow
  tooltip.addEventListener('mouseenter', () => {
    tooltip.style.boxShadow = '0 8px 32px 0 rgba(162,58,77,0.18), 0 1.5px 8px rgba(162,58,77,0.13)';
    tooltip.style.borderColor = '#d72660';
  });
  tooltip.addEventListener('mouseleave', () => {
    tooltip.style.boxShadow = '0 8px 32px 0 rgba(162,58,77,0.13), 0 1.5px 8px rgba(162,58,77,0.08)';
    tooltip.style.borderColor = '#a23a4d';
  });

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
    label.setAttribute("font-size", "14");
    label.setAttribute("font-weight", "700");
    label.setAttribute("fill", "#5C4033"); // dark brown
    label.textContent = formatNumberShort(value);
    svg.appendChild(label);
  }

  // X-axis labels
  points.forEach((p, i) => {
    const x = padding + i * stepX;
    const label = document.createElementNS(svgNS, "text");
    label.setAttribute("x", x);
    label.setAttribute("y", height - padding + 40);
    label.setAttribute("text-anchor", "end");
    label.setAttribute("font-size", "14");
    label.setAttribute("font-weight", "700");
    label.setAttribute("transform", `rotate(-40 ${x},${height - padding + 40})`);
    label.setAttribute("fill", "#5C4033"); // dark brown
    label.textContent = p.label;
    svg.appendChild(label);
  });

  // Area fill under the line (near-white)
  const areaPath = points.map((p, i) => {
    const x = padding + i * stepX;
    const y = height - padding - (p.xp - niceMin) * stepY;
    return `${i === 0 ? "M" : "L"}${x},${y}`;
  }).join(" ") +
    ` L${padding + (points.length - 1) * stepX},${height - padding}` +
    ` L${padding},${height - padding} Z`;
  const area = document.createElementNS(svgNS, "path");
  area.setAttribute("d", areaPath);
  area.setAttribute("fill", "#f6f5ff"); // near-white
  area.setAttribute("stroke", "none");
  svg.appendChild(area);

  // Line path (purple border)
  const pathData = points.map((p, i) => {
    const x = padding + i * stepX;
    const y = height - padding - (p.xp - niceMin) * stepY;
    return `${i === 0 ? "M" : "L"}${x},${y}`;
  }).join(" ");

  const path = document.createElementNS(svgNS, "path");
  path.setAttribute("d", pathData);
  path.setAttribute("fill", "none");
  path.setAttribute("stroke", "#a23a4d"); // purple-500
  path.setAttribute("stroke-width", "2.5");
  svg.appendChild(path);

  // Points (purple border)
  points.forEach((p, i) => {
    const x = padding + i * stepX;
    const y = height - padding - (p.xp - niceMin) * stepY;

    const dot = document.createElementNS(svgNS, "circle");
    dot.setAttribute("cx", x);
    dot.setAttribute("cy", y);
    dot.setAttribute("r", "4");
    dot.setAttribute("fill", "#fff"); // white center
    dot.setAttribute("stroke", "#a23a4d"); // purple border
    dot.setAttribute("stroke-width", "2");
    dot.style.cursor = "pointer";

    dot.addEventListener("mouseover", e =>
      showTooltip(e.pageX, e.pageY, `${p.label}: ${p.xp.toLocaleString()} XP`)
    );
    dot.addEventListener("mouseout", hideTooltip);

    svg.appendChild(dot);
  });

  // Add title
  const title = document.createElementNS(svgNS, "text");
  title.setAttribute("x", width / 2);
  title.setAttribute("y", 38);
  title.setAttribute("text-anchor", "middle");
  title.setAttribute("font-size", "22");
  title.setAttribute("font-weight", "bold");
  title.setAttribute("fill", "#8B4513"); // saddle brown
  title.textContent = "Your XP journey across projects";
  svg.appendChild(title);

  container.innerHTML = "";
  container.appendChild(svg);
}
