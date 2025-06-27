document.addEventListener('DOMContentLoaded', function() {
    const searchBar = document.querySelector('.search-bar');
    const searchInput = document.querySelector('.search-bar input');
    const searchIcon = document.querySelector('.search-bar i');
    const postForm = document.querySelector('.post-form');
    const postTextarea = document.querySelector('textarea[name="post_content"]');
    const charCounter = document.querySelector('.char-counter');
    const likeButtons = document.querySelectorAll('.like-btn');
    const deleteButtons = document.querySelectorAll('.delete-post');
    const categories = document.querySelectorAll('.category');
    const sideMenu = document.getElementById('offcanvasMenu');

    initializeComponents();
    setupSearchBar();
    setupPostForm();
    setupLikeButtons();
    setupDeleteButtons();
    setupCategoryFilter();
    setupDrawer();

    function initializeComponents() {
        likeButtons.forEach(btn => {
            const postId = btn.closest('.post-card').dataset.postId;
            fetch(`/get_post_likes/${postId}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            })
            .then(response => response.json())
            .then(data => {
                if (data.status === 'success') {
                    btn.querySelector('.like-count').textContent = data.like_count;
                    if (data.user_liked) {
                        btn.classList.add('active');
                    }
                }
            })
            .catch(error => console.error('Error fetching post likes:', error));
        });

        if (postTextarea && charCounter) {
            postTextarea.dispatchEvent(new Event('input'));
        }

        if (categories && categories.length > 0) {
            const activeCategory = localStorage.getItem('activeCategory') || 'Todas';
            categories.forEach(cat => {
                const catValue = cat.dataset.category;
                if (catValue === activeCategory) {
                    cat.classList.add('active');
                } else {
                    cat.classList.remove('active');
                }
            });
            filterPosts('');
        }
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

        searchIcon.addEventListener('click', function(event) {
            if (window.innerWidth <= 992) {
                searchBar.classList.toggle('search-active');
                if (searchBar.classList.contains('search-active')) {
                    searchInput.focus();
                    const urlParams = new URLSearchParams(window.location.search);
                    searchInput.value = urlParams.get('search') || '';
                } else {
                    searchInput.blur();
                    searchInput.value = '';
                }
                event.stopPropagation();
            }
        });

        document.addEventListener('click', function(event) {
            if (window.innerWidth <= 992 && !searchBar.contains(event.target)) {
                searchBar.classList.remove('search-active');
                searchInput.value = '';
            }
        });

        searchBar.addEventListener('click', function(event) {
            event.stopPropagation();
        });

        searchInput.addEventListener('input', function() {
            const searchTerm = normalizeText(this.value);
            filterPosts(searchTerm);
        });

        const urlParams = new URLSearchParams(window.location.search);
        const searchTerm = urlParams.get('search') || '';
        searchInput.value = searchTerm;
        if (searchTerm) {
            filterPosts(normalizeText(searchTerm));
            if (window.innerWidth <= 992) {
                searchBar.classList.add('search-active');
            }
        }
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

        postForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const content = postTextarea.value.trim();
            const category = postForm.querySelector('select[name="category"]').value;

            if (!content) {
                showNotification('O conteúdo da postagem não pode estar vazio', 'error');
                postTextarea.focus();
                return;
            }

            if (!category) {
                showNotification('Por favor, selecione uma categoria', 'error');
                postForm.querySelector('select[name="category"]').focus();
                return;
            }

            const submitButton = postForm.querySelector('button[type="submit"]');
            if (submitButton) {
                submitButton.disabled = true;
                submitButton.textContent = 'Publicando...';
            }

            fetch('/create_post', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: new URLSearchParams({
                    'post_content': content,
                    'category': category
                })
            })
            .then(response => response.json())
            .then(data => {
                if (data.status === 'success') {
                    showNotification('Postagem criada com sucesso!', 'success');
                    window.location.href = '/telainicial';
                } else {
                    showNotification(data.message || 'Erro ao criar postagem', 'error');
                }
            })
            .catch(error => {
                showNotification('Erro ao conectar com o servidor.', 'error');
                console.error('Error creating post:', error);
            })
            .finally(() => {
                if (submitButton) {
                    submitButton.disabled = false;
                    submitButton.textContent = 'Publicar';
                }
            });
        });
    }

    function setupLikeButtons() {
        if (!likeButtons || likeButtons.length === 0) return;

        likeButtons.forEach(button => {
            button.addEventListener('click', function() {
                const postId = this.dataset.postId;
                fetch(`/like_post/${postId}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                })
                .then(response => response.json())
                .then(data => {
                    if (data.status === 'success') {
                        this.querySelector('.like-count').textContent = data.likes;
                        if (data.liked) {
                            this.classList.add('active');
                            showNotification('Postagem curtida!', 'success');
                        } else {
                            this.classList.remove('active');
                            showNotification('Like removido', 'info');
                        }
                    } else {
                        showNotification(data.message || 'Erro ao curtir postagem.', 'error');
                    }
                })
                .catch(() => {
                    showNotification('Erro ao conectar com o servidor.', 'error');
                });
            });
        });
    }

    function setupDeleteButtons() {
        if (!deleteButtons || deleteButtons.length === 0) return;

        deleteButtons.forEach(button => {
            button.addEventListener('click', function() {
                const postId = this.dataset.postId;
                const postCard = this.closest('.post-card');
                if (confirm('Tem certeza que deseja deletar esta postagem?')) {
                    fetch(`/delete_post/${postId}`, {
                        method: 'DELETE',
                        headers: {
                            'Content-Type': 'application/json'
                        }
                    })
                    .then(response => response.json())
                    .then(data => {
                        if (data.status === 'success') {
                            postCard.remove();
                            showNotification('Postagem deletada com sucesso!', 'success');
                            const postList = document.querySelector('.post-list');
                            if (!postList.querySelector('.post-card')) {
                                postList.innerHTML = `
                                    <div class="empty-state-card">
                                        <div class="text-center py-3">
                                            <i class="fas fa-file-alt fa-2x mb-2 text-muted"></i>
                                            <p class="text-muted">Nenhuma postagem encontrada.</p>
                                        </div>
                                    </div>
                                `;
                            }
                        } else {
                            showNotification(data.message || 'Erro ao deletar postagem.', 'error');
                        }
                    })
                    .catch(() => {
                        showNotification('Erro ao conectar com o servidor.', 'error');
                    });
                }
            });
        });
    }

    function setupCategoryFilter() {
        if (!categories || categories.length === 0) return;

        categories.forEach(category => {
            category.addEventListener('click', function() {
                categories.forEach(cat => cat.classList.remove('active'));
                this.classList.add('active');
                const categoryName = this.dataset.category;
                localStorage.setItem('activeCategory', categoryName);
                filterPosts(normalizeText(searchInput.value));
                showNotification(`Filtrando por ${this.textContent.trim()}`, 'success');
            });
        });
    }

    function filterPosts(searchTerm) {
        const posts = document.querySelectorAll('.post-card');
        const activeCategory = document.querySelector('.category.active').dataset.category;
        let visiblePosts = 0;

        if (!posts || posts.length === 0) return;

        const searchCategoryMap = {
            'ia': 'ia',
            'banco de dados': 'banco de dados',
            'frontend': 'front-end',
            'front-end': 'front-end',
            'backend': 'back-end',
            'back-end': 'back-end',
            'programacao': 'programacao',
            'carreiras': 'carreiras',
            'duvidas gerais': 'duvidas gerais',
            'modelagem': 'modelagem a banco de dados',
            'modelagem de dados': 'modelagem a banco de dados',
            'modelagem a banco de dados': 'modelagem a banco de dados',
            'logica': 'logica',
            'processos': 'processos',
            'android': 'programacao android',
            'programacao android': 'programacao android',
            'multidisciplinar': 'projeto multidisciplinar',
            'projeto multidisciplinar': 'projeto multidisciplinar',
            'redes': 'redes',
            'versionamento': 'versionamento'
        };

        const normalizedSearchTerm = normalizeText(searchTerm);
        const mappedSearchTerm = searchCategoryMap[normalizedSearchTerm] || normalizedSearchTerm;

        posts.forEach(post => {
            const postContent = normalizeText(post.querySelector('.post-content p').textContent);
            const postCategory = normalizeText(post.dataset.category);
            const postUsername = normalizeText(post.querySelector('.username').textContent);
            const matchesSearch = searchTerm === '' ||
                postContent.includes(mappedSearchTerm) ||
                postUsername.includes(mappedSearchTerm) ||
                postCategory.includes(mappedSearchTerm);
            const matchesCategory = activeCategory === 'Todas' || postCategory === normalizeText(activeCategory);

            if (matchesSearch && matchesCategory) {
                post.style.display = '';
                visiblePosts++;
            } else {
                post.style.display = 'none';
            }
        });

        const postList = document.querySelector('.post-list');
        const emptyState = postList.querySelector('.empty-state-card');

        if (visiblePosts === 0 && !emptyState) {
            const emptyStateDiv = document.createElement('div');
            emptyStateDiv.className = 'empty-state-card';
            emptyStateDiv.innerHTML = `
                <div class="text-center py-3">
                    <i class="fas fa-file-alt fa-2x mb-2 text-muted"></i>
                    <p class="text-muted">Nenhuma postagem encontrada.</p>
                </div>
            `;
            postList.appendChild(emptyStateDiv);
        } else if (visiblePosts > 0 && emptyState) {
            emptyState.remove();
        }
    }

    function setupDrawer() {
        if (!sideMenu) return;

        const drawerLinks = document.querySelectorAll('.offcanvas .nav-link');
        if (drawerLinks && drawerLinks.length > 0) {
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

    window.showNotification = function(message, type) {
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
    };
});