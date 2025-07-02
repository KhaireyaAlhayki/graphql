import { drawXPLineGraph } from "./xpGraphs.js";
import { drawAuditGraph } from "./auditGraph.js";
import { fetchAuditStats, fetchRecentAudits, fetchAuditRatio } from "./graphql.js";
import { drawSkillsGraph } from "./skillsGraph.js";

function showLoginForm() {
  document.getElementById("app").innerHTML = `
    <div class="fancy-login-bg">
      <div class="login-container glass-card">
        <div class="login-logo">
          <img src="https://avatars.githubusercontent.com/u/9919?s=200&v=4" alt="Logo" />
        </div>
        <h2 class="login-title">Sign in to Your Account</h2>
        <form id="login-form" autocomplete="on">
          <div class="login-fields">
            <input type="text" id="username" class="input-field" placeholder="Username or Email" autocomplete="username" required />
            <input type="password" id="password" class="input-field" placeholder="Password" autocomplete="current-password" required />
          </div>
          <button type="submit" class="login-btn">Sign In</button>
        </form>
        <div id="error-message" class="error-message" style="display:none;"></div>
      </div>
    </div>
  `;

  document.getElementById('login-form').onsubmit = function(e) {
    e.preventDefault();
    handleLogin();
  };
}

function renderAuditList(audits) {
  if (!audits.length) return `<div class="empty">No recent audits.</div>`;
  return audits.map(a => {
    const project = a.group?.object?.name ?? "Unknown";
    const passed = Number(a.grade) >= 1;
    const gradeBadge = passed
      ? `<span class="pass">PASS</span>`
      : `<span class="fail">FAIL</span>`;
    return `
      <div class="data-row">
        <span><strong>${project}</strong></span>
        <span>${new Date(a.createdAt).toLocaleDateString("en-US")}</span>
        ${gradeBadge}
      </div>`;
  }).join("");
}

function setupShowMoreHandlers() {
  document.querySelectorAll(".show-more-indicator").forEach(el => {
    el.addEventListener("click", () => {
      const listContainer = el.previousElementSibling;
      if (listContainer && listContainer.classList.contains("personal-info-list")) {
        listContainer.style.maxHeight = "none";
        listContainer.style.overflow = "visible";
        el.remove();
      }
    });
  });
}

