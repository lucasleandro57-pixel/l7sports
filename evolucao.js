// VARIÁVEIS GLOBAIS
let allPatients = [];
let charts = {};
let pacienteAtualId = null;

// ===== INICIALIZAÇÃO =====
document.addEventListener('DOMContentLoaded', function() {
    loadPatients();
});

function loadPatients() {
    const data = localStorage.getItem('l7_treino_pacientes');
    allPatients = data ? JSON.parse(data) : [];
    renderPatientList();
}

// ===== NAVEGAÇÃO =====
function irParaAdicionarDados() {
    if (pacienteAtualId) {
        localStorage.setItem('select_paciente_existente_pre', pacienteAtualId);
        window.location.href = 'cadastro.html'; 
    } else {
        alert("Erro: Nenhum paciente selecionado.");
    }
}

function voltarParaLista() {
    pacienteAtualId = null;
    document.getElementById('dashboard-view').style.display = 'none';
    document.getElementById('patient-list-view').style.display = 'block';
    const searchInput = document.getElementById('search-patient');
    if(searchInput) { searchInput.value = ''; filtrarPacientes(); }
}

// ===== FILTROS E LISTA =====
function filtrarPacientes() {
    const termo = document.getElementById('search-patient').value.toLowerCase();
    const grid = document.getElementById('patients-grid');
    const cards = grid.getElementsByClassName('patient-card');
    let encontrouAlgum = false;
    Array.from(cards).forEach(card => {
        const nomePaciente = card.getElementsByTagName('h3')[0].textContent.toLowerCase();
        if (nomePaciente.includes(termo)) { card.style.display = "flex"; encontrouAlgum = true; } 
        else { card.style.display = "none"; }
    });
    const noMsg = document.getElementById('no-patients-msg');
    noMsg.style.display = (!encontrouAlgum && allPatients.length > 0) ? 'block' : 'none';
    if(allPatients.length === 0) noMsg.style.display = 'block';
}

function excluirPaciente(id, event) {
    event.stopPropagation();
    if (confirm("Tem certeza que deseja excluir este paciente? Todos os dados e histórico serão apagados permanentemente.")) {
        allPatients = allPatients.filter(p => p.id !== id);
        localStorage.setItem('l7_treino_pacientes', JSON.stringify(allPatients));
        renderPatientList();
        alert("Paciente excluído com sucesso!");
    }
}

function renderPatientList() {
    const grid = document.getElementById('patients-grid');
    const noMsg = document.getElementById('no-patients-msg');
    grid.innerHTML = '';
    if (allPatients.length === 0) { noMsg.style.display = 'block'; return; } else { noMsg.style.display = 'none'; }

    allPatients.sort((a, b) => {
        const dateA = new Date(a.ultimaAvaliacao?.data || a.dataCadastro || 0);
        const dateB = new Date(b.ultimaAvaliacao?.data || b.dataCadastro || 0);
        return dateB - dateA;
    });

    allPatients.forEach(p => {
        const card = document.createElement('div');
        card.className = 'patient-card';
        card.onclick = () => abrirDashboard(p.id);

        const dataUltima = p.ultimaAvaliacao?.data ? new Date(p.ultimaAvaliacao.data).toLocaleDateString('pt-BR', {timeZone: 'UTC'}) : 'Sem dados';
        const lesao = p.localLesao || p.lesao || 'Geral';
        const focos = p.focoTreino || [];
        let focosHtml = '';
        if (focos.length > 0) focos.forEach(foco => focosHtml += `<span class="tag-box">${foco}</span>`);
        else focosHtml = `<span class="tag-box" style="opacity:0.5">Em avaliação</span>`;

        card.innerHTML = `
            <div style="position: absolute; top: 1rem; right: 1rem; z-index: 10;">
                <button onclick="excluirPaciente('${p.id}', event)" style="background: rgba(255,0,0,0.1); border: 1px solid rgba(255,0,0,0.3); color: #ff6b6b; width: 32px; height: 32px; border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s;">
                    <i class="fas fa-trash-alt" style="font-size: 0.9rem;"></i>
                </button>
            </div>
            <div class="card-header">
                <div class="card-avatar" style="padding: 0; overflow: hidden; background: transparent; box-shadow: none;">
                    <img src="assets/logo-site.png" alt="L7" style="width: 100%; height: 100%; object-fit: contain;">
                </div>
                <div class="card-info">
                    <h3>${p.nome}</h3>
                    <p>Última: ${dataUltima}</p>
                </div>
            </div>
            <div class="lesion-container"><span class="lesion-badge"><i class="fas fa-bone"></i> ${lesao}</span></div>
            <div class="focos-container">${focosHtml}</div>
            <div class="card-action"><i class="fas fa-chart-line"></i> Ver Evolução</div>
        `;
        grid.appendChild(card);
    });
}

