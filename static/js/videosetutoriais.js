document.addEventListener('DOMContentLoaded', function() {
    // Funcionalidade para seleção de categorias
    const categories = document.querySelectorAll('.category');

    categories.forEach(category => {
        category.addEventListener('click', function() {
            categories.forEach(c => c.classList.remove('active'));
            this.classList.add('active');

            const categoryName = this.textContent.trim();
            if (categoryName === 'Todos') {
                document.querySelectorAll('.video-card').forEach(card => {
                    card.style.display = 'block';
                });
            } else {
                document.querySelectorAll('.video-card').forEach(card => {
                    const cardCategory = card.querySelector('.video-category-tag').textContent.trim();
                    const categoryMap = {
                        'I.A': ['I.A'],
                        'Modelagem a Banco de Dados': ['Banco de Dados'],
                        'Programação Android': ['Android'],
                        'Projeto Multidisciplinar': ['Multidisciplinar'],
                        'Versionamento': ['Versionamento']
                    };

                    const matchedCategories = categoryMap[categoryName] || [categoryName];
                    if (matchedCategories.includes(cardCategory)) {
                        card.style.display = 'block';
                    } else {
                        card.style.display = 'none';
                    }
                });
            }
        });
    });

    // Toggle de visualização (grid/lista)
    const viewToggleButtons = document.querySelectorAll('.view-toggle button');
    const videoGrid = document.querySelector('.video-grid');

    viewToggleButtons.forEach(button => {
        button.addEventListener('click', function() {
            viewToggleButtons.forEach(b => b.classList.remove('active'));
            this.classList.add('active');

            if (this.querySelector('i').classList.contains('fa-list')) {
                videoGrid.style.gridTemplateColumns = '1fr';
                videoGrid.querySelectorAll('.video-card').forEach(card => {
                    card.style.display = 'flex';
                    card.querySelector('.video-thumbnail').style.width = '280px';
                    card.querySelector('.video-info').style.flex = '1';
                });
            } else {
                videoGrid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(300px, 1fr))';
                videoGrid.querySelectorAll('.video-card').forEach(card => {
                    card.style.display = 'block';
                    card.querySelector('.video-thumbnail').style.width = 'auto';
                });
            }
        });
    });

    // Funcionalidade de pesquisa
    const searchBar = document.querySelector('.search-bar');
    const searchInput = document.querySelector('.search-bar input');
    const searchIcon = document.querySelector('.search-bar i');

    searchIcon.addEventListener('click', function(event) {
        if (window.innerWidth <= 992) {
            searchBar.classList.toggle('search-active');
            if (searchBar.classList.contains('search-active')) {
                searchInput.focus();
            } else {
                searchInput.blur();
            }
            event.stopPropagation();
        }
    });

    // Fechar a barra de pesquisa ao clicar fora dela
    document.addEventListener('click', function(event) {
        if (window.innerWidth <= 992 && !searchBar.contains(event.target)) {
            searchBar.classList.remove('search-active');
        }
    });

    // Evitar que cliques na própria barra de pesquisa a fechem
    searchBar.addEventListener('click', function(event) {
        event.stopPropagation();
    });

    searchInput.addEventListener('input', function() {
        const searchTerm = this.value.toLowerCase().trim();

        document.querySelectorAll('.video-card').forEach(card => {
            const title = card.querySelector('.video-title').textContent.toLowerCase();
            const description = card.querySelector('.video-description').textContent.toLowerCase();
            const instructor = card.querySelector('.instructor-name').textContent.toLowerCase();
            const category = card.querySelector('.video-category-tag').textContent.toLowerCase();
            const tags = Array.from(card.querySelectorAll('.video-tag')).map(tag => tag.textContent.toLowerCase());

            // Mapear termos de pesquisa para categorias
            const searchCategoryMap = {
                'versionamento': 'versionamento',
                'ia': 'i.a',
                'i.a': 'i.a',
                'banco de dados': 'banco de dados',
                'modelagem a banco de dados': 'banco de dados',
                'logica': 'lógica',
                'processos': 'processos',
                'frontend': 'front-end',
                'front-end': 'front-end',
                'backend': 'back-end',
                'back-end': 'back-end',
                'android': 'android',
                'programação android': 'android',
                'multidisciplinar': 'multidisciplinar',
                'projeto multidisciplinar': 'multidisciplinar',
                'carreiras': 'carreiras',
                'redes': 'redes'
            };

            const matchedCategory = searchCategoryMap[searchTerm] || searchTerm;

            if (title.includes(searchTerm) ||
                description.includes(searchTerm) ||
                instructor.includes(searchTerm) ||
                category.includes(matchedCategory) ||
                tags.some(tag => tag.includes(searchTerm))) {
                card.style.display = 'block';
            } else {
                card.style.display = 'none';
            }
        });
    });
});