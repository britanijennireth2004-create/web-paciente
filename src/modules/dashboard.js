// dashboard.js - Versión exclusiva para paciente

const icons = {
  calendar: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 20 20"><rect x="2.25" y="3.75" width="15.5" height="14" rx="2.25" stroke="currentColor" stroke-width="1.5"/><path stroke="currentColor" stroke-width="1.5" d="M6 1.75v3.5M14 1.75v3.5"/><path stroke="currentColor" stroke-width="1.5" d="M2 7.5h16"/></svg>`,
  clipboard: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 20 20"><rect x="4.25" y="3.75" width="11.5" height="14" rx="2.25" stroke="currentColor" stroke-width="1.5"/><rect x="6.75" y="2" width="6.5" height="3.5" rx="1.25" stroke="currentColor" stroke-width="1.5"/></svg>`,
  info: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 20 20"><circle cx="10" cy="10" r="9" stroke="currentColor" stroke-width="2"/><path stroke="currentColor" stroke-width="2" d="M10 7v5"/><circle cx="10" cy="14" r="1" fill="currentColor"/></svg>`
};

export default function mountDashboard(root, { bus, store, user, role }) {
  const state = {
    stats: {},
    chartData: [],
    isLoading: true
  };

  function render() {
    root.innerHTML = `
      <div class="module-dashboard">
        <div class="stats-auto-grid mb-4" id="stats-container"></div>
        <div class="card mb-4">
          <div class="card-header" style="border-bottom: 1px solid var(--border); padding-bottom: 1rem; margin-bottom: 1.5rem;">
            <h3 style="margin: 0; display: flex; align-items: center; gap: 0.5rem;">
              <span>${icons.calendar}</span>
              Mis Citas (Próximos 30 días)
            </h3>
            <div class="text-muted text-sm">Frecuencia de mis consultas programadas</div>
          </div>
          <div id="appointments-chart-container" style="min-height: 350px; padding: 1rem 0;"></div>
        </div>
        <style>.stats-auto-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1rem; }</style>
      </div>
    `;

    loadData();
  }

  function getNextAppointment() {
    const appointments = store.get('appointments') || [];
    const now = Date.now();
    const myAppointments = appointments.filter(a => a.patientId === user.patientId && a.status === 'scheduled' && new Date(a.dateTime).getTime() > now);
    myAppointments.sort((a, b) => new Date(a.dateTime) - new Date(b.dateTime));
    return myAppointments[0];
  }

  async function loadData() {
    state.isLoading = true;
    try {
      await loadStats();
      renderStats();
      renderAppointmentsChart();
    } catch (error) {
      console.error('Error cargando dashboard:', error);
      showError('Error al cargar los datos');
    } finally {
      state.isLoading = false;
    }
  }

  async function loadStats() {
    const appointments = store.get('appointments') || [];
    const myAppointments = appointments.filter(a => a.patientId === user.patientId);
    const clinicalRecords = store.get('clinicalRecords') || [];
    const myRecords = clinicalRecords.filter(r => r.patientId === user.patientId);
    const now = Date.now();
    const upcomingCount = myAppointments.filter(a => a.status === 'scheduled' && new Date(a.dateTime).getTime() > now).length;

    state.stats = {
      totalAppointments: myAppointments.length,
      clinicalRecords: myRecords.length,
      upcomingAppointments: upcomingCount,
      nextAppointment: getNextAppointment()
    };
  }

  function renderStats() {
    const container = root.querySelector('#stats-container');
    if (!container) return;

    const { stats } = state;
    const nextAppointmentText = stats.nextAppointment 
      ? `${new Date(stats.nextAppointment.dateTime).toLocaleDateString('es-ES')} a las ${new Date(stats.nextAppointment.dateTime).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`
      : 'No hay';

    container.innerHTML = `
      <div class="stat-info-card">
        <span class="stat-info-label">Mis Citas</span>
        <span class="stat-info-value">${stats.totalAppointments}</span>
        <span class="stat-info-sub">${icons.calendar} Programadas</span>
      </div>
      <div class="stat-info-card">
        <span class="stat-info-label">Historias Clínicas</span>
        <span class="stat-info-value">${stats.clinicalRecords}</span>
        <span class="stat-info-sub">${icons.clipboard} Registros propios</span>
      </div>
      <div class="stat-info-card">
        <span class="stat-info-label">Próxima Visita</span>
        <span class="stat-info-value" style="font-size: 1rem; line-height: 1.3;">${nextAppointmentText}</span>
        <span class="stat-info-sub">${icons.info} ${stats.upcomingAppointments > 0 ? 'Cita programada' : 'Sin citas próximas'}</span>
      </div>
    `;
  }

  function renderAppointmentsChart() {
    const container = root.querySelector('#appointments-chart-container');
    if (!container) return;

    const appointments = store.get('appointments') || [];
    const myAppointments = appointments.filter(a => a.patientId === user.patientId);

    const data = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < 30; i++) {
      const currentDay = new Date(today);
      currentDay.setDate(today.getDate() + i);
      const count = myAppointments.filter(a => {
        const aDate = new Date(a.dateTime);
        aDate.setHours(0, 0, 0, 0);
        return aDate.getTime() === currentDay.getTime();
      }).length;
      data.push({
        date: currentDay,
        label: i % 5 === 0 ? currentDay.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }) : '',
        count
      });
    }

    state.chartData = data;

    const width = container.clientWidth || 800;
    const height = 300;
    const padding = { top: 20, right: 30, bottom: 40, left: 40 };
    const maxCount = Math.max(...data.map(d => d.count), 5);

    const getX = (index) => padding.left + (index * (width - padding.left - padding.right) / (data.length - 1));
    const getY = (count) => height - padding.bottom - (count * (height - padding.top - padding.bottom) / maxCount);

    const points = data.map((d, i) => `${getX(i)},${getY(d.count)}`).join(' ');

    const yLines = [];
    for (let i = 0; i <= maxCount; i += Math.ceil(maxCount / 5)) {
      const y = getY(i);
      yLines.push(`
        <line x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}" stroke="var(--border)" stroke-dasharray="4" />
        <text x="${padding.left - 10}" y="${y + 5}" font-size="12" fill="var(--muted)" text-anchor="end">${i}</text>
      `);
    }

    const xLabels = data.map((d, i) => d.label ? `
      <text x="${getX(i)}" y="${height - 10}" font-size="11" fill="var(--muted)" text-anchor="middle">${d.label}</text>
    ` : '').join('');

    container.innerHTML = `
      <svg width="100%" height="${height}" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" style="overflow: visible;">
        ${yLines.join('')}
        <defs>
          <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="var(--accent)" stop-opacity="0.2" />
            <stop offset="100%" stop-color="var(--accent)" stop-opacity="0" />
          </linearGradient>
        </defs>
        <polyline points="${padding.left},${height - padding.bottom} ${points} ${width - padding.right},${height - padding.bottom}" fill="url(#chartGradient)" />
        <polyline points="${points}" fill="none" stroke="var(--themeTertiary)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
        ${data.map((d, i) => `
          <g class="chart-point" data-date="${d.date.toISOString()}" data-count="${d.count}">
            <circle cx="${getX(i)}" cy="${getY(d.count)}" r="6" fill="white" stroke="var(--themeTertiary)" stroke-width="2.5" style="cursor: pointer;">
              <title>${d.date.toLocaleDateString('es-ES')}: ${d.count} ${d.count === 1 ? 'cita' : 'citas'}</title>
            </circle>
            ${d.count > 0 ? `<circle cx="${getX(i)}" cy="${getY(d.count)}" r="3" fill="var(--themeTertiary)" />` : ''}
          </g>
        `).join('')}
        ${xLabels}
      </svg>
    `;

    const chartPoints = container.querySelectorAll('.chart-point');
    chartPoints.forEach(point => {
      point.addEventListener('mouseenter', (e) => {
        const title = point.querySelector('title');
        if (title) {
          const tooltip = document.createElement('div');
          tooltip.className = 'chart-tooltip';
          tooltip.textContent = title.textContent;
          tooltip.style.cssText = `position:fixed;background:#1e293b;color:white;padding:0.5rem 1rem;border-radius:8px;font-size:0.75rem;font-weight:600;pointer-events:none;z-index:1000;white-space:nowrap;box-shadow:0 4px 12px rgba(0,0,0,0.15);`;
          document.body.appendChild(tooltip);
          const updatePosition = (event) => {
            tooltip.style.left = (event.clientX + 15) + 'px';
            tooltip.style.top = (event.clientY - 30) + 'px';
          };
          const onMouseMove = (event) => updatePosition(event);
          point.addEventListener('mousemove', onMouseMove);
          point.addEventListener('mouseleave', () => {
            tooltip.remove();
            point.removeEventListener('mousemove', onMouseMove);
          }, { once: true });
        }
      });
    });
  }

  function showError(message) {
    const errorEl = document.createElement('div');
    errorEl.className = 'alert alert-danger';
    errorEl.textContent = message;
    root.appendChild(errorEl);
    setTimeout(() => errorEl.remove(), 5000);
  }

  const unsubscribe = store.subscribe('appointments', () => loadData());

  render();

  return {
    refresh: loadData,
    destroy() { if (unsubscribe) unsubscribe(); }
  };
}