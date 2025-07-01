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
          <div class="personal-info-avatar">
            <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(fullName || username)}&background=ede9fe&color=7c3aed&size=128" alt="Avatar" />
          </div>
          <h3><span>Personal Information</span></h3>
          <div class="personal-info-list">
            <div class="personal-info-row"><span>Full Name:</span> <span>${fullName || '-'}</span></div>
            <div class="personal-info-row"><span>Username:</span> <span>${username}</span></div>
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
        <div class="fancy-card" style="flex:0 0 300px;">
          <h3>Audit Ratio</h3>
          <div class="data-list" id="audit-ratio-box">
            <div class="audit-ratio-display">
              <div class="ratio-value" id="audit-ratio-value">Loading...</div>
              <div class="ratio-label">Completed per Received</div>
            </div>
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

  fetchAuditStats()
    .then(drawAuditGraph)
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

export { showLoginForm, showProfile, showError };
