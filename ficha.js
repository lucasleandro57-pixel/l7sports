// ===== CONFIGURAÇÕES GLOBAIS =====
const STORAGE_KEY = 'l7_treino_pacientes';

// ===== VARIÁVEIS GLOBAIS =====
let currentPatient = null;
let currentFilter = 'all';

// ===== FUNÇÕES DE ARMAZENAMENTO =====

/**
 * Carrega a lista de pacientes do localStorage
 */
function loadPatients() {
    try {
        const data = localStorage.getItem(STORAGE_KEY);
        return data ? JSON.parse(data) : [];
    } catch (error) {
        console.error('Erro ao carregar pacientes:', error);
        return [];
    }
}

/**
 * Busca um paciente por ID
 */
function getPatientById(patientId) {
    const patients = loadPatients();
    return patients.find(p => p.id === patientId);
}

// ===== FUNÇÕES DE INTERFACE =====

/**
 * Mostra o estado de carregamento
 */
function showLoadingState() {
    document.getElementById('loading-state').style.display = 'block';
    document.getElementById('error-state').style.display = 'none';
    document.getElementById('workout-content').style.display = 'none';
}

/**
 * Mostra o estado de erro
 */
function showErrorState() {
    document.getElementById('loading-state').style.display = 'none';
    document.getElementById('error-state').style.display = 'block';
    document.getElementById('workout-content').style.display = 'none';
}

/**
 * Mostra o conteúdo da ficha
 */
function showWorkoutContent() {
    document.getElementById('loading-state').style.display = 'none';
    document.getElementById('error-state').style.display = 'none';
    document.getElementById('workout-content').style.display = 'block';
}

/**
 * Renderiza as informações do paciente
 */
function renderPatientInfo(patient) {
    // Nome do paciente
    const patientNameElement = document.getElementById('patient-name');
    patientNameElement.querySelector('span').textContent = patient.nome;
    
    // Local da Lesão
    const patientLocationElement = document.getElementById('patient-location');
    const locationDisplay = patient.localLesao 
        ? patient.localLesao.charAt(0).toUpperCase() + patient.localLesao.slice(1) // Capitaliza a primeira letra
        : 'Não Informado';
    patientLocationElement.innerHTML = `
        <strong>Local da Lesão:</strong>
        <span class="location-tag">${locationDisplay}</span>
    `;
    
    // Focos de treino
    const patientFocusElement = document.getElementById('patient-focus');
    const focusTags = patient.focoTreino.map(foco => 
        `<span class="focus-tag">${foco}</span>`
    ).join('');
    
    patientFocusElement.innerHTML = `
        <strong>Foco do Treino:</strong>
        <div class="focus-tags">
            ${focusTags}
        </div>
    `;
}

/**
 * Renderiza os botões de filtro
 */
function renderFilterButtons(patientFocus) {
    const filterButtonsContainer = document.getElementById('filter-buttons');
    
    // Botão "Todos"
    let buttonsHTML = `
        <button class="filter-btn active" data-filter="all">
            <i class="fas fa-th"></i>
            Todos
        </button>
    `;
    
    // Botões para cada foco do paciente
    const focusIcons = {
        'Mobilidade': 'fas fa-expand-arrows-alt',
        'Estabilidade': 'fas fa-balance-scale',
        'Mobilidade sobre Estabilidade': 'fas fa-sync-alt',
        'Potencia': 'fas fa-bolt',
        'Força': 'fas fa-dumbbell',
        'Habilidade': 'fas fa-running'
    };
    
    patientFocus.forEach(foco => {
        const icon = focusIcons[foco] || 'fas fa-dumbbell';
        buttonsHTML += `
            <button class="filter-btn" data-filter="${foco}">
                <i class="${icon}"></i>
                ${foco}
            </button>
        `;
    });
    
    filterButtonsContainer.innerHTML = buttonsHTML;
    
    // Adicionar event listeners aos botões
    const filterButtons = filterButtonsContainer.querySelectorAll('.filter-btn');
    filterButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Remover classe active de todos os botões
            filterButtons.forEach(btn => btn.classList.remove('active'));
            
            // Adicionar classe active ao botão clicado
            this.classList.add('active');
            
            // Atualizar filtro atual
            currentFilter = this.dataset.filter;
            
            // Filtrar exercícios
            filterExercises();
        });
    });
}

