document.addEventListener('DOMContentLoaded', function() {
    // Elementos da interface
    const searchBar = document.querySelector('.search-bar');
    const searchInput = document.querySelector('.search-bar input');
    const searchIcon = document.querySelector('.search-bar i');
    const categories = document.querySelectorAll('.category');
    const viewToggleButtons = document.querySelectorAll('.view-toggle button');
    const slideGrid = document.querySelector('.slide-grid');
    const sideMenu = document.getElementById('offcanvasMenu');

    // Inicializa componentes
    initializeComponents();

    // Configura eventos
    setupSearchBar();
    setupCategoryFilter();
    setupViewToggle();
    setupThemeSwitch();
    setupDrawer();

    function initializeComponents() {
        // Verifica se há tema salvo no localStorage
        if (localStorage.getItem('theme') === 'dark') {
            document.body.classList.add('dark-theme');
            const themeSwitch = document.querySelector('.theme-switch');
            if (themeSwitch) {
                themeSwitch.innerHTML = '<i class="fas fa-sun"></i>';
            }
        }
    }

    function setupSearchBar() {
        if (!searchBar || !searchInput || !searchIcon) return;

        // Toggle da barra de pesquisa em dispositivos móveis
        searchIcon.addEventListener('click', function(event) {
            if (window.innerWidth <= 992) {
                searchBar.classList.toggle('search-active');
                if (searchBar.classList.contains('search-active')) {
                    searchInput.focus();
                    searchInput.value = '';
                    filterSlides('');
                } else {
                    searchInput.blur();
                    searchInput.value = '';
                    filterSlides('');
                }
                event.stopPropagation();
            }
        });

        // Fecha a barra de pesquisa ao clicar fora
        document.addEventListener('click', function(event) {
            if (window.innerWidth <= 992 && !searchBar.contains(event.target)) {
                searchBar.classList.remove('search-active');
                searchInput.value = '';
                filterSlides('');
            }
        });

        searchBar.addEventListener('click', function(event) {
            event.stopPropagation();
        });

        // Pesquisa em tempo real
        searchInput.addEventListener('input', function() {
            const searchTerm = this.value.toLowerCase().trim();
            filterSlides(searchTerm);
        });

        // Pesquisa ao pressionar Enter
        searchInput.addEventListener('keypress', function(event) {
            if (event.key === 'Enter') {
                event.preventDefault();
                const searchTerm = this.value.toLowerCase().trim();
                filterSlides(searchTerm);
                showNotification('Pesquisa realizada!', 'success');
            }
        });
    }

    function filterSlides(searchTerm) {
        const activeCategory = document.querySelector('.category.active').textContent.trim();
        document.querySelectorAll('.slide-card').forEach(card => {
            const title = card.querySelector('.slide-title').textContent.toLowerCase();
            const description = card.querySelector('.slide-description').textContent.toLowerCase();
            const instructor = card.querySelector('.instructor-name').textContent.toLowerCase();
            const category = card.querySelector('.slide-category-tag').textContent.toLowerCase();
            const tags = Array.from(card.querySelectorAll('.slide-tag')).map(tag => tag.textContent.toLowerCase());

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

            const matchesSearch = searchTerm === '' ||
                title.includes(searchTerm) ||
                description.includes(searchTerm) ||
                instructor.includes(searchTerm) ||
                category.includes(matchedCategory) ||
                tags.some(tag => tag.includes(searchTerm));

            const matchesCategory = activeCategory === 'Todos' || 
                (() => {
                    const cardCategory = card.querySelector('.slide-category-tag').textContent.trim();
                    const categoryMap = {
                        'I.A': ['I.A'],
                        'Modelagem a Banco de Dados': ['Banco de Dados'],
                        'Programação Android': ['Android'],
                        'Projeto Multidisciplinar': ['Multidisciplinar'],
                        'Versionamento': ['Versionamento']
                    };
                    const matchedCategories = categoryMap[activeCategory] || [activeCategory];
                    return matchedCategories.includes(cardCategory);
                })();

            if (matchesSearch && matchesCategory) {
                card.style.display = 'block';
            } else {
                card.style.display = 'none';
            }
        });
    }

    function setupCategoryFilter() {
        categories.forEach(category => {
            category.addEventListener('click', function() {
                categories.forEach(c => c.classList.remove('active'));
                this.classList.add('active');

                const categoryName = this.textContent.trim();
                document.querySelectorAll('.slide-card').forEach(card => {
                    const cardCategory = card.querySelector('.slide-category-tag').textContent.trim();
                    const categoryMap = {
                        'I.A': ['I.A'],
                        'Modelagem a Banco de Dados': ['Banco de Dados'],
                        'Programação Android': ['Android'],
                        'Projeto Multidisciplinar': ['Multidisciplinar'],
                        'Versionamento': ['Versionamento']
                    };

                    if (categoryName === 'Todos') {
                        card.style.display = 'block';
                    } else {
                        const matchedCategories = categoryMap[categoryName] || [categoryName];
                        if (matchedCategories.includes(cardCategory)) {
                            card.style.display = 'block';
                        } else {
                            card.style.display = 'none';
                        }
                    }
                });

                // Limpa a pesquisa ao mudar de categoria
                if (searchInput) {
                    searchInput.value = '';
                    searchBar.classList.remove('search-active');
                }
                showNotification(`Filtrando por ${categoryName}`, 'success');
            });
        });
    }

    function setupViewToggle() {
        if (!viewToggleButtons || !slideGrid) return;

        viewToggleButtons.forEach(button => {
            button.addEventListener('click', function() {
                viewToggleButtons.forEach(b => b.classList.remove('active'));
                this.classList.add('active');

                if (this.querySelector('i').classList.contains('fa-list')) {
                    slideGrid.style.gridTemplateColumns = '1fr';
                    slideGrid.querySelectorAll('.slide-card').forEach(card => {
                        card.style.display = 'flex';
                        const thumbnail = card.querySelector('.slide-thumbnail');
                        if (thumbnail) thumbnail.style.width = '280px';
                        const slideInfo = card.querySelector('.slide-info');
                        if (slideInfo) slideInfo.style.flex = '1';
                    });
                    showNotification('Visualização em lista ativada', 'info');
                } else {
                    slideGrid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(300px, 1fr))';
                    slideGrid.querySelectorAll('.slide-card').forEach(card => {
                        card.style.display = 'block';
                        const thumbnail = card.querySelector('.slide-thumbnail');
                        if (thumbnail) thumbnail.style.width = 'auto';
                    });
                    showNotification('Visualização em grade ativada', 'info');
                }
            });
        });
    }

    function setupThemeSwitch() {
        const themeSwitch = document.createElement('div');
        themeSwitch.classList.add('theme-switch');
        themeSwitch.innerHTML = '<i class="fas fa-moon"></i>';
        document.body.appendChild(themeSwitch);

        if (localStorage.getItem('theme') === 'dark') {
            document.body.classList.add('dark-theme');
            themeSwitch.innerHTML = '<i class="fas fa-sun"></i>';
        }

        themeSwitch.addEventListener('click', function() {
            document.body.classList.toggle('dark-theme');
            const isDark = document.body.classList.contains('dark-theme');
            localStorage.setItem('theme', isDark ? 'dark' : 'light');
            themeSwitch.innerHTML = isDark ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
            showNotification(isDark ? 'Tema escuro ativado' : 'Tema claro ativado', 'success');
        });
    }

    function setupDrawer() {
        if (!sideMenu) return;

        const drawerLinks = document.querySelectorAll('.offcanvas .nav-link');
        if (drawerLinks && drawerLinks.length > 0) {
            // Remove active class from all links
            drawerLinks.forEach(link => {
                link.classList.remove('active');
            });

            // Find and activate the "Materiais de Estudo" link
            const materialsLink = Array.from(drawerLinks).find(link => 
                link.getAttribute('href').includes('materiais') || 
                link.textContent.includes('Materiais de Estudo')
            );
            if (materialsLink) {
                materialsLink.classList.add('active');
            }

            // Add click event listeners to close the drawer
            drawerLinks.forEach(link => {
                link.addEventListener('click', function() {
                    const bsOffcanvas = bootstrap.Offcanvas.getInstance(sideMenu);
                    if (bsOffcanvas) bsOffcanvas.hide();
                });
            });
        }

        document.addEventListener('click', function(event) {
            const isClickInsideDrawer = sideMenu.contains(event.target);
            const isClickOnToggler = event.target.closest('.menu-btn');
            const isOffcanvasOpen = sideMenu.classList.contains('show');

            if (!isClickInsideDrawer && !isClickOnToggler && isOffcanvasOpen) {
                const bsOffcanvas = bootstrap.Offcanvas.getInstance(sideMenu);
                if (bsOffcanvas) bsOffcanvas.hide();
            }
        });

        sideMenu.addEventListener('shown.bs.offcanvas', function() {
            document.body.style.overflow = 'hidden';
            document.body.style.paddingRight = '0';
            sideMenu.style.top = '0';
            sideMenu.style.height = '100vh';
        });

        sideMenu.addEventListener('hidden.bs.offcanvas', function() {
            document.body.style.overflow = '';
            document.body.style.paddingRight = '';
        });
    }

    function showNotification(message, type) {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <div class="notification-message">${message}</div>
            </div>
            <button class="notification-close"><i class="fas fa-times"></i></button>
        `;
        document.body.appendChild(notification);

        setTimeout(() => notification.classList.add('show'), 100);

        notification.querySelector('.notification-close').addEventListener('click', () => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        });

        setTimeout(() => {
            if (notification.parentNode) {
                notification.classList.remove('show');
                setTimeout(() => notification.remove(), 300);
            }
        }, 4000);
    }
});