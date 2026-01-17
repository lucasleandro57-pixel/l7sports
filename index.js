document.addEventListener('DOMContentLoaded', function() {
    loadHomePatients();
});

let allHomePatients = [];

function loadHomePatients() {
    try {
        const data = localStorage.getItem('l7_treino_pacientes');
        allHomePatients = data ? JSON.parse(data) : [];
        renderHomeList();
    } catch (e) {
        console.error("Erro ao carregar pacientes:", e);
    }
}

// ===== FUNÇÃO DE FILTRO (PESQUISA) =====
function filtrarHome() {
    const termo = document.getElementById('search-home').value.toLowerCase();
    const grid = document.getElementById('patients-grid');
    const cards = grid.getElementsByClassName('patient-card');
    let encontrou = false;

    Array.from(cards).forEach(card => {
        const nome = card.getElementsByTagName('h3')[0].textContent.toLowerCase();
        if (nome.includes(termo)) {
            card.style.display = 'flex';
            encontrou = true;
        } else {
            card.style.display = 'none';
        }
    });

    const emptyState = document.getElementById('empty-state');
    if (!encontrou && allHomePatients.length > 0) {
        emptyState.style.display = 'block';
        emptyState.querySelector('p').textContent = `Nenhum paciente encontrado para "${termo}"`;
    } else if (allHomePatients.length === 0) {
        emptyState.style.display = 'block';
        emptyState.querySelector('p').textContent = "Nenhum paciente cadastrado.";
    } else {
        emptyState.style.display = 'none';
    }
}

// ===== FUNÇÃO DE EXCLUIR PACIENTE (NOVA) =====
function excluirPaciente(id, event) {
    // Impede que o clique no botão abra o card do paciente
    event.stopPropagation(); 

    if (confirm("Tem certeza que deseja excluir este paciente? Todos os dados e histórico serão apagados permanentemente.")) {
        // Remove do array local
        allHomePatients = allHomePatients.filter(p => p.id !== id);
        
        // Atualiza o LocalStorage
        localStorage.setItem('l7_treino_pacientes', JSON.stringify(allHomePatients));
        
        // Atualiza a tela
        renderHomeList();
        
        alert("Paciente excluído com sucesso!");
    }
}

// ===== RENDERIZAÇÃO (Cards com Botão de Excluir) =====
function renderHomeList() {
    const grid = document.getElementById('patients-grid');
    const emptyState = document.getElementById('empty-state');
    
    grid.innerHTML = '';

    if (allHomePatients.length === 0) {
        emptyState.style.display = 'block';
        return;
    } else {
        emptyState.style.display = 'none';
    }

    // Ordena: Mais recentes primeiro
    allHomePatients.sort((a, b) => {
        const dateA = new Date(a.ultimaAvaliacao?.data || a.dataCadastro || 0);
        const dateB = new Date(b.ultimaAvaliacao?.data || b.dataCadastro || 0);
        return dateB - dateA;
    });

    allHomePatients.forEach(p => {
        const card = document.createElement('div');
        card.className = 'patient-card';
        
        // Ao clicar no card, vai para a ficha
        card.onclick = () => {
             localStorage.setItem('selectedPatientId', p.id);
             window.location.href = 'ficha.html';
        };

        const dataUltima = p.ultimaAvaliacao?.data ? new Date(p.ultimaAvaliacao.data).toLocaleDateString('pt-BR', {timeZone: 'UTC'}) : 'Recém cadastrado';
        const lesao = p.localLesao || p.lesao || 'Geral';
        const focos = p.focoTreino || [];

        let focosHtml = '';
        if (focos.length > 0) {
            focos.forEach(foco => {
                focosHtml += `<span class="tag-box">${foco}</span>`;
            });
        } else {
            focosHtml = `<span class="tag-box" style="opacity:0.5">Em avaliação</span>`;
        }

        // HTML do Card (Com o botão de lixeira adicionado no topo direito)
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

            <div class="lesion-container">
                <span class="lesion-badge"><i class="fas fa-bone"></i> ${lesao}</span>
            </div>

            <div class="focos-container">
                ${focosHtml}
            </div>

            <div class="card-action">
                <i class="fas fa-dumbbell"></i> Ver Ficha de Treino
            </div>
        `;
        grid.appendChild(card);
    });
}