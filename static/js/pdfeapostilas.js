document.addEventListener('DOMContentLoaded', function() {
    const searchBar = document.querySelector('.search-bar');
    const searchInput = document.querySelector('.search-bar input');
    const searchIcon = document.querySelector('.search-bar i');
    const categories = document.querySelectorAll('.category');
    const viewToggleButtons = document.querySelectorAll('.view-toggle button');
    const pdfGrid = document.querySelector('#pdf-grid');
    const sideMenu = document.getElementById('offcanvasMenu');

    initializeComponents();
    setupSearchBar();
    setupCategoryFilter();
    setupViewToggle();
    setupThemeSwitch();
    setupDrawer();
    loadPdfs();

    function initializeComponents() {
        if (localStorage.getItem('theme') === 'dark') {
            document.body.classList.add('dark-theme');
            const themeSwitch = document.querySelector('.theme-switch');
            if (themeSwitch) {
                themeSwitch.innerHTML = '<i class="fas fa-sun"></i>';
            }
        }
    }

    async function loadPdfs() {
        try {
            const response = await fetch('/data/pdfs.json');
            if (!response.ok) throw new Error('Erro ao carregar o arquivo JSON');
            const pdfs = await response.json();
            renderPdfs(pdfs);
        } catch (error) {
            console.error('Erro ao carregar PDFs:', error);
            showNotification('Erro ao carregar os PDFs', 'danger');
        }
    }

    function renderPdfs(pdfs) {
        pdfGrid.innerHTML = '';
        pdfs.forEach(pdf => {
            const card = document.createElement('div');
            card.className = 'pdf-card';
            card.innerHTML = `
                <div class="pdf-thumbnail">
                    <a href="${pdf.file_path}" target="_blank" download>
                        <img src="${pdf.thumbnail}" alt="Thumbnail do PDF">
                    </a>
                    <div class="pdf-category-tag">${pdf.category}</div>
                    <div class="pdf-icon">
                        <i class="fas fa-file-pdf"></i>
                    </div>
                </div>
                <div class="pdf-info">
                    <h3 class="pdf-title">
                        <a href="${pdf.file_path}" target="_blank" download style="text-decoration: none; color: inherit;">
                            ${pdf.title}
                        </a>
                    </h3>
                    <div class="pdf-meta">
                        <div class="author">
                            <span class="author-name">${pdf.author}</span>
                        </div>
                        <div class="pdf-stats">
                            <span><i class="fas fa-eye"></i> ${pdf.views}</span>
                            <span><i class="fas fa-download"></i> ${pdf.downloads}</span>
                        </div>
                    </div>
                    <p class="pdf-description">${pdf.description}</p>
                    <div class="pdf-tags">
                        ${pdf.tags.map(tag => `<span class="pdf-tag">${tag}</span>`).join('')}
                    </div>
                </div>
            `;
            pdfGrid.appendChild(card);
        });
    }

    function setupSearchBar() {
        if (!searchBar || !searchInput || !searchIcon) return;

        searchIcon.addEventListener('click', function(event) {
            if (window.innerWidth <= 992) {
                searchBar.classList.toggle('search-active');
                if (searchBar.classList.contains('search-active')) {
                    searchInput.focus();
                    searchInput.value = '';
                    filterPdfs('');
                } else {
                    searchInput.blur();
                    searchInput.value = '';
                    filterPdfs('');
                }
                event.stopPropagation();
            }
        });

        document.addEventListener('click', function(event) {
            if (window.innerWidth <= 992 && !searchBar.contains(event.target)) {
                searchBar.classList.remove('search-active');
                searchInput.value = '';
                filterPdfs('');
            }
        });

        searchBar.addEventListener('click', function(event) {
            event.stopPropagation();
        });

        searchInput.addEventListener('input', function() {
            const searchTerm = this.value.toLowerCase().trim();
            filterPdfs(searchTerm);
        });

        searchInput.addEventListener('keypress', function(event) {
            if (event.key === 'Enter') {
                event.preventDefault();
                const searchTerm = this.value.toLowerCase().trim();
                filterPdfs(searchTerm);
                showNotification('Pesquisa realizada!', 'success');
            }
        });
    }

    function filterPdfs(searchTerm) {
        const activeCategory = document.querySelector('.category.active').textContent.trim();
        document.querySelectorAll('.pdf-card').forEach(card => {
            const title = card.querySelector('.pdf-title').textContent.toLowerCase();
            const description = card.querySelector('.pdf-description').textContent.toLowerCase();
            const author = card.querySelector('.author-name').textContent.toLowerCase();
            const category = card.querySelector('.pdf-category-tag').textContent.toLowerCase();
            const tags = Array.from(card.querySelectorAll('.pdf-tag')).map(tag => tag.textContent.toLowerCase());

            const searchCategoryMap = {
                'banco de dados': 'banco de dados',
                'Estudo': 'Estudo',
                'linguagens': 'linguagens de programação',
                'redes': 'redes',
                'redes neurais': 'redes neurais',
                'sql': 'banco de dados',
                'python': 'linguagens de programação',
                'java': 'linguagens de programação',
                'processadores': 'Estudo',
                'compiladores': 'Estudo',
                'redes de computadores': 'redes',
                'ia': 'redes neurais'
            };

            const matchedCategory = searchCategoryMap[searchTerm] || searchTerm;

            const matchesSearch = searchTerm === '' ||
                title.includes(searchTerm) ||
                description.includes(searchTerm) ||
                author.includes(searchTerm) ||
                category.includes(matchedCategory) ||
                tags.some(tag => tag.includes(searchTerm));

            const matchesCategory = activeCategory === 'Todos' || 
                card.querySelector('.pdf-category-tag').textContent.trim() === activeCategory;

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
                document.querySelectorAll('.pdf-card').forEach(card => {
                    const cardCategory = card.querySelector('.pdf-category-tag').textContent.trim();
                    if (categoryName === 'Todos' || cardCategory === categoryName) {
                        card.style.display = 'block';
                    } else {
                        card.style.display = 'none';
                    }
                });

                if (searchInput) {
                    searchInput.value = '';
                    searchBar.classList.remove('search-active');
                }
                showNotification(`Filtrando por ${categoryName}`, 'success');
            });
        });
    }

    function setupViewToggle() {
        if (!viewToggleButtons || !pdfGrid) return;

        viewToggleButtons.forEach(button => {
            button.addEventListener('click', function() {
                viewToggleButtons.forEach(b => b.classList.remove('active'));
                this.classList.add('active');

                if (this.querySelector('i').classList.contains('fa-list')) {
                    pdfGrid.style.gridTemplateColumns = '1fr';
                    pdfGrid.querySelectorAll('.pdf-card').forEach(card => {
                        card.style.display = 'flex';
                        const thumbnail = card.querySelector('.pdf-thumbnail');
                        if (thumbnail) thumbnail.style.width = '280px';
                        const pdfInfo = card.querySelector('.pdf-info');
                        if (pdfInfo) pdfInfo.style.flex = '1';
                    });
                    showNotification('Visualização em lista ativada', 'info');
                } else {
                    pdfGrid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(300px, 1fr))';
                    pdfGrid.querySelectorAll('.pdf-card').forEach(card => {
                        card.style.display = 'block';
                        const thumbnail = card.querySelector('.pdf-thumbnail');
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
            drawerLinks.forEach(link => {
                link.classList.remove('active');
            });

            const pdfsLink = Array.from(drawerLinks).find(link => 
                link.getAttribute('href').includes('pdfs') || 
                link.textContent.includes('PDFs e Apostilas')
            );
            if (pdfsLink) {
                pdfsLink.classList.add('active');
            }

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