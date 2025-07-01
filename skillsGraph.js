// skillsGraph.js
import { graphQLRequest } from './graphql.js';

export function drawSkillsGraph(containerSelector = "#skills-graph") {
  const container = document.querySelector(containerSelector);
  if (!container) {
    console.error(`Container ${containerSelector} not found`);
    return;
  }

  // Show loading state
  container.innerHTML = '<div class="loading">Loading skills data...</div>';

  // Fetch data and render the graph
  fetchSkillsData()
    .then(data => {
      renderSkillsGraph(container, data);
      setupTooltip(); // Initialize tooltip after graph is rendered
    })
    .catch(error => {
      console.error("Error drawing skills graph:", error);
      container.innerHTML = '<div class="error">Failed to load skills data</div>';
    });
}

async function fetchSkillsData() {
  const query = `
    query {
      skillTypes: transaction_aggregate(
        distinct_on: [type]
        where: { type: { _nin: ["xp", "level", "up", "down"] } }
        order_by: [{ type: asc }, { amount: desc }]
      ) {
        nodes {
          type
          amount
        }
      }
    }
  `;

  const result = await graphQLRequest(query);
  return result?.data?.skillTypes?.nodes || [];
}

function renderSkillsGraph(container, skillsData) {
  // Filter and sort skills
  const displaySkills = [
    'skill_go',
    'skill_back-end', 
    'skill_prog',
    'skill_front-end',
    'skill_js',
    'skill_html'
  ];
  
  const filteredSkills = skillsData.filter(skill => displaySkills.includes(skill.type));
  const sortedSkills = displaySkills
    .map(skillType => filteredSkills.find(skill => skill.type === skillType))
    .filter(skill => skill);

  if (sortedSkills.length === 0) {
    container.innerHTML = '<div class="error">No matching skills found</div>';
    return;
  }

  // Prepare data
  const skillNames = sortedSkills.map(skill => skill.type.replace('skill_', ''));
  const skillPercentages = sortedSkills.map(skill => skill.amount);

  // Create SVG element
  const width = container.clientWidth || 400;
  const height = 400;
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.setAttribute("width", "100%");
  svg.setAttribute("height", height);
  svg.style.background = "transparent";

  // Radar chart implementation
  const cx = width / 2;
  const cy = height / 2;
  const radius = Math.min(width, height) * 0.36;
  const levels = 5;
  const angleStep = (2 * Math.PI) / skillNames.length;

  // Draw grid
  for (let l = levels; l >= 1; l--) {
    const r = (radius * l) / levels;
    const points = skillNames.map((_, i) => {
      const angle = i * angleStep - Math.PI / 2;
      return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
    });
    const polygon = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
    polygon.setAttribute("points", points.map(p => p.join(",")).join(" "));
    polygon.setAttribute("fill", l % 2 === 0 ? "rgba(76, 29, 149, 0.1)" : "rgba(76, 29, 149, 0.05)");
    polygon.setAttribute("stroke", "rgba(76, 29, 149, 0.3)");
    polygon.setAttribute("stroke-width", "1");
    svg.appendChild(polygon);
  }

  // Draw axes
  skillNames.forEach((_, i) => {
    const angle = i * angleStep - Math.PI / 2;
    const x = cx + radius * Math.cos(angle);
    const y = cy + radius * Math.sin(angle);
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", cx);
    line.setAttribute("y1", cy);
    line.setAttribute("x2", x);
    line.setAttribute("y2", y);
    line.setAttribute("stroke", "rgba(76, 29, 149, 0.4)");
    line.setAttribute("stroke-width", "1");
    svg.appendChild(line);
  });

  // Draw skill labels
  skillNames.forEach((skill, i) => {
    const angle = i * angleStep - Math.PI / 2;
    const x = cx + (radius + 28) * Math.cos(angle);
    const y = cy + (radius + 28) * Math.sin(angle) + 6;
    const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
    label.setAttribute("x", x);
    label.setAttribute("y", y);
    label.setAttribute("text-anchor", "middle");
    label.setAttribute("font-size", "14");
    label.setAttribute("font-family", "'Segoe UI', system-ui, sans-serif");
    label.setAttribute("fill", "#4c1d95");
    label.setAttribute("font-weight", "600");
    label.textContent = skill;
    svg.appendChild(label);
  });

  // Draw radar area
  const radarPoints = skillPercentages.map((percentage, i) => {
    const r = (percentage / 100) * radius;
    const angle = i * angleStep - Math.PI / 2;
    return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
  });
  
  const radarPolygon = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
  radarPolygon.setAttribute("points", radarPoints.map(p => p.join(",")).join(" "));
  radarPolygon.setAttribute("fill", "#60a5fa");
  radarPolygon.setAttribute("fill-opacity", "0.3");
  radarPolygon.setAttribute("stroke", "#3b82f6");
  radarPolygon.setAttribute("stroke-width", "3");
  svg.appendChild(radarPolygon);

  // Draw data points with hover effects
  radarPoints.forEach(([x, y], i) => {
    const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    dot.setAttribute("cx", x);
    dot.setAttribute("cy", y);
    dot.setAttribute("r", "6");
    dot.setAttribute("fill", "#1e40af");
    dot.setAttribute("stroke", "#4c1d95");
    dot.setAttribute("stroke-width", "2");
    dot.setAttribute("data-value", skillPercentages[i]); // Add this line to store the percentage value
    dot.style.cursor = "pointer";
    
    // Add hover effects
    dot.addEventListener('mouseenter', () => {
      dot.setAttribute("r", "8");
      dot.setAttribute("fill", "#2563EB");
    });
    
    dot.addEventListener('mouseleave', () => {
      dot.setAttribute("r", "6");
      dot.setAttribute("fill", "#1e40af");
    });
    
    svg.appendChild(dot);
  });

  // Add title
  const title = document.createElementNS("http://www.w3.org/2000/svg", "text");
  title.setAttribute("x", width / 2);
  title.setAttribute("y", 24);
  title.setAttribute("text-anchor", "middle");
  title.setAttribute("font-size", "22");
  title.setAttribute("font-weight", "bold");
  title.setAttribute("fill", "#222");
  title.textContent = "Skills";
  svg.appendChild(title);

  // Clear container and append the SVG
  container.innerHTML = "";
  container.appendChild(svg);
}