// Utility to add download buttons to SVG graphs
function addSVGDownloadButtons(containerSelector, svgSelector, filenameBase) {
  const container = document.querySelector(containerSelector);
  if (!container) return;
  // Remove any existing download bar
  const oldBar = container.querySelector('.svg-download-bar');
  if (oldBar) oldBar.remove();

  const bar = document.createElement('div');
  bar.className = 'svg-download-bar';
  bar.style.display = 'flex';
  bar.style.justifyContent = 'flex-end';
  bar.style.gap = '10px';
  bar.style.marginBottom = '8px';
  bar.style.position = 'relative';

  // Fancy download icon button
  const iconBtn = document.createElement('button');
  iconBtn.className = 'svg-download-icon-btn';
  iconBtn.style.background = 'linear-gradient(135deg, #b57fa6 0%, #8e4585 100%)';
  iconBtn.style.border = 'none';
  iconBtn.style.cursor = 'pointer';
  iconBtn.style.padding = '0';
  iconBtn.style.display = 'flex';
  iconBtn.style.alignItems = 'center';
  iconBtn.style.justifyContent = 'center';
  iconBtn.style.borderRadius = '50%';
  iconBtn.style.boxShadow = '0 2px 8px rgba(142,69,133,0.13)';
  iconBtn.style.transition = 'background 0.18s, box-shadow 0.18s, transform 0.1s';
  iconBtn.onmouseover = () => {
    iconBtn.style.background = 'linear-gradient(135deg, #8e4585 0%, #b57fa6 100%)';
    iconBtn.style.transform = 'translateY(-1px) scale(1.08)';
    iconBtn.style.boxShadow = '0 4px 16px rgba(142,69,133,0.18)';
  };
  iconBtn.onmouseout = () => {
    iconBtn.style.background = 'linear-gradient(135deg, #b57fa6 0%, #8e4585 100%)';
    iconBtn.style.transform = 'none';
    iconBtn.style.boxShadow = '0 2px 8px rgba(142,69,133,0.13)';
  };
  iconBtn.innerHTML = `
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="11" fill="#f6e3ea" stroke="#8e4585" stroke-width="1.5"/>
      <path d="M12 7v6m0 0l-3-3m3 3l3-3" stroke="#8e4585" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <rect x="7" y="16" width="10" height="2" rx="1" fill="#b57fa6"/>
    </svg>
  `;

  // Dropdown menu
  const dropdown = document.createElement('div');
  dropdown.className = 'svg-download-dropdown';
  dropdown.style.display = 'none';
  dropdown.style.position = 'absolute';
  dropdown.style.top = '44px';
  dropdown.style.right = '0';
  dropdown.style.background = '#fff';
  dropdown.style.border = '1.5px solid #a78bfa';
  dropdown.style.borderRadius = '10px';
  dropdown.style.boxShadow = '0 8px 32px rgba(139,92,246,0.13)';
  dropdown.style.zIndex = '100';
  dropdown.style.minWidth = '160px';
  dropdown.style.padding = '8px 0';

  const options = [
    { label: 'Download as PNG', fn: () => downloadRaster(containerSelector, filenameBase + '.png', 'image/png') },
    { label: 'Download as JPEG', fn: () => downloadRaster(containerSelector, filenameBase + '.jpeg', 'image/jpeg') },
    { label: 'Download as SVG', fn: () => downloadSVG(containerSelector, filenameBase + '.svg') },
  ];
  options.forEach(opt => {
    const item = document.createElement('div');
    item.textContent = opt.label;
    item.style.padding = '12px 22px';
    item.style.cursor = 'pointer';
    item.style.fontSize = '15px';
    item.style.color = '#4c1d95';
    item.style.transition = 'background 0.18s, color 0.18s';
    item.style.fontWeight = '600';
    item.onmouseover = () => {
      item.style.background = '#f6f5ff';
      item.style.color = '#7c3aed';
    };
    item.onmouseout = () => {
      item.style.background = 'transparent';
      item.style.color = '#4c1d95';
    };
    item.onclick = () => {
      dropdown.style.display = 'none';
      opt.fn();
    };
    dropdown.appendChild(item);
  });

  // Toggle dropdown on icon click
  iconBtn.onclick = (e) => {
    e.stopPropagation();
    dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
  };
  // Hide dropdown when clicking outside
  document.addEventListener('click', (e) => {
    if (!bar.contains(e.target)) {
      dropdown.style.display = 'none';
    }
  });

  bar.appendChild(iconBtn);
  bar.appendChild(dropdown);

  // Insert the download bar before the SVG, not as a child of the container
  const svg = container.querySelector(svgSelector);
  if (svg && svg.parentNode) {
    svg.parentNode.insertBefore(bar, svg);
  } else {
    container.prepend(bar);
  }
}

function downloadSVG(containerSelector, filename) {
  const container = document.querySelector(containerSelector);
  if (!container) return;
  const svgs = container.querySelectorAll('svg');
  const svg = svgs[svgs.length - 1]; // always get the last SVG (the graph)
  if (!svg) return;
  const serializer = new XMLSerializer();
  let source = serializer.serializeToString(svg);
  // Add XML declaration
  if (!source.match(/^<\?xml/)) {
    source = '<?xml version="1.0" standalone="no"?>\r\n' + source;
  }
  const url = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(source);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

function downloadRaster(containerSelector, filename, mimeType) {
  const container = document.querySelector(containerSelector);
  if (!container) return;
  const svgs = container.querySelectorAll('svg');
  const svg = svgs[svgs.length - 1]; // always get the last SVG (the graph)
  if (!svg) return;
  const serializer = new XMLSerializer();
  const source = serializer.serializeToString(svg);
  const img = new window.Image();
  const svgBlob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);
  img.onload = function () {
    const canvas = document.createElement('canvas');
    canvas.width = svg.width.baseVal.value || 900;
    canvas.height = svg.height.baseVal.value || 500;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);
    URL.revokeObjectURL(url);
    canvas.toBlob(function(blob) {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }, mimeType);
  };
  img.src = url;
}