// ===== DASHBOARD =====
function abrirDashboard(patientId) {
    const paciente = allPatients.find(p => p.id === patientId);
    if (!paciente) return;
    pacienteAtualId = patientId;

    document.getElementById('dash-patient-name').textContent = paciente.nome;
    const lesao = paciente.localLesao || paciente.lesao || 'Geral';
    document.getElementById('dash-lesion-area').innerHTML = `<span class="lesion-badge"><i class="fas fa-bone"></i> ${lesao}</span>`;
    const focos = paciente.focoTreino || [];
    let focosHtml = '';
    focos.forEach(foco => focosHtml += `<span class="tag-box">${foco}</span>`);
    document.getElementById('dash-tags-container').innerHTML = focosHtml;

    document.getElementById('patient-list-view').style.display = 'none';
    document.getElementById('dashboard-view').style.display = 'block';
    renderizarGraficos(paciente);
}

function renderizarGraficos(paciente) {
    let historico = paciente.historicoAvaliacoes || [];
    if (historico.length === 0 && paciente.ultimaAvaliacao) {
        historico = [{ data: paciente.dataCadastro, ...paciente.ultimaAvaliacao }];
    }
    historico.sort((a, b) => new Date(a.data) - new Date(b.data));

    const labels = historico.map(h => {
        if (!h.data) return '?';
        const parts = h.data.split('-'); 
        return `${parts[2]}/${parts[1]}`;
    });
    
    // DECISÃO MMII ou MMSS
    const lesao = (paciente.localLesao || '').toLowerCase();
    const lesoesMMSS = ['ombro', 'cotovelo', 'punho', 'coluna', 'superior', 'braço'];
    const lesoesMMII = ['joelho', 'tornozelo', 'quadril', 'pé', 'perna', 'inferior'];

    let isMMSS = false; // Padrão MMII

    if (lesoesMMSS.some(l => lesao.includes(l))) {
        isMMSS = true;
    } else if (lesoesMMII.some(l => lesao.includes(l))) {
        isMMSS = false;
    } else {
        const temDadosMMSS = historico.some(h => (h.ySupE > 0 || h.ySupD > 0 || h.mcc > 0 || h.gonioFlexMmss > 0 || h.scoreY_MmssE > 0));
        if (temDadosMMSS) isMMSS = true;
    }

    const ROXO_NEON = '#8B5CF6'; 
    const ROXO_ESCURO = '#6D28D9'; 
    const ROXO_MEDIO = '#7C3AED'; 
    // const BRANCO = '#ffffff'; // REMOVIDO, AGORA USAMOS ROXO

    let graficosParaRenderizar = [];

    if (isMMSS) {
        // --- MMSS ---
        const dataYE = historico.map(h => h.scoreY_MmssE || calcularScoreY(h.crMmssE, h.yMedialE, h.yInfLatE, h.ySupLatE));
        if (dataYE.some(v => v > 0)) {
            graficosParaRenderizar.push({ title: 'Y-Test Superior ESQUERDO (%)', datasets: [{ label: 'Esq', data: dataYE, color: ROXO_NEON }] });
        }

        const dataYD = historico.map(h => h.scoreY_MmssD || calcularScoreY(h.crMmssD, h.yMedialD, h.yInfLatD, h.ySupLatD));
        if (dataYD.some(v => v > 0)) {
            graficosParaRenderizar.push({ title: 'Y-Test Superior DIREITO (%)', datasets: [{ label: 'Dir', data: dataYD, color: ROXO_ESCURO }] });
        }

        const dataMCC = historico.map(h => h.mcc || 0);
        if (dataMCC.some(v => v > 0)) {
            graficosParaRenderizar.push({ title: 'MCC (Repetições)', datasets: [{ label: 'Reps', data: dataMCC, color: ROXO_MEDIO }] });
        }

        const dataFlex = historico.map(h => h.gonioFlexMmss || 0);
        if (dataFlex.some(v => v > 0)) {
            graficosParaRenderizar.push({ title: 'Flexão de Ombro (Graus)', datasets: [{ label: 'Flexão', data: dataFlex, color: ROXO_NEON }] });
        }

        const dataAbd = historico.map(h => h.gonioAbdMmss || 0);
        if (dataAbd.some(v => v > 0)) {
            graficosParaRenderizar.push({ title: 'Abdução de Ombro (Graus)', datasets: [{ label: 'Abdução', data: dataAbd, color: ROXO_ESCURO }] });
        }

        // Gráfico EVA MMSS
        const dataEVA = historico.map(h => h.evaMmss || 0);
        if (historico.length > 0) {
            // CORREÇÃO: Usei ROXO_NEON em vez de BRANCO
            graficosParaRenderizar.push({ title: 'Escala de Dor (EVA 0-10)', datasets: [{ label: 'Dor', data: dataEVA, color: ROXO_NEON }] });
        }

    } else {
        // --- MMII ---
        const dataHopE = historico.map(h => h.hopE || 0);
        if (dataHopE.some(v => v > 0)) {
            graficosParaRenderizar.push({ title: 'Hop Test ESQUERDO (cm)', datasets: [{ label: 'Esq', data: dataHopE, color: ROXO_NEON }] });
        }

        const dataHopD = historico.map(h => h.hopD || 0);
        if (dataHopD.some(v => v > 0)) {
            graficosParaRenderizar.push({ title: 'Hop Test DIREITO (cm)', datasets: [{ label: 'Dir', data: dataHopD, color: ROXO_ESCURO }] });
        }

        const dataYE = historico.map(h => h.scoreY_MmiiE || calcularScoreY(h.crMmiiE, h.yAntE, h.yPmE, h.yPlE));
        if (dataYE.some(v => v > 0)) {
            graficosParaRenderizar.push({ title: 'Y-Test Inferior ESQUERDO (%)', datasets: [{ label: 'Esq', data: dataYE, color: ROXO_NEON }] });
        }

        const dataYD = historico.map(h => h.scoreY_MmiiD || calcularScoreY(h.crMmiiD, h.yAntD, h.yPmD, h.yPlD));
        if (dataYD.some(v => v > 0)) {
            graficosParaRenderizar.push({ title: 'Y-Test Inferior DIREITO (%)', datasets: [{ label: 'Dir', data: dataYD, color: ROXO_ESCURO }] });
        }

        const dataCMJ = historico.map(h => h.cmj || 0);
        const dataSJ = historico.map(h => h.sj || 0);
        
        if (dataCMJ.some(v => v > 0) || dataSJ.some(v => v > 0)) {
            const pluginElasticidade = {
                id: 'elasticidadeLine',
                afterDatasetsDraw: (chart) => {
                    const { ctx } = chart;
                    if (chart.data.datasets.length < 2) return;
                    const metaCMJ = chart.getDatasetMeta(0);
                    const metaSJ = chart.getDatasetMeta(1);
                    ctx.save();
                    ctx.font = 'bold 10px Inter, sans-serif';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    metaCMJ.data.forEach((barCMJ, index) => {
                        const barSJ = metaSJ.data[index];
                        if (barCMJ && barSJ && !metaCMJ.hidden && !metaSJ.hidden) {
                            const valCMJ = chart.data.datasets[0].data[index];
                            const valSJ = chart.data.datasets[1].data[index];
                            if (valCMJ > 0 && valSJ > 0) {
                                ctx.beginPath();
                                ctx.moveTo(barCMJ.x, barCMJ.y);
                                ctx.lineTo(barSJ.x, barSJ.y);
                                ctx.strokeStyle = '#ffffff';
                                ctx.lineWidth = 2;
                                ctx.stroke();
                                ctx.fillStyle = '#ffffff';
                                ctx.beginPath(); ctx.arc(barCMJ.x, barCMJ.y, 4, 0, Math.PI*2); ctx.fill();
                                ctx.beginPath(); ctx.arc(barSJ.x, barSJ.y, 4, 0, Math.PI*2); ctx.fill();
                                const diff = ((valCMJ - valSJ) / valSJ) * 100;
                                const text = diff.toFixed(1) + '%';
                                const midX = (barCMJ.x + barSJ.x) / 2;
                                const midY = (barCMJ.y + barSJ.y) / 2;
                                const textWidth = ctx.measureText(text).width;
                                ctx.fillStyle = 'rgba(0,0,0,0.8)';
                                ctx.fillRect(midX - (textWidth/2) - 3, midY - 7, textWidth + 6, 14);
                                ctx.fillStyle = '#ffffff';
                                ctx.fillText(text, midX, midY);
                            }
                        }
                    });
                    ctx.restore();
                }
            };

            graficosParaRenderizar.push({
                title: 'Potência de Salto (cm)',
                datasets: [{ label: 'CMJ', data: dataCMJ, color: ROXO_NEON }, { label: 'SJ', data: dataSJ, color: ROXO_ESCURO }],
                plugins: [pluginElasticidade]
            });
        }

        // Gráfico EVA MMII
        const dataEVA = historico.map(h => h.evaMmii || 0);
        if (historico.length > 0) {
            // CORREÇÃO: Usei ROXO_NEON em vez de BRANCO
            graficosParaRenderizar.push({ title: 'Escala de Dor (EVA 0-10)', datasets: [{ label: 'Dor', data: dataEVA, color: ROXO_NEON }] });
        }
    }

    // Renderiza
    for (let i = 0; i < 6; i++) {
        const cardId = `card-${i + 1}`;
        const canvasId = `chart${i + 1}`;
        const tituloId = `titulo-grafico-${i + 1}`;
        const cardElement = document.getElementById(cardId);
        if (i < graficosParaRenderizar.length) {
            const config = graficosParaRenderizar[i];
            if(cardElement) cardElement.style.display = 'block';
            criarGrafico(canvasId, tituloId, config.title, labels, config.datasets, config.plugins || []);
        } else {
            if(cardElement) cardElement.style.display = 'none';
        }
    }
}

