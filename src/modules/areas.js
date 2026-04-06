// areas.js - Versión para paciente con botón de médicos en el footer del modal

export default function mountAreas(root, { bus, store, user, role }) {
  const state = {
    areas: [],
    filters: {
      search: ''
    },
    currentPage: 1,
    itemsPerPage: 10
  };

  let elements = {};

  function init() {
    render();
    setupEventListeners();
    loadAreas();

    const unsubscribe = store.subscribe('areas', () => {
      loadAreas();
    });

    return unsubscribe;
  }

  function loadAreas() {
    let areas = store.get('areas') || [];
    areas = applyFilters(areas);
    areas.sort((a, b) => {
      if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    state.areas = areas;
    renderAreasList();
    updateStats();
  }

  function applyFilters(areas) {
    return areas.filter(area => {
      if (state.filters.search) {
        const searchTerm = state.filters.search.toLowerCase();
        const statusText = area.isActive ? 'activo active' : 'inactivo inactive';
        const searchFields = [
          area.name,
          area.code,
          area.description,
          area.location,
          statusText
        ].filter(Boolean).join(' ').toLowerCase();
        if (!searchFields.includes(searchTerm)) return false;
      }
      return true;
    });
  }

  function getAreaStats(areaId) {
    const doctors = store.get('doctors') || [];
    const appointments = store.get('appointments') || [];
    const today = new Date();
    const thisMonth = today.getMonth();
    const thisYear = today.getFullYear();

    const areaDoctors = doctors.filter(d => d.areaId === areaId);
    const areaAppointments = appointments.filter(a => a.areaId === areaId);

    return {
      totalDoctors: areaDoctors.length,
      totalAppointments: areaAppointments.length,
      todayAppointments: areaAppointments.filter(a => {
        const appointmentDate = new Date(a.dateTime);
        return appointmentDate.toDateString() === today.toDateString();
      }).length,
      monthAppointments: areaAppointments.filter(a => {
        const appointmentDate = new Date(a.dateTime);
        return appointmentDate.getMonth() === thisMonth &&
          appointmentDate.getFullYear() === thisYear;
      }).length
    };
  }

  function getParentAreaName(parentId) {
    if (!parentId) return null;
    const parentArea = store.find('areas', parentId);
    return parentArea ? parentArea.name : 'Área eliminada';
  }

  function render() {
    root.innerHTML = `
      <style>
        .module-areas { max-width: 1400px; margin: 0 auto; padding: 1.5rem; font-family: 'Inter', system-ui, -apple-system, sans-serif; }
        .areas-table-card { 
          background: white; 
          border-radius: 16px; 
          box-shadow: 0 10px 30px rgba(0,0,0,0.06); 
          overflow: hidden;
          border: 1px solid rgba(0,0,0,0.05);
        }
        .areas-table { width: 100%; border-collapse: collapse; }
        .areas-table th { 
          background: #f8fafc; 
          padding: 1.25rem 1rem; 
          text-align: left; 
          font-size: 0.75rem; 
          font-weight: 700; 
          color: #64748b; 
          text-transform: uppercase; 
          letter-spacing: 0.05em;
          border-bottom: 1px solid #edf2f7;
        }
        .areas-table td { padding: 1.25rem 1rem; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
        .areas-table tr:hover { background: #fcfdfe; }
        .area-icon-box { width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; color: white; font-weight: 800; font-size: 1.1rem; }
        .area-type-pill { background: #f1f5f9; color: #475569; padding: 0.25rem 0.75rem; border-radius: 20px; font-size: 0.7rem; font-weight: 700; }
        .area-badge { padding: 0.4rem 0.75rem; border-radius: 8px; font-weight: 600; font-size: 0.75rem; display: inline-flex; align-items: center; gap: 0.5rem; }
        .doctor-card {
          transition: transform 0.2s, box-shadow 0.2s;
        }
      </style>

      <div class="module-areas animated-fade-in">
        <!-- Estadísticas -->
        <div class="stats-auto-grid mb-4" id="stats-container"></div>

        <!-- Barra de Búsqueda -->
        <div class="card" style="padding: 0.75rem 1rem; margin-bottom: 1.5rem;">
          <div class="flex justify-between items-center">
            <div></div>
            <div class="search-input-wrapper" style="position: relative; width: 450px;">
              <span style="position: absolute; left: 1rem; top: 50%; transform: translateY(-50%); color: var(--muted); opacity: 0.7;">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              </span>
              <input type="text" class="input" id="filter-search" 
                     placeholder="Buscar por nombre, código o ubicación..." 
                     style="padding-left: 2.8rem; border-radius: 20px; background: rgba(0,0,0,0.05); border: 1px solid transparent; transition: all 0.3s; height: 40px; width: 100%;"
                     value="${state.filters.search}">
            </div>
          </div>
        </div>

        <!-- Vista de lista -->
        <div class="areas-table-card">
          <div class="table-responsive" style="overflow-x: auto;">
            <table class="areas-table" style="width: 100%; border-collapse: collapse;">
              <thead>
                <tr>
                  <th style="padding: 1.25rem 1rem; text-align: left;">Área / Servicio</th>
                  <th style="padding: 1.25rem 1rem; text-align: left;">Ubicación</th>
                  <th style="padding: 1.25rem 1rem; text-align: center;">Médicos</th>
                  <th style="padding: 1.25rem 1rem; text-align: center;">Citas</th>
                  <th style="padding: 1.25rem 1rem; text-align: left;">Tipo</th>
                  <th style="padding: 1.25rem 1rem; text-align: left;">Estado</th>
                  <th style="padding: 1.25rem 1rem; text-align: right;">Acciones</th>
                </tr>
              </thead>
              <tbody id="areas-list"></tbody>
            </table>
          </div>
          
          <div id="pagination" style="padding: 1.5rem; border-top: 1px solid #f1f5f9;"></div>
          
          <div id="empty-state" class="hidden" style="padding: 5rem 2rem; text-align: center;">
            <div style="font-size: 4rem; margin-bottom: 1.5rem; opacity: 0.2;">
              <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 6V2H4a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-4"/><path d="M16 22v-8h-4v8"/><path d="M11 5h1"/><path d="M11 9h1"/><path d="M11 13h1"/></svg>
            </div>
            <h3 style="font-size: 1.5rem; color: #1e293b; margin-bottom: 0.5rem;">No se encontraron áreas</h3>
            <p style="color: #64748b; max-width: 400px; margin: 0 auto;">Ajuste los filtros de búsqueda para encontrar el área deseada.</p>
          </div>
        </div>
      </div>
    `;

    captureElements();
    loadAreas();
  }

  function captureElements() {
    elements = {
      statsContainer: root.querySelector('#stats-container'),
      areasList: root.querySelector('#areas-list'),
      pagination: root.querySelector('#pagination'),
      emptyState: root.querySelector('#empty-state'),
      filterSearch: root.querySelector('#filter-search')
    };
  }

  function renderAreasList() {
    if (!elements.areasList) return;

    const startIndex = (state.currentPage - 1) * state.itemsPerPage;
    const endIndex = startIndex + state.itemsPerPage;
    const paginatedAreas = state.areas.slice(startIndex, endIndex);

    if (paginatedAreas.length === 0) {
      elements.emptyState.classList.remove('hidden');
      elements.areasList.innerHTML = '';
      elements.pagination.classList.add('hidden');
      return;
    }

    elements.emptyState.classList.add('hidden');
    elements.pagination.classList.remove('hidden');

    const typeNames = { clinical: 'Clínica', diagnostic: 'Diagnóstico', surgical: 'Quirúrgica', administrative: 'Admin', support: 'Soporte' };

    const rows = paginatedAreas.map(area => {
      const stats = getAreaStats(area.id);
      const parentName = getParentAreaName(area.parentId);

      return `
        <tr style="border-bottom: 1px solid #f1f5f9; transition: background 0.2s;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='transparent'">
          <td style="padding: 1rem;">
            <div style="display: flex; align-items: center; gap: 0.75rem;">
              <div class="area-icon-box" style="width: 38px; height: 38px; background: ${area.color || '#2196F3'}; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: white; font-weight: 800; font-size: 1rem; flex-shrink: 0;">
                ${area.code ? area.code.charAt(0) : area.name.charAt(0)}
              </div>
              <div>
                <div style="font-weight: 700; color: #1e293b; font-size: 0.9rem;">${area.name}</div>
                <div style="font-family: monospace; font-size: 0.7rem; color: #94a3b8; font-weight: 600;">${area.code || 'S/C'}</div>
              </div>
            </div>
          </td>
          <td style="padding: 1rem;">
            <div style="display: flex; align-items: center; gap: 0.4rem; color: #64748b; font-size: 0.8rem;">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
              ${area.location || '<span style="opacity: 0.5;">No asignada</span>'}
            </div>
          </td>
          <td style="padding: 1rem; text-align: center;">
            <span style="font-weight: 700; color: #334155; background: #f1f5f9; padding: 0.2rem 0.6rem; border-radius: 6px; font-size: 0.8rem;">
              ${stats.totalDoctors}
            </span>
          </td>
          <td style="padding: 1rem; text-align: center;">
            <span style="font-weight: 700; color: var(--accent); font-size: 0.8rem;">
              ${stats.monthAppointments}
            </span>
          </td>
          <td style="padding: 1rem;">
            <span class="area-type-pill" style="background: #f1f5f9; color: #475569; padding: 0.2rem 0.6rem; border-radius: 4px; font-size: 0.7rem; font-weight: 600;">${typeNames[area.type] || 'Clínica'}</span>
            ${parentName ? `<div style="font-size: 0.65rem; color: #94a3b8; margin-top: 2px;">Sub de: ${parentName}</div>` : ''}
          </td>
          <td style="padding: 1rem;">
            <span class="area-badge" style="background: ${area.isActive ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)'}; color: ${area.isActive ? '#10b981' : '#ef4444'}; font-size: 0.75rem; padding: 0.25rem 0.5rem; border-radius: 6px; font-weight: 600;">
              <span style="display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: currentColor; margin-right: 4px;"></span>
              ${area.isActive ? 'Activa' : (area.status === 'maintenance' ? 'Mantenimiento' : 'Inactiva')}
            </span>
          </td>
          <td style="padding: 1rem; text-align: right;">
            <div style="display: flex; gap: 0.5rem; justify-content: flex-end;">
              <button class="btn-circle btn-circle-status" data-action="view" data-id="${area.id}" title="Ver detalles">
                ${ICONS.eye}
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    elements.areasList.innerHTML = rows;
    renderPagination();
  }

  function renderPagination() {
    if (!elements.pagination) return;

    const totalPages = Math.ceil(state.areas.length / state.itemsPerPage);

    if (totalPages <= 1) {
      elements.pagination.innerHTML = '';
      return;
    }

    let pageButtons = '';
    const maxVisible = 5;
    let startPage = Math.max(1, state.currentPage - Math.floor(maxVisible / 2));
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);

    if (endPage - startPage + 1 < maxVisible) {
      startPage = Math.max(1, endPage - maxVisible + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pageButtons += `
        <button class="btn btn-sm ${state.currentPage === i ? 'btn-primary' : 'btn-outline'}" data-page="${i}">
          ${i}
        </button>
      `;
    }

    elements.pagination.innerHTML = `
      <div class="text-sm text-muted">
        Mostrando ${Math.min((state.currentPage - 1) * state.itemsPerPage + 1, state.areas.length)} - 
        ${Math.min(state.currentPage * state.itemsPerPage, state.areas.length)} de ${state.areas.length} áreas
      </div>
      <div class="flex gap-1">
        <button class="btn btn-outline btn-sm ${state.currentPage === 1 ? 'disabled' : ''}" data-page="prev" ${state.currentPage === 1 ? 'disabled' : ''}>
          ← Anterior
        </button>
        ${pageButtons}
        <button class="btn btn-outline btn-sm ${state.currentPage === totalPages ? 'disabled' : ''}" data-page="next" ${state.currentPage === totalPages ? 'disabled' : ''}>
          Siguiente →
        </button>
      </div>
    `;
  }

  function updateStats() {
    if (!elements.statsContainer) return;

    const areas = store.get('areas') || [];
    const doctors = store.get('doctors') || [];
    const appointments = store.get('appointments') || [];

    const now = new Date();
    const monthlyCount = appointments.filter(a => {
      const d = new Date(a.dateTime);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;

    const stats = {
      total: areas.length,
      active: areas.filter(a => a.isActive).length,
      mainAreas: areas.filter(a => !a.parentId).length,
      subAreas: areas.filter(a => a.parentId).length,
      areaAssignments: doctors.filter(d => d.areaId).length,
      monthlyAppointments: monthlyCount
    };

    elements.statsContainer.innerHTML = `
      <div class="stat-info-card">
        <span class="stat-info-label">Total Áreas</span>
        <span class="stat-info-value">${stats.total}</span>
        <span class="stat-info-sub">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          ${stats.mainAreas} principales, ${stats.subAreas} sub
        </span>
      </div>
      <div class="stat-info-card">
        <span class="stat-info-label">Áreas Activas</span>
        <span class="stat-info-value">${stats.active}</span>
        <span class="stat-info-sub">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
          ${stats.total ? Math.round((stats.active / stats.total) * 100) : 0}% operativa
        </span>
      </div>
      <div class="stat-info-card">
        <span class="stat-info-label">Asignaciones</span>
        <span class="stat-info-value">${stats.areaAssignments}</span>
        <span class="stat-info-sub">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          Capacidad instalada
        </span>
      </div>
      <div class="stat-info-card">
        <span class="stat-info-label">Citas del Mes</span>
        <span class="stat-info-value">${stats.monthlyAppointments}</span>
        <span class="stat-info-sub">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          Rendimiento mensual
        </span>
      </div>
    `;
  }

  function viewAreaDoctors(area) {
    const doctors = store.get('doctors') || [];
    const areaDoctors = doctors.filter(d => d.areaId === area.id && d.isActive !== false);

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    
    const doctorsHtml = areaDoctors.length > 0 ? areaDoctors.map(d => `
      <div class="doctor-card" style="background: #f8fafc; padding: 1rem; border-radius: 12px; border: 1px solid #e2e8f0; display: flex; align-items: center; gap: 1rem; transition: all 0.2s; margin-bottom: 0.75rem;">
        <div style="width: 50px; height: 50px; background: var(--themeSecondary); color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 1.25rem; flex-shrink: 0;">
          ${d.name.charAt(0)}
        </div>
        <div style="flex: 1;">
          <div style="font-weight: 700; color: #1e293b; font-size: 1rem;">${d.name}</div>
          <div style="color: var(--info); font-size: 0.8rem; font-weight: 600;">${d.specialty}</div>
          <div style="display: flex; gap: 0.5rem; margin-top: 0.25rem; flex-wrap: wrap;">
            <span style="font-size: 0.7rem; color: #64748b; background: white; padding: 2px 8px; border-radius: 4px;">Lic: ${d.license || 'N/A'}</span>
            <span class="badge ${d.isActive ? 'badge-success' : 'badge-danger'}" style="font-size: 0.65rem;">
              ${d.isActive ? 'Disponible' : 'No disponible'}
            </span>
          </div>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 0.7rem; color: #94a3b8;">HORARIO</div>
          <div style="font-size: 0.8rem; font-weight: 600; color: #334155;">
            ${d.scheduleStart || (d.workStartHour !== undefined ? `${d.workStartHour}:00` : '08:00')} - 
            ${d.scheduleEnd || (d.workEndHour !== undefined ? `${d.workEndHour}:00` : '17:00')}
          </div>
        </div>
      </div>
    `).join('') : `
      <div style="text-align: center; padding: 3rem; color: #94a3b8;">
        <div style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.3;">
          <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
        </div>
        <div style="font-weight: 600;">No hay médicos asignados actualmente</div>
        <div style="font-size: 0.85rem;">Esta área no cuenta con personal médico activo registrado.</div>
      </div>
    `;

    modal.innerHTML = `
      <div class="modal-content" style="max-width: 700px;">
        <div class="modal-header">
          <div>
            <h3 class="modal-title">HOSPITAL UNIVERSITARIO MANUEL NÚÑEZ TOVAR</h3>
            <div style="font-size: 0.8rem; opacity: 0.8; margin-top: 0.25rem; font-weight: 500;">EQUIPO MÉDICO DE ${area.name.toUpperCase()}</div>
          </div>
          <button class="close-modal btn-circle" style="background: rgba(255,255,255,0.2); border: none; color: white;">&times;</button>
        </div>
        
        <div class="modal-body" style="padding: 1.5rem; max-height: 70vh; overflow-y: auto;">
          <div style="margin-bottom: 1rem;">
            <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1rem;">
              <div style="width: 40px; height: 40px; background: ${area.color || '#2196F3'}; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: white;">
                ${area.code ? area.code.charAt(0) : area.name.charAt(0)}
              </div>
              <div>
                <div style="font-weight: 700;">${area.name}</div>
                <div style="font-size: 0.75rem; color: #64748b;">${areaDoctors.length} ${areaDoctors.length === 1 ? 'médico asignado' : 'médicos asignados'}</div>
              </div>
            </div>
          </div>
          <div style="display: flex; flex-direction: column; gap: 0.75rem;">
            ${doctorsHtml}
          </div>
        </div>

        <div class="modal-footer">
          <button class="btn-circle btn-circle-cancel" id="close-doctors-modal" title="Cerrar">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    const closeHandler = () => modal.remove();
    modal.querySelector('.close-modal').onclick = closeHandler;
    modal.querySelector('#close-doctors-modal').onclick = closeHandler;
    modal.onclick = (e) => { if (e.target === modal) closeHandler(); };
  }

  function viewArea(area) {
    const stats = getAreaStats(area.id);
    const subAreas = state.areas.filter(a => a.parentId === area.id);

    let headDoctorName = 'No asignado';
    if (area.headDoctorId) {
      const headDoc = store.find('doctors', area.headDoctorId);
      if (headDoc) headDoctorName = headDoc.name;
    }

    const areaTypes = {
      clinical: 'Clínica',
      diagnostic: 'Diagnóstico',
      surgical: 'Quirúrgica',
      administrative: 'Administrativa',
      support: 'Soporte'
    };
    const areaTypeName = areaTypes[area.type] || 'Clínica';

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-content" style="max-width: 850px;">
        <div class="modal-header">
          <div>
            <h3 class="modal-title">HOSPITAL UNIVERSITARIO MANUEL NÚÑEZ TOVAR</h3>
            <div style="font-size: 0.8rem; opacity: 0.8; margin-top: 0.25rem; font-weight: 500;">FICHA DE ÁREA / SERVICIO MÉDICO</div>
          </div>
          <button class="close-modal btn-circle" style="background: rgba(255,255,255,0.2); border: none; color: white;">&times;</button>
        </div>
        
        <div class="modal-body" style="padding: 2rem;">
          <div style="display: flex; align-items: center; gap: 2rem; margin-bottom: 2rem; border-bottom: 1px solid #eee; padding-bottom: 2rem;">
            <div style="width: 80px; height: 80px; background: ${area.color || '#2196F3'}; border-radius: 16px; display: flex; align-items: center; justify-content: center; color: white; font-size: 2rem; font-weight: 800; box-shadow: 0 4px 10px ${area.color || '#2196F3'}44; flex-shrink: 0;">
              ${area.code ? area.code.substring(0, 3) : area.name.charAt(0)}
            </div>
            <div style="flex: 1;">
              <div style="font-size: 0.75rem; font-weight: 700; color: var(--modal-header); letter-spacing: 0.1em; margin-bottom: 0.25rem;">DEPARTAMENTO</div>
              <h3 style="margin: 0; font-size: 1.75rem; color: #1a202c; font-weight: 800;">${area.name}</h3>
              <div style="display: flex; gap: 0.75rem; margin-top: 0.5rem; flex-wrap: wrap;">
                <span class="badge badge-info" style="font-size: 0.75rem;">${area.code || 'Sin código'}</span>
                <span class="badge ${area.isActive ? 'badge-success' : 'badge-danger'}" style="font-size: 0.75rem;">${area.isActive ? 'Activa' : 'Inactiva'}${area.status === 'maintenance' ? ' (Mantenimiento)' : ''}</span>
                <span class="badge" style="background: ${area.color || '#2196F3'}22; color: ${area.color || '#2196F3'}; font-size: 0.75rem;">${areaTypeName}</span>
              </div>
            </div>
          </div>

          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 1rem; margin-bottom: 2rem;">
            <div style="background: #f0f9ff; border-radius: 12px; padding: 1.25rem; text-align: center;">
              <div style="font-size: 1.75rem; font-weight: 800; color: #0369a1;">${stats.totalDoctors}</div>
              <div style="font-size: 0.7rem; font-weight: 700; color: #0c4a6e;">Médicos</div>
            </div>
            <div style="background: #f0fdf4; border-radius: 12px; padding: 1.25rem; text-align: center;">
              <div style="font-size: 1.75rem; font-weight: 800; color: #15803d;">${stats.todayAppointments}</div>
              <div style="font-size: 0.7rem; font-weight: 700; color: #14532d;">Citas Hoy</div>
            </div>
            <div style="background: #fefce8; border-radius: 12px; padding: 1.25rem; text-align: center;">
              <div style="font-size: 1.75rem; font-weight: 800; color: #a16207;">${stats.monthAppointments}</div>
              <div style="font-size: 0.7rem; font-weight: 700; color: #713f12;">Citas Mes</div>
            </div>
            <div style="background: #faf5ff; border-radius: 12px; padding: 1.25rem; text-align: center;">
              <div style="font-size: 1.75rem; font-weight: 800; color: #7e22ce;">${subAreas.length}</div>
              <div style="font-size: 0.7rem; font-weight: 700; color: #581c87;">Sub-áreas</div>
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin-bottom: 2rem;">
            <div style="background: var(--modal-bg); border-radius: 8px; padding: 1.5rem; border-left: 4px solid var(--modal-header);">
              <div style="display: flex; align-items: center; gap: 0.5rem; font-weight: 800; color: #64748b; margin-bottom: 1rem; font-size: 0.8rem;">UBICACIÓN Y CONTACTO</div>
              <div><div style="font-size: 0.7rem; color: #94a3b8;">UBICACIÓN</div><div>${area.location || 'No especificada'}</div></div>
              <div style="margin-top: 0.75rem;"><div style="font-size: 0.7rem; color: #94a3b8;">TELÉFONO</div><div>${area.phone || 'No registrado'}</div></div>
              <div style="margin-top: 0.75rem;"><div style="font-size: 0.7rem; color: #94a3b8;">EMAIL</div><div>${area.email || 'No registrado'}</div></div>
            </div>
            <div style="background: #f0fdf4; border-radius: 8px; padding: 1.5rem; border-left: 4px solid #16a34a;">
              <div style="display: flex; align-items: center; gap: 0.5rem; font-weight: 800; color: #166534; margin-bottom: 1rem; font-size: 0.8rem;">GESTIÓN Y CAPACIDAD</div>
              <div><div style="font-size: 0.7rem; color: #166534;">RESPONSABLE</div><div>${headDoctorName}</div></div>
              <div style="margin-top: 0.75rem;"><div style="font-size: 0.7rem; color: #166534;">CAPACIDAD</div><div>${area.capacity || 1} consultorio${(area.capacity || 1) > 1 ? 's' : ''}</div></div>
              ${area.parentId ? `<div style="margin-top: 0.75rem;"><div style="font-size: 0.7rem; color: #166534;">ÁREA PADRE</div><div>${getParentAreaName(area.parentId)}</div></div>` : ''}
            </div>
          </div>

          <div style="background: #f8fafc; border-radius: 8px; padding: 1.25rem; margin-bottom: 1.5rem;">
            <div style="font-size: 0.75rem; font-weight: 700; color: #64748b;">DESCRIPCIÓN DEL SERVICIO</div>
            <div style="margin-top: 0.5rem;">${area.description || 'Sin descripción disponible para este departamento médico.'}</div>
          </div>

          ${area.specialties && area.specialties.length > 0 ? `
            <div style="margin-bottom: 1.5rem;">
              <div style="font-size: 0.75rem; font-weight: 700; color: #64748b;">ESPECIALIDADES</div>
              <div style="display: flex; flex-wrap: wrap; gap: 0.5rem; margin-top: 0.5rem;">
                ${area.specialties.map(s => `<span class="badge badge-info" style="padding: 4px 12px;">${s}</span>`).join('')}
              </div>
            </div>
          ` : ''}

          ${subAreas.length > 0 ? `
            <div style="margin-bottom: 1.5rem;">
              <div style="font-size: 0.75rem; font-weight: 700; color: #64748b;">SUB-ÁREAS ASOCIADAS</div>
              <div style="display: flex; flex-wrap: wrap; gap: 0.5rem; margin-top: 0.5rem;">
                ${subAreas.map(sa => `
                  <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 0.5rem 1rem; display: flex; align-items: center; gap: 0.5rem;">
                    <div style="width: 8px; height: 8px; border-radius: 50%; background: ${sa.color || '#2196F3'};">&nbsp;</div>
                    <span>${sa.name}</span>
                  </div>
                `).join('')}
              </div>
            </div>
          ` : ''}

          ${area.notes ? `
            <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 1rem;">
              <div style="font-size: 0.75rem; font-weight: 700; color: #92400e;">NOTAS</div>
              <div style="margin-top: 0.25rem;">${area.notes}</div>
            </div>
          ` : ''}
        </div>
        
        <div class="modal-footer">
          <button class="btn-circle btn-circle-view" id="view-doctors-btn" title="Ver Equipo Médico" style="background-color: var(--themePrimary);">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          </button>
          <button class="btn-circle btn-circle-cancel" id="close-view-area" title="Cerrar">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    const closeHandler = () => modal.remove();
    modal.querySelector('.close-modal').onclick = closeHandler;
    modal.querySelector('#close-view-area').onclick = closeHandler;
    modal.onclick = (e) => { if (e.target === modal) closeHandler(); };
    
    // Botón para ver médicos en el footer
    const viewDoctorsBtn = modal.querySelector('#view-doctors-btn');
    if (viewDoctorsBtn) {
      viewDoctorsBtn.onclick = () => {
        closeHandler();
        viewAreaDoctors(area);
      };
    }
  }

  function setupEventListeners() {
    function debounce(func, wait) {
      let timeout;
      return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
      };
    }

    if (elements.filterSearch) {
      elements.filterSearch.addEventListener('input', debounce((e) => {
        state.filters.search = e.target.value;
        state.currentPage = 1;
        loadAreas();
      }, 300));
    }

    if (elements.pagination) {
      elements.pagination.addEventListener('click', handlePagination);
    }

    if (elements.areasList) {
      elements.areasList.addEventListener('click', handleListAction);
    }
  }

  function handlePagination(event) {
    const button = event.target.closest('button[data-page]');
    if (!button) return;

    const pageAction = button.dataset.page;
    const totalPages = Math.ceil(state.areas.length / state.itemsPerPage);

    switch (pageAction) {
      case 'prev':
        if (state.currentPage > 1) {
          state.currentPage--;
          renderAreasList();
        }
        break;
      case 'next':
        if (state.currentPage < totalPages) {
          state.currentPage++;
          renderAreasList();
        }
        break;
      default:
        const pageNum = parseInt(pageAction);
        if (!isNaN(pageNum)) {
          state.currentPage = pageNum;
          renderAreasList();
        }
    }
  }

  function handleListAction(event) {
    const button = event.target.closest('button[data-action]');
    if (!button) return;

    const action = button.dataset.action;
    const areaId = button.dataset.id;
    const area = store.find('areas', areaId);

    if (action === 'view' && area) {
      viewArea(area);
    }
  }

  const unsubscribe = init();

  return {
    refresh: loadAreas,
    destroy() {
      if (unsubscribe) unsubscribe();
    }
  };
}