function showProfile(user) {
  const attrs = user.attrs || {};
  const fullName = `${attrs.firstName || ''} ${attrs.lastName || ''}`.trim();
  const username = user.login || user.username || '-';
  const email = user.email || attrs.email || '-';
  const phone = attrs.PhoneNumber || '-';
  const dob = attrs.dateOfBirth
    ? new Date(attrs.dateOfBirth).toISOString().split('T')[0]
    : '-';
  const country = attrs.country || attrs.addressCountry || '-';

  const getProjectName = (path) => {
    if (!path || !path.startsWith("/bahrain/bh-module/")) return null;
    if (path === "/bahrain/bh-module/piscine-js") return "piscine-js";
    if (path.includes("piscine-js")) return null;
    const match = path.match(/^\/bahrain\/bh-module\/([^\/]+)/);
    return match ? match[1] : null;
  };

  const sortedTx = [...user.recentTransactions].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  const labelOrder = [];
  const xpByProject = {};
  sortedTx.forEach(tx => {
    if (!tx.path || !tx.amount) return;
    const label = getProjectName(tx.path);
    if (!label) return;
    if (label.toLowerCase().includes('checkpoint')) return;
    if (!xpByProject[label]) {
      xpByProject[label] = 0;
      labelOrder.push(label);
    }
    xpByProject[label] += tx.amount;
  });

  let cumulativeXP = 0;
  const cumulativeXPByProject = {};
  labelOrder.forEach(label => {
    cumulativeXP += xpByProject[label];
    cumulativeXPByProject[label] = cumulativeXP;
  });

  document.getElementById("app").innerHTML = `
    <div class="profile-container">
      <div class="profile-header">
        <h2>Hello, ${username}!</h2>
        <button class="logout-btn" id="logout-btn">Logout</button>
      </div>
      <div class="profile-data">
        <div class="personal-info-card fancy-card">
          <h3><span>Personal Information</span></h3>
          <div class="personal-info-list" style="display: grid; grid-template-columns: 1fr 1fr; gap: 18px 32px;">
            <div class="personal-info-row"><span>Username:</span> <span>${username}</span></div>
            <div class="personal-info-row"><span>Full Name:</span> <span>${fullName || '-'}</span></div>
            <div class="personal-info-row"><span>Email:</span> <span>${email}</span></div>
            <div class="personal-info-row"><span>Phone Number:</span> <span>${phone}</span></div>
            <div class="personal-info-row"><span>Date of Birth:</span> <span>${dob}</span></div>
            <div class="personal-info-row"><span>Country:</span> <span>${country}</span></div>
          </div>
        </div>
        <div class="personal-info-row-group" style="display: flex; gap: 1.5rem; width: 100%; justify-content: center; align-items: stretch; margin-bottom: 1.5rem;">
          <div class="personal-info-card fancy-card" style="flex: 1 1 0; min-width: 0;">
            <h3><span>Recent Grades</span></h3>
            <div class="personal-info-list" id="recent-grades">
              ${(() => {
                const filteredGrades = user.recentProgress
                  .filter(p => p.grade !== null)
                  .map(p => {
                    const label = getProjectName(p.path);
                    if (!label || label === "piscine-js" || label.toLowerCase().includes("checkpoint")) return null;
                    return { label, grade: p.grade, createdAt: p.createdAt };
                  })
                  .filter(Boolean);

                const displayGrades = filteredGrades.slice(0, 5);

                const gradeRows = displayGrades.map(p => `
                  <div class="personal-info-row">
                    <span>${p.label}</span>
                    <span>${new Date(p.createdAt).toLocaleDateString()}</span>
                    <span class="${Number(p.grade) >= 1 ? 'pass' : 'fail'}">${Number(p.grade) >= 1 ? 'PASS' : 'FAIL'}</span>
                  </div>
                `).join('');

                return gradeRows || `<div class="empty">No graded submissions.</div>`;
              })()}
            </div>
          </div>
          <div class="personal-info-card fancy-card" style="flex: 1 1 0; min-width: 0;">
            <h3><span>Recent Audits Done</span></h3>
            <div class="personal-info-list" id="recent-audits"></div>
          </div>
        </div>
        <div class="data-cards-row">
          <div class="audit-card-container fancy-card audit-ratio-card" id="audit-ratio-card">
            <h3 class="audit-ratio-title">Audit Ratio</h3>
            <div class="audit-ratio-display">
              <div class="ratio-value" id="audit-ratio-value">Loading...</div>
              <div class="ratio-label">Completed per Received</div>
            </div>
          </div>
          <div class="graph-container" id="skills-graph-card">
            <h3 class="graph-title">Skills</h3>
            <div id="skills-graph"></div>
          </div>
        </div>
        <div class="graph-container" id="audit-graph-card">
          <h3 class="graph-title">Audit Points</h3>
          <div id="audit-graph"></div>
        </div>
        <div class="graph-container" id="xp-graph-card">
          <h3 class="graph-title">Cumulative XP Graph</h3>
          <div id="stats-graph"></div>
        </div>
      </div>
    </div>
  `;

  drawXPLineGraph(user.recentTransactions, "#stats-graph");
  addSVGDownloadButtons('#stats-graph', '#stats-graph svg', 'cumulative-xp-graph');

  fetchAuditStats()
    .then(data => {
      drawAuditGraph(data);
      addSVGDownloadButtons('#audit-graph', '#audit-graph svg', 'audit-points-graph');
    })
    .catch(err => console.error("❌ Failed to load audit data:", err));

  fetchRecentAudits(user.id)
    .then(audits => {
      const displayAudits = audits.slice(0, 5);
      document.getElementById("recent-audits").innerHTML = displayAudits.map(a => {
        const project = a.group?.object?.name ?? "Unknown";
        const passed = Number(a.grade) >= 1;
        const gradeBadge = passed ? `<span class='pass'>PASS</span>` : `<span class='fail'>FAIL</span>`;
        return `<div class='personal-info-row'><span>${project}</span><span>${new Date(a.createdAt).toLocaleDateString()}</span>${gradeBadge}</div>`;
      }).join("") || `<div class='empty'>No recent audits.</div>`;
    })
    .catch(err => console.error("Failed to load recent audits:", err));

  fetchAuditRatio(user.id)
    .then(ratio => {
      document.getElementById("audit-ratio-value").textContent = ratio;
    })
    .catch(err => {
      console.error("Failed to fetch audit ratio:", err);
      document.getElementById("audit-ratio-value").textContent = "N/A";
    });

  drawSkillsGraph();

  setTimeout(() => {
    const logoutBtn = document.getElementById("logout-btn");
    if (logoutBtn) {
      logoutBtn.onclick = () => (window.logout ? window.logout() : logout());
    }

    // Dynamic height matching for audit ratio card
    function matchAuditRatioHeight() {
      const auditCard = document.getElementById("audit-ratio-card");
      const skillsCard = document.getElementById("skills-graph-card");
      if (auditCard && skillsCard) {
        auditCard.style.height = skillsCard.offsetHeight + "px";
      }
    }
    matchAuditRatioHeight();
    window.addEventListener("resize", matchAuditRatioHeight);

    // Use ResizeObserver for robust sync
    const skillsCard = document.getElementById("skills-graph-card");
    if (skillsCard && window.ResizeObserver) {
      const observer = new ResizeObserver(() => {
        matchAuditRatioHeight();
      });
      observer.observe(skillsCard);
    }
  }, 0);
}

function showError(message) {
  let errorDiv = document.getElementById("error-message");
  if (!errorDiv) {
    errorDiv = document.createElement("div");
    errorDiv.id = "error-message";
    errorDiv.className = "error-message";
    const appDiv = document.getElementById("app");
    if (appDiv) {
      appDiv.parentNode.insertBefore(errorDiv, appDiv);
    } else {
      document.body.insertBefore(errorDiv, document.body.firstChild);
    }
  }
  errorDiv.textContent = message;
  errorDiv.style.display = message ? "block" : "none";
}

window.addSVGDownloadButtons = addSVGDownloadButtons;

export { showLoginForm, showProfile, showError };
