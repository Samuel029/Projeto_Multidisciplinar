const studyMaterials = [
    {
        title: "Introdução à Inteligência Artificial",
        category: "IA",
        description: "Aprenda os conceitos básicos de IA, incluindo aprendizado de máquina e redes neurais.",
        level: "Iniciante",
        downloadLink: "#"
    },
    {
        title: "Deep Learning com TensorFlow",
        category: "IA",
        description: "Guia prático para construir modelos de deep learning usando TensorFlow.",
        level: "Avançado",
        downloadLink: "#"
    },
    {
        title: "SQL para Iniciantes",
        category: "Banco de Dados",
        description: "Domine os fundamentos de SQL para gerenciamento de bancos de dados relacionais.",
        level: "Iniciante",
        downloadLink: "#"
    },
    {
        title: "Otimização de Consultas SQL",
        category: "Banco de Dados",
        description: "Técnicas avançadas para melhorar a performance de consultas em bancos de dados.",
        level: "Avançado",
        downloadLink: "#"
    },
    {
        title: "HTML e CSS: Construindo Interfaces",
        category: "Front-end",
        description: "Crie interfaces modernas e responsivas com HTML5 e CSS3.",
        level: "Iniciante",
        downloadLink: "#"
    },
    {
        title: "JavaScript Avançado",
        category: "Front-end",
        description: "Explore recursos avançados de JavaScript, incluindo ES6+ e assincronismo.",
        level: "Intermediário",
        downloadLink: "#"
    },
    {
        title: "Node.js para Back-end",
        category: "Back-end",
        description: "Desenvolva APIs robustas com Node.js e Express.",
        level: "Intermediário",
        downloadLink: "#"
    },
    {
        title: "Segurança em APIs REST",
        category: "Back-end",
        description: "Boas práticas para proteger APIs REST contra ameaças comuns.",
        level: "Avançado",
        downloadLink: "#"
    },
    {
        title: "Resolvendo Dúvidas de Programação",
        category: "Dúvidas Gerais",
        description: "Guia com respostas para as dúvidas mais comuns em programação.",
        level: "Iniciante",
        downloadLink: "#"
    },
    {
        title: "Planejamento de Carreira em TI",
        category: "Carreiras",
        description: "Estratégias para construir uma carreira de sucesso na área de tecnologia.",
        level: "Iniciante",
        downloadLink: "#"
    },
    {
        title: "Modelagem de Dados com UML",
        category: "Modelagem a Banco de Dados",
        description: "Aprenda a criar diagramas UML para modelagem de bancos de dados.",
        level: "Intermediário",
        downloadLink: "#"
    },
    {
        title: "Lógica de Programação com Python",
        category: "Lógica",
        description: "Fundamentos de lógica de programação usando Python como base.",
        level: "Iniciante",
        downloadLink: "#"
    },
    {
        title: "Gerenciamento de Processos com BPMN",
        category: "Processos",
        description: "Utilize BPMN para modelar e otimizar processos de negócios.",
        level: "Intermediário",
        downloadLink: "#"
    },
    {
        title: "Desenvolvimento Android com Kotlin",
        category: "Programação Android",
        description: "Crie aplicativos Android modernos usando Kotlin.",
        level: "Intermediário",
        downloadLink: "#"
    },
    {
        title: "Projetos Multidisciplinares em TI",
        category: "Projeto Multidisciplinar",
        description: "Guia para integrar múltiplas disciplinas em projetos de TI.",
        level: "Avançado",
        downloadLink: "#"
    },
    {
        title: "Fundamentos de Redes de Computadores",
        category: "Redes",
        description: "Conceitos essenciais de redes, incluindo TCP/IP e configuração de roteadores.",
        level: "Iniciante",
        downloadLink: "#"
    },
    {
        title: "Git e GitHub para Versionamento",
        category: "Versionamento",
        description: "Domine o controle de versão com Git e GitHub.",
        level: "Iniciante",
        downloadLink: "#"
    }
];

function renderStudyMaterials(materials) {
    const container = document.getElementById('study-materials');
    container.innerHTML = '';

    materials.forEach(material => {
        const card = document.createElement('div');
        card.classList.add('study-card');
        card.dataset.category = material.category;

        card.innerHTML = `
            <div class="study-card-header">
                <i class="fas fa-book"></i>
                <h2 class="study-card-title">${material.title}</h2>
            </div>
            <div class="study-card-content">
                <p>${material.description}</p>
            </div>
            <div class="study-card-footer">
                <span class="level">${material.level}</span>
                <a href="${material.downloadLink}" class="download-btn" target="_blank">Baixar</a>
            </div>
        `;

        card.addEventListener('click', () => openModal(material));
        container.appendChild(card);
    });
}

function openModal(material) {
    const modal = document.getElementById('material-modal');
    document.getElementById('modal-title').textContent = material.title;
    document.getElementById('modal-description').textContent = material.description;
    document.getElementById('modal-level').textContent = material.level;
    document.getElementById('modal-category').textContent = material.category;
    document.getElementById('modal-download').href = material.downloadLink;
    modal.style.display = 'flex';
}

function closeModal() {
    const modal = document.getElementById('material-modal');
    modal.style.display = 'none';
}

document.getElementById('category-filter').addEventListener('change', (e) => {
    const selectedCategory = e.target.value;
    const filteredMaterials = selectedCategory
        ? studyMaterials.filter(material => material.category === selectedCategory)
        : studyMaterials;
    renderStudyMaterials(filteredMaterials);
});

document.getElementById('close-modal').addEventListener('click', closeModal);

window.addEventListener('click', (e) => {
    const modal = document.getElementById('material-modal');
    if (e.target === modal) {
        closeModal();
    }
});

// Initial render
renderStudyMaterials(studyMaterials);