// Tooltip implementation
function setupTooltip() {
  const tooltip = document.createElement('div');
  tooltip.id = 'skills-tooltip';
  Object.assign(tooltip.style, {
    position: 'absolute',
    background: 'rgba(0, 0, 0, 0.8)',
    color: '#ffffff',
    padding: '14px 18px',
    borderRadius: '10px',
    fontSize: '15px',
    fontWeight: '500',
    pointerEvents: 'none',
    opacity: 0,
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    zIndex: 1000,
    boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    minWidth: '120px',
    textAlign: 'center',
    lineHeight: '1.4'
  });
  document.body.appendChild(tooltip);

  // Add event listeners to all data points
  document.querySelectorAll('#skills-graph svg circle').forEach((dot, i) => {
    dot.addEventListener('mousemove', (e) => {
      const skillName = document.querySelectorAll('#skills-graph svg text')[i].textContent;
      const skillValue = e.target.getAttribute('data-value'); // Now this will get the correct value
      
      tooltip.innerHTML = `
        <div style="font-weight:600;font-size:16px;color:#60a5fa;">${skillName}</div>
        <div style="font-size:15px;color:#ffffff;">${skillValue}%</div>
      `;
      
          
      const tooltipRect = tooltip.getBoundingClientRect();
      const windowWidth = window.innerWidth;
      let left = e.pageX + 15;
      let top = e.pageY - 40;
      
      if (left + tooltipRect.width > windowWidth - 20) {
        left = e.pageX - tooltipRect.width - 15;
      }
      if (top < 20) {
        top = e.pageY + 15;
      }
      
      tooltip.style.left = `${left}px`;
      tooltip.style.top = `${top}px`;
      tooltip.style.opacity = 1;
      tooltip.style.transform = 'translateY(-5px) scale(1.02)';
    });

    dot.addEventListener('mouseout', () => {
      tooltip.style.opacity = 0;
      tooltip.style.transform = 'translateY(0px) scale(1)';
    });
  });
}