/**
 * Cria um card de exercício
 */
function createExerciseCard(exercise) {
    const card = document.createElement('div');
    card.className = 'exercise-card';
    card.dataset.focus = exercise.foco;
    
    card.innerHTML = `
        <div class="exercise-video">
            <iframe 
                src="${exercise.videoUrl}" 
                title="${exercise.nome}"
                frameborder="0" 
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                allowfullscreen>
            </iframe>
        </div>
        <div class="exercise-info">
            <h3 class="exercise-title">${exercise.nome}</h3>
            <span class="exercise-focus">${exercise.foco}</span>
            <p class="exercise-description">${exercise.descricao}</p>
            <div class="exercise-details">
                <div class="detail-item">
                    <i class="fas fa-clock"></i>
                    <span>${exercise.duracao}</span>
                </div>
                <div class="detail-item">
                    <i class="fas fa-signal"></i>
                    <span>${exercise.dificuldade}</span>
                </div>
                <div class="detail-item">
                    <i class="fas fa-tools"></i>
                    <span>${exercise.equipamentos}</span>
                </div>
            </div>
        </div>
    `;
    
    return card;
}

/**
 * Renderiza os exercícios divididos por categorias (Carrossel Horizontal)
 */
function renderExercises(allFilteredExercises) {
    const container = document.getElementById('exercise-grid'); // Usamos o mesmo container pai
    const emptyExercises = document.getElementById('empty-exercises');
    
    // Limpar tudo antes de começar
    container.innerHTML = '';
    
    if (allFilteredExercises.length === 0) {
        container.style.display = 'none';
        emptyExercises.style.display = 'block';
        return;
    }

    container.style.display = 'block';
    emptyExercises.style.display = 'none';

    // A ordem exata que você pediu
    const categoriasOrdem = [
        "Mobilidade", 
        "Estabilidade", 
        "Mobilidade sobre Estabilidade", 
        "Força", 
        "Potencia", // Sem acento no código se o ID for sem acento
        "Habilidade",
        "Velocidade" // Adicionei velocidade caso use
    ];

    // Para cada categoria, criamos uma seção
    categoriasOrdem.forEach(categoria => {
        // Filtra os exercícios dessa categoria específica
        const exerciciosDaCategoria = allFilteredExercises.filter(ex => ex.foco === categoria);

        // Só desenha a seção se tiver exercícios nela
        if (exerciciosDaCategoria.length > 0) {
            
            // 1. Cria o Título da Seção
            const sectionTitle = document.createElement('h3');
            sectionTitle.className = 'category-title';
            sectionTitle.textContent = categoria; // O nome que aparece na tela
            
            // 2. Cria o Container de Rolagem Horizontal
            const scrollContainer = document.createElement('div');
            scrollContainer.className = 'horizontal-scroll';

            // 3. Adiciona os Cards dentro do Container
            exerciciosDaCategoria.forEach(exercise => {
                const card = createExerciseCard(exercise);
                scrollContainer.appendChild(card);
            });

            // 4. Cria a Seção completa e adiciona na tela
            const sectionWrapper = document.createElement('div');
            sectionWrapper.className = 'category-section';
            
            sectionWrapper.appendChild(sectionTitle);
            sectionWrapper.appendChild(scrollContainer);
            
            container.appendChild(sectionWrapper);
        }
    });
}

/**
 * Filtra os exercícios baseado no filtro atual
 */
function filterExercises() {
    let exercises;
    
    // O filtro principal agora usa a nova função de filtro duplo
    const focusArray = currentFilter === 'all' ? currentPatient.focoTreino : [currentFilter];
    const injuryLocation = currentPatient.localLesao;
    
    // Usar a nova função de filtro que considera Foco E Local da Lesão
    exercises = getExercisesByFocusAndLocation(focusArray, injuryLocation);
    
    renderExercises(exercises);
    
    console.log(`Filtro aplicado: ${currentFilter} (Local: ${injuryLocation}), Exercícios encontrados: ${exercises.length}`);
}

// ===== FUNÇÕES DE AÇÃO =====