function calcularScoreY(cr, v1, v2, v3) { return (cr > 0 && v1 > 0 && v2 > 0 && v3 > 0) ? Math.round(((v1 + v2 + v3) / (3 * cr)) * 100) : 0; }

function criarGrafico(canvasId, titleId, titleText, labels, datasets, extraPlugins = []) {
    const titleEl = document.getElementById(titleId); if(titleEl) titleEl.textContent = titleText;
    const ctx = document.getElementById(canvasId).getContext('2d');
    if (charts[canvasId]) charts[canvasId].destroy();

    const drawValuesPlugin = {
        id: 'drawValues',
        afterDatasetsDraw: (chart) => {
            const { ctx } = chart;
            ctx.save();
            ctx.font = 'bold 11px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'bottom'; 
            
            const isPercent = titleText.includes('(%)');

            chart.data.datasets.forEach((dataset, i) => {
                const meta = chart.getDatasetMeta(i);
                if(meta.hidden) return;
                meta.data.forEach((bar, index) => {
                    const value = dataset.data[index];
                    if(value !== undefined && value !== null) { 
                        ctx.fillStyle = '#ffffff';
                        const text = isPercent ? value + '%' : value;
                        ctx.fillText(text, bar.x, bar.base - 5); 
                    }
                });
            });
            ctx.restore();
        }
    };

    charts[canvasId] = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: datasets.map(ds => ({
                label: ds.label,
                data: ds.data,
                backgroundColor: ds.color,
                borderRadius: 6,
                barPercentage: 0.6
            }))
        },
        plugins: [drawValuesPlugin, ...extraPlugins], 
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: datasets.length > 1, labels: { color: '#ccc' } } },
            scales: {
                y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#888' }, beginAtZero: true },
                x: { grid: { display: false }, ticks: { color: '#888' } }
            }
        }
    });
}