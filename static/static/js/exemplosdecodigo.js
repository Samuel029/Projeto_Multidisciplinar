document.addEventListener('DOMContentLoaded', function () {
    const codeTabs = document.querySelectorAll('.code-tab');
    const searchBar = document.querySelector('.search-bar');
    const searchInput = document.querySelector('#searchInput');
    const searchIcon = document.querySelector('.search-bar i');
    const sideMenu = document.getElementById('offcanvasMenu');

    setupTabSwitching();
    setupSearchBar();
    setupOffcanvasMenu();

    function setupTabSwitching() {
        codeTabs.forEach(tab => {
            tab.addEventListener('click', function () {
                const section = this.closest('.code-section');
                section.querySelectorAll('.code-tab').forEach(t => t.classList.remove('active'));
                this.classList.add('active');

                const lang = this.getAttribute('data-lang');
                section.querySelectorAll('.code-block').forEach(block => {
                    block.style.display = block.getAttribute('data-lang') === lang ? 'block' : 'none';
                });

                showNotification(`Exibindo código em ${this.textContent}`, 'success');
            });
        });
    }

    function normalizeText(text) {
        return text
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/\s+/g, ' ')
            .trim();
    }

    function setupSearchBar() {
        if (!searchBar || !searchInput || !searchIcon) return;

        searchIcon.addEventListener('click', function (event) {
            if (window.innerWidth <= 992) {
                searchBar.classList.toggle('search-active');
                if (searchBar.classList.contains('search-active')) {
                    searchInput.focus();
                } else {
                    searchInput.blur();
                    searchInput.value = '';
                    filterCodeBlocks('');
                }
                event.stopPropagation();
            }
        });

        document.addEventListener('click', function (event) {
            if (window.innerWidth <= 992 && !searchBar.contains(event.target)) {
                searchBar.classList.remove('search-active');
                searchInput.value = '';
                filterCodeBlocks('');
            }
        });

        searchBar.addEventListener('click', function (event) {
            event.stopPropagation();
        });

        searchInput.addEventListener('input', function () {
            const searchTerm = normalizeText(this.value);
            filterCodeBlocks(searchTerm);
        });
    }

    function filterCodeBlocks(searchTerm) {
        const codeSections = document.querySelectorAll('.code-section');
        let visibleSections = 0;

        codeSections.forEach(section => {
            const codeBlocks = section.querySelectorAll('.code-block');
            let visibleBlocks = 0;

            codeBlocks.forEach(block => {
                const codeContent = normalizeText(block.querySelector('pre').textContent);
                const lang = block.getAttribute('data-lang');
                const matchesSearch = searchTerm === '' || codeContent.includes(searchTerm) || lang.includes(searchTerm);

                if (matchesSearch) {
                    block.style.display = '';
                    visibleBlocks++;
                } else {
                    block.style.display = 'none';
                }
            });

            section.style.display = visibleBlocks > 0 ? '' : 'none';
            if (visibleBlocks > 0) visibleSections++;
        });

        if (visibleSections === 0 && searchTerm) {
            showNotification('Nenhum exemplo encontrado.', 'info');
        }
    }

    function setupOffcanvasMenu() {
        if (!sideMenu) return;

        const drawerLinks = document.querySelectorAll('.offcanvas .nav-link');
        drawerLinks.forEach(link => {
            link.addEventListener('click', function () {
                const bsOffcanvas = bootstrap.Offcanvas.getInstance(sideMenu);
                if (bsOffcanvas) bsOffcanvas.hide();
            });
        });

        sideMenu.addEventListener('shown.bs.offcanvas', function () {
            document.body.style.overflow = 'hidden';
        });

        sideMenu.addEventListener('hidden.bs.offcanvas', function () {
            document.body.style.overflow = '';
        });
    }

    window.copyCode = function (button) {
        const codeBlock = button.closest('.code-block').querySelector('pre').textContent;
        navigator.clipboard.writeText(codeBlock).then(() => {
            showNotification('Código copiado com sucesso!', 'success');
        }).catch(() => {
            showNotification('Erro ao copiar código', 'error');
        });
    };

    window.showNotification = function (message, type) {
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
        setTimeout(() => {
            if (notification.parentNode) {
                notification.classList.remove('show');
                setTimeout(() => notification.remove(), 300);
            }
        }, 4000);

        notification.querySelector('.notification-close').addEventListener('click', () => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        });
    };
});