/**
 * Edita o paciente atual
 */
function editPatient() {
    if (currentPatient) {
        localStorage.setItem('editPatientId', currentPatient.id);
        window.location.href = 'cadastro.html?edit=' + currentPatient.id;
    }
}

/**
 * Volta para a lista de pacientes
 */
function goBack() {
    window.location.href = 'index.html';
}

// ===== INICIALIZAÇÃO =====

/**
 * Carrega os dados do paciente selecionado
 */
function loadPatientData() {
    const selectedPatientId = localStorage.getItem('selectedPatientId');
    
    if (!selectedPatientId) {
        console.error('Nenhum paciente selecionado');
        showErrorState();
        return false;
    }
    
    const patient = getPatientById(selectedPatientId);
    
    if (!patient) {
        console.error('Paciente não encontrado:', selectedPatientId);
        showErrorState();
        return false;
    }
    
    currentPatient = patient;
    console.log('Paciente carregado:', patient);
    // O ID selecionado será limpo na próxima inicialização da página index.html
    // localStorage.removeItem('selectedPatientId');
    return true;
}

/**
 * Inicializa a página de ficha de treino
 */
function initializeWorkoutPage() {
    console.log('=== L7 SPORTS TREINO - FICHA DE TREINO INICIADA ===');
    
    // Mostrar estado de carregamento
    showLoadingState();
    
    // Simular carregamento
    setTimeout(() => {
        // Carregar dados do paciente
        if (!loadPatientData()) {
            return;
        }
        
        // Renderizar informações do paciente
        renderPatientInfo(currentPatient);
        
        // Renderizar botões de filtro
        renderFilterButtons(currentPatient.focoTreino);
        
        // Carregar exercícios iniciais (todos os exercícios do paciente)
        filterExercises();
        
        // Mostrar conteúdo da ficha
        showWorkoutContent();
        
        console.log('=== INICIALIZAÇÃO COMPLETA ===');
    }, 1000);
}

/**
 * Inicialização quando o DOM estiver pronto
 */
document.addEventListener('DOMContentLoaded', function() {
    // Verificar se a base de dados de exercícios está disponível
    if (typeof EXERCISES_DATABASE === 'undefined') {
        console.error('Base de dados de exercícios não encontrada!');
        showErrorState();
        return;
    }
    
    initializeWorkoutPage();
});

// ===== FUNÇÕES GLOBAIS (para compatibilidade com HTML) =====
window.editPatient = editPatient;
window.goBack = goBack;

/**
 * Função auxiliar para filtrar exercícios (Adicionada diretamente aqui para evitar erros)
 */
function getExercisesByFocusAndLocation(foco, local) {
    // Verifica se a base de dados existe
    if (typeof getAllExercises !== 'function') {
        console.error("Erro: Banco de dados de exercícios não carregado.");
        return [];
    }

    const todosExercicios = getAllExercises();
    const localNormalizado = local ? local.toLowerCase() : "";
    
    return todosExercicios.filter(ex => {
        // 1. Filtra por FOCO (Array ou String única)
        // Se foco for um array (["Força", "Mobilidade"]), verifica se inclui. Se for string, compara direto.
        const exFoco = ex.foco; 
        let matchFoco = false;
        
        if (Array.isArray(foco)) {
            matchFoco = foco.includes(exFoco);
        } else {
            matchFoco = exFoco === foco;
        }
        
        if (!matchFoco) return false;

        // 2. Filtra por LOCAL da lesão (Logica inteligente)
        const id = ex.id.toLowerCase();
        let matchLocal = false;

        if (localNormalizado === "tornozelo") {
            matchLocal = id.includes("tornozelo") || id.includes("fascite");
        } else if (localNormalizado === "joelho") {
            matchLocal = id.includes("patelar") || id.includes("quadriceps") || id.includes("posterior");
        } else if (localNormalizado === "ombro") {
            matchLocal = id.includes("manguito");
        } else if (localNormalizado === "coluna") {
            matchLocal = id.includes("lombar");
        } else if (localNormalizado === "quadril") {
            matchLocal = id.includes("quadril");
        } else {
            matchLocal = true; // Se não tiver local específico ou for outro, mostra
        }

        return matchLocal;
    });
}
