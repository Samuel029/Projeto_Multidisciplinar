document.addEventListener('DOMContentLoaded', function() {
    // Elementos da interface
    const searchBar = document.querySelector('.search-bar');
    const searchInput = document.querySelector('.search-bar input');
    const searchIcon = document.querySelector('.search-bar i');
    const categories = document.querySelectorAll('.category');
    const postForm = document.getElementById('postForm');
    const postTextarea = document.querySelector('textarea[name="content"]');
    const charCounter = document.querySelector('.char-counter');
    const sideMenu = document.getElementById('offcanvasMenu');
    const deleteButtons = document.querySelectorAll('.delete-post');
    const likeButtons = document.querySelectorAll('.like-btn');
    const commentButtons = document.querySelectorAll('.comment-btn');

    // Inicializa componentes
    initializeComponents();

    // Configura eventos
    setupSearchBar();
    setupCategoryFilter();
    setupPostForm();
    setupDeleteButtons();
    setupLikeButtons();
    setupCommentButtons();
    setupThemeSwitch();
    setupDrawer();

    function initializeComponents() {
        // Carrega likes salvos
        likeButtons.forEach(btn => {
            const postId = btn.closest('.post-card').dataset.postId;
            const savedLikes = localStorage.getItem(`likes_${postId}`) || 0;
            btn.querySelector('.like-count').textContent = savedLikes;
            if (localStorage.getItem(`liked_${postId}`)) {
                btn.classList.add('active');
            }
        });
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
                    filterPosts('');
                } else {
                    searchInput.blur();
                    searchInput.value = '';
                    filterPosts('');
                }
                event.stopPropagation();
            }
        });

        // Fecha a barra de pesquisa ao clicar fora
        document.addEventListener('click', function(event) {
            if (window.innerWidth <= 992 && !searchBar.contains(event.target)) {
                searchBar.classList.remove('search-active');
                searchInput.value = '';
                filterPosts('');
            }
        });

        searchBar.addEventListener('click', function(event) {
            event.stopPropagation();
        });

        // Pesquisa em tempo real
        searchInput.addEventListener('input', function() {
            const searchTerm = this.value.toLowerCase().trim();
            filterPosts(searchTerm);
        });

        // Pesquisa ao pressionar Enter
        searchInput.addEventListener('keypress', function(event) {
            if (event.key === 'Enter') {
                event.preventDefault();
                const searchTerm = this.value.toLowerCase().trim();
                filterPosts(searchTerm);
                showNotification('Pesquisa realizada!', 'success');
            }
        });
    }

    function filterPosts(searchTerm) {
        const activeCategory = document.querySelector('.category.active').textContent.trim();
        document.querySelectorAll('.post-card').forEach(card => {
            const content = card.querySelector('.post-content p').textContent.toLowerCase();
            const username = card.querySelector('.username').textContent.toLowerCase();
            const category = card.dataset.category.toLowerCase();

            const searchCategoryMap = {
                'ia': 'i.a',
                'i.a': 'i.a',
                'banco de dados': 'banco de dados',
                'frontend': 'front-end',
                'front-end': 'front-end',
                'backend': 'back-end',
                'back-end': 'back-end',
                'programacao': 'programação',
                'carreiras': 'carreiras',
                'duvidas gerais': 'dúvidas gerais'
            };

            const matchedCategory = searchCategoryMap[searchTerm] || searchTerm;

            const matchesSearch = searchTerm === '' ||
                content.includes(searchTerm) ||
                username.includes(searchTerm) ||
                category.includes(matchedCategory);

            const matchesCategory = activeCategory === 'Todas' || card.dataset.category === activeCategory;

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
                document.querySelectorAll('.post-card').forEach(card => {
                    const cardCategory = card.dataset.category.trim();
                    if (categoryName === 'Todas' || cardCategory === categoryName) {
                        card.style.display = 'block';
                    } else {
                        card.style.display = 'none';
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

    function setupPostForm() {
        if (!postForm || !postTextarea || !charCounter) return;

        postTextarea.addEventListener('input', function() {
            const maxLength = 500;
            const currentLength = this.value.length;
            charCounter.textContent = `${currentLength}/${maxLength}`;
            charCounter.classList.toggle('limit', currentLength > maxLength * 0.8);

            if (currentLength > maxLength) {
                this.value = this.value.substring(0, maxLength);
                charCounter.textContent = `${maxLength}/${maxLength}`;
                showNotification('Limite de caracteres atingido', 'error');
            }
        });

        postTextarea.dispatchEvent(new Event('input'));

        postForm.addEventListener('submit', function(e) {
            if (postTextarea.value.trim() === '') {
                e.preventDefault();
                showNotification('Digite algo para publicar', 'error');
                postTextarea.focus();
            } else {
                showNotification('Postagem publicada com sucesso!', 'success');
            }
        });
    }

    function setupDeleteButtons() {
        deleteButtons.forEach(button => {
            button.addEventListener('click', function() {
                const postId = this.dataset.postId;
                if (confirm('Tem certeza que deseja deletar esta postagem?')) {
                    fetch(`/delete_post/${postId}`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        }
                    })
                    .then(response => response.json())
                    .then(data => {
                        if (data.status === 'success') {
                            document.querySelector(`.post-card[data-post-id="${postId}"]`).remove();
                            showNotification('Postagem deletada com sucesso!', 'success');
                        } else {
                            showNotification('Erro ao deletar postagem.', 'error');
                        }
                    })
                    .catch(() => {
                        showNotification('Erro ao conectar com o servidor.', 'error');
                    });
                }
            });
        });
    }

    function setupLikeButtons() {
        likeButtons.forEach(button => {
            button.addEventListener('click', function() {
                const postId = this.closest('.post-card').dataset.postId;
                const likeCountSpan = this.querySelector('.like-count');
                let likeCount = parseInt(likeCountSpan.textContent);

                if (this.classList.contains('active')) {
                    likeCount--;
                    this.classList.remove('active');
                    localStorage.removeItem(`liked_${postId}`);
                    showNotification('Like removido', 'info');
                } else {
                    likeCount++;
                    this.classList.add('active');
                    localStorage.setItem(`liked_${postId}`, 'true');
                    showNotification('Postagem curtida!', 'success');
                }

                likeCountSpan.textContent = likeCount;
                localStorage.setItem(`likes_${postId}`, likeCount);
            });
        });
    }

    function setupCommentButtons() {
        commentButtons.forEach(button => {
            button.addEventListener('click', function() {
                const postId = this.closest('.post-card').dataset.postId;
                showNotification('Funcionalidade de comentários em desenvolvimento', 'info');
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
        const drawerLinks = document.querySelectorAll('.offcanvas .nav-link');
        drawerLinks.forEach(link => {
            link.addEventListener('click', function() {
                const bsOffcanvas = bootstrap.Offcanvas.getInstance(sideMenu) || new bootstrap.Offcanvas(sideMenu);
                if (bsOffcanvas) bsOffcanvas.hide();
            });
        });

        document.addEventListener('click', function(event) {
            const isClickInsideDrawer = sideMenu.contains(event.target);
            const isClickOnToggler = event.target.closest('.menu-btn');
            const isOffcanvasOpen = sideMenu.classList.contains('show');

            if (!isClickInsideDrawer && !isClickOnToggler && isOffcanvasOpen) {
                const bsOffcanvas = bootstrap.Offcanvas.getInstance(sideMenu) || new bootstrap.Offcanvas(sideMenu);
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