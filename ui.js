
import { drawXPLineGraph } from "./xpGraphs.js";
import { drawAuditGraph } from "./auditGraph.js";
import { fetchAuditStats } from "./graphql.js";
import { fetchRecentAudits } from "./graphql.js";
import { fetchAuditRatio } from "./graphql.js";
import { drawSkillsGraph } from './skillsGraph.js';


function showLoginForm() {
  document.getElementById("app").innerHTML = `
    <h2>Login</h2>
    <input type="text" id="username" placeholder="Username" />
    <input type="password" id="password" placeholder="Password" />
    <button onclick="handleLogin()">Login</button>
  `;
}

function renderAuditList(audits) {
  if (!audits.length) return "<div class=\"empty\">No recent audits.</div>";

  return audits
    .map(a => {
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
        </div> 
      `;
    })
    .join("");
}


function showProfile(user) {
  const attrs = user.attrs || {};
  const fullName = `${attrs.firstName || ''} ${attrs.lastName || ''}`.trim();
  const username = user.login || user.username || '-';
  const email = user.email || attrs.email || '-';
  const phone = attrs.PhoneNumber || '-';
  const dob = attrs.dateOfBirth || '-';
  const country = attrs.country || attrs.addressCountry || '-';

  const getProjectName = (path) => {
    if (!path || !path.startsWith("/bahrain/bh-module/") ) return null;
  
    if (path === "/bahrain/bh-module/piscine-js") {
      return "piscine-js";
    }

    if (path.startsWith("/bahrain/bh-module/") && path.includes("piscine-js") ) return null;
  
  
    const match = path.match(/^\/bahrain\/bh-module\/([^\/]+)/);
    return match ? match[1] : null;
  };
  

  // Sort transactions by createdAt ascending
  const sortedTx = [...user.recentTransactions].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  const labelOrder = [];
  const xpByProject = {};
  sortedTx.forEach(tx => {
    if (!tx.path || !tx.amount) return;
    const label = getProjectName(tx.path);
    if (!label) return;
    // Exclude any project with 'checkpoint' in the name (case-insensitive)
    if (label.toLowerCase().includes('checkpoint')) return;
    if (!xpByProject[label]) {
      xpByProject[label] = 0;
      labelOrder.push(label);
    }
    xpByProject[label] += tx.amount;
  });
  // Now build cumulative XP
  let cumulativeXP = 0;
  const cumulativeXPByProject = {};
  labelOrder.forEach(label => {
    cumulativeXP += xpByProject[label];
    cumulativeXPByProject[label] = cumulativeXP;
  });

  document.getElementById("app").innerHTML = `
    <div class="profile-container">
      <div class="profile-header">
        <h2>Profile</h2>
      </div>
      <div class="profile-data">
        <div class="data-card">
          <h3>Personal Information</h3>
          <div class="data-list">
            <div class="data-row"><span><strong>Full Name:</strong></span> <span>${fullName || '-'}</span></div>
            <div class="data-row"><span><strong>Username:</strong></span> <span>${username}</span></div>
            <div class="data-row"><span><strong>Email:</strong></span> <span>${email}</span></div>
            <div class="data-row"><span><strong>Phone Number:</strong></span> <span>${phone}</span></div>
            <div class="data-row"><span><strong>Date of Birth:</strong></span> <span>${dob}</span></div>
            <div class="data-row"><span><strong>Country:</strong></span> <span>${country}</span></div>
          </div>
        </div>

        <div class="data-card">
          <h3>Recent Grades</h3>
          <div class="data-list" id="recent-grades">
            ${
              (() => {
                const filteredGrades = user.recentProgress
                  .filter(p => p.grade !== null)
                  .map(p => {
                    const label = getProjectName(p.path);
                    if (!label || label === "piscine-js" || label.toLowerCase().includes("checkpoint")) return null;
                    return { label, grade: p.grade, createdAt: p.createdAt };
                  })
                  .filter(Boolean);

                const displayGrades = filteredGrades.slice(0, 5);
                const hasMore = filteredGrades.length > 5;

                const gradeRows = displayGrades.map(p => `
                  <div class="data-row">
                    <span><strong>${p.label}</strong></span>
                    <span>${new Date(p.createdAt).toLocaleDateString()}</span>
                    <span class="${Number(p.grade) >= 1 ? 'pass' : 'fail'}">
                      ${Number(p.grade) >= 1 ? 'PASS' : 'FAIL'}
                    </span>
                  </div>
                `).join('');

                const showMoreIndicator = hasMore ? `<div class="show-more-indicator">+${filteredGrades.length - 5} more</div>` : '';
                
                return gradeRows + showMoreIndicator || `<div class="empty">No graded submissions.</div>`;
              })()
            }
          </div>
        </div>

        <div class="data-card">
          <h3>Recent Audits Done</h3>
          <div class="data-list" id="recent-audits"></div>
        </div>

        <div class="data-card">
          <h3>Audit Ratio</h3>
          <div class="data-list" id="audit-ratio-box">
            <div class="audit-ratio-display">
              <div class="ratio-value" id="audit-ratio-value">Loading...</div>
              <div class="ratio-label">Completed per Received</div>
            </div>
          </div>
        </div>

      </div>
      <div class="profile-graphs">
        <div id="skills-graph"></div>
        <div id="stats-graph">📊 (Graphs come next)</div>
        <div id="audit-graph">📊 (Audit Graph)</div>
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
    const hasMoreAudits = audits.length > 5;

    document.getElementById("recent-audits").innerHTML = 
      renderAuditList(displayAudits) +
      (hasMoreAudits
        ? `<div class="show-more-indicator" id="show-more-audits">+${audits.length - 5} more</div>`
        : "");

        if (hasMoreAudits) {
          document.getElementById("show-more-audits").addEventListener("click", () => {
            document.getElementById("recent-audits").innerHTML = renderAuditList(audits);
          });
        }
        

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

}

function showError(message) {
  let errorDiv = document.getElementById('error-message');
  if (!errorDiv) {
    errorDiv = document.createElement('div');
    errorDiv.id = 'error-message';
    errorDiv.className = 'error-message';
    const appDiv = document.getElementById('app');
    if (appDiv) {
      appDiv.parentNode.insertBefore(errorDiv, appDiv);
    } else {
      document.body.insertBefore(errorDiv, document.body.firstChild);
    }
  }
  errorDiv.textContent = message;
  errorDiv.style.display = message ? 'block' : 'none';
}

export { showLoginForm, showProfile, showError };
