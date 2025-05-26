document.addEventListener('DOMContentLoaded', function() {
    // Elementos da interface
    const searchBar = document.querySelector('.search-bar');
    const searchInput = document.querySelector('.search-bar input');
    const searchIcon = document.querySelector('.search-bar i');
    const categories = document.querySelectorAll('.category');
    const postForm = document.getElementById('postForm');
    const postTextarea = document.querySelector('textarea[name="content"]');
    const charCounter = document.querySelector('.char-counter');
    const categorySelect = document.querySelector('select[name="category"]');
    const sideMenu = document.getElementById('offcanvasMenu');
    const deleteButtons = document.querySelectorAll('.delete-post');
    const likeButtons = document.querySelectorAll('.like-btn');
    const commentButtons = document.querySelectorAll('.comment-btn');
    const commentForms = document.querySelectorAll('.comment-form');
    const commentLikeButtons = document.querySelectorAll('.comment-like-btn');

    // Inicializa componentes
    initializeComponents();

    // Configura eventos
    setupSearchBar();
    setupCategoryFilter();
    setupPostForm();
    setupDeleteButtons();
    setupLikeButtons();
    setupCommentButtons();
    setupCommentForms();
    setupCommentLikeButtons();
    setupDrawer();

    function initializeComponents() {
        // Carrega likes para posts
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

        // Carrega likes para comentários
        commentLikeButtons.forEach(btn => {
            const commentId = btn.getAttribute('data-comment-id');
            fetch(`/get_comment_likes/${commentId}`, {
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
                        btn.classList.add('liked');
                    }
                }
            })
            .catch(error => console.error('Error fetching comment likes:', error));
        });

        // Inicializa o contador de caracteres para o formulário de postagem
        if (postTextarea && charCounter) {
            postTextarea.dispatchEvent(new Event('input'));
        }

        // Ajusta a categoria ativa ao iniciar a página
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
        const activeCategory = document.querySelector('.category.active')?.dataset.category || 'Todas';
        const normalizedSearchTerm = normalizeText(searchTerm);

        document.querySelectorAll('.post-card').forEach(card => {
            const content = card.querySelector('.post-content p')?.textContent || '';
            const username = card.querySelector('.username')?.textContent || '';
            const category = card.dataset.category || '';

            const normalizedContent = normalizeText(content);
            const normalizedUsername = normalizeText(username);
            const normalizedCategory = normalizeText(category);

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

            const mappedSearchTerm = searchCategoryMap[normalizedSearchTerm] || normalizedSearchTerm;

            const matchesSearch = searchTerm === '' ||
                normalizedContent.includes(normalizedSearchTerm) ||
                normalizedUsername.includes(normalizedSearchTerm) ||
                normalizedCategory.includes(mappedSearchTerm);

            const matchesCategory = activeCategory === 'Todas' || normalizedCategory === normalizeText(activeCategory);

            if (matchesSearch && matchesCategory) {
                card.style.display = 'block';
            } else {
                card.style.display = 'none';
            }
        });
    }

    function setupCategoryFilter() {
        if (!categories || categories.length === 0) return;

        categories.forEach(category => {
            category.addEventListener('click', function() {
                categories.forEach(c => c.classList.remove('active'));
                this.classList.add('active');

                const categoryName = this.dataset.category;
                localStorage.setItem('activeCategory', categoryName);

                filterPosts('');

                // Limpa a pesquisa ao mudar de categoria
                if (searchInput) {
                    searchInput.value = '';
                    searchBar.classList.remove('search-active');
                }
                showNotification(`Filtrando por ${this.textContent.trim()}`, 'success');
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

        if (categorySelect) {
            categorySelect.addEventListener('focus', function() {
                this.parentElement.classList.add('active');
            });

            categorySelect.addEventListener('blur', function() {
                this.parentElement.classList.remove('active');
            });

            categorySelect.addEventListener('change', function() {
                const selectedCategory = this.options[this.selectedIndex].text;
                showNotification(`Categoria selecionada: ${selectedCategory}`, 'info');
            });
        }

        postForm.addEventListener('submit', function(e) {
            e.preventDefault();

            const submitButton = postForm.querySelector('button[type="submit"]');
            if (submitButton) {
                submitButton.disabled = true;
                submitButton.textContent = 'Enviando...';
            }

            if (postTextarea.value.trim() === '') {
                showNotification('Digite algo para publicar', 'error');
                postTextarea.focus();
                if (submitButton) {
                    submitButton.disabled = false;
                    submitButton.textContent = 'Publicar';
                }
                return;
            }

            if (categorySelect && categorySelect.value === '') {
                showNotification('Selecione uma categoria', 'error');
                categorySelect.focus();
                if (submitButton) {
                    submitButton.disabled = false;
                    submitButton.textContent = 'Publicar';
                }
                return;
            }

            fetch('/telainicial', {
                method: 'POST',
                body: new FormData(postForm)
            })
            .then(response => response.text())
            .then(() => {
                showNotification('Postagem publicada com sucesso!', 'success');
                postForm.reset();
                charCounter.textContent = '0/500';
                window.location.reload();
            })
            .catch(error => {
                showNotification('Erro ao publicar postagem. Tente novamente.', 'error');
                console.error(`Erro ao enviar postagem: ${error}`);
            })
            .finally(() => {
                if (submitButton) {
                    submitButton.disabled = false;
                    submitButton.textContent = 'Publicar';
                }
            });
        });
    }

    function setupDeleteButtons() {
        if (!deleteButtons || deleteButtons.length === 0) return;

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
        if (!likeButtons || likeButtons.length === 0) return;

        likeButtons.forEach(button => {
            button.addEventListener('click', function() {
                const postId = this.closest('.post-card').dataset.postId;
                fetch(`/like_post/${postId}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                })
                .then(response => response.json())
                .then(data => {
                    if (data.status === 'success') {
                        this.querySelector('.like-count').textContent = data.like_count;
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

    function setupCommentButtons() {
        if (!commentButtons || commentButtons.length === 0) return;

        commentButtons.forEach(button => {
            button.addEventListener('click', function() {
                const postCard = this.closest('.post-card');
                const commentSection = postCard.querySelector('.comments-section');
                if (commentSection) {
                    const textarea = commentSection.querySelector('textarea[name="comment_content"]');
                    if (textarea) {
                        textarea.focus();
                    }
                }
            });
        });
    }

    function setupCommentForms() {
        if (!commentForms || commentForms.length === 0) return;

        commentForms.forEach(form => {
            const textarea = form.querySelector('textarea[name="comment_content"]');
            const postId = form.dataset.postId;

            form.addEventListener('submit', function(e) {
                e.preventDefault();
                const content = textarea?.value.trim() || '';

                if (!content) {
                    showNotification('O comentário não pode estar vazio', 'error');
                    if (textarea) textarea.focus();
                    return;
                }

                fetch(`/comment/${postId}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
                    },
                    body: new URLSearchParams({
                        'comment_content': content
                    })
                })
                .then(response => response.json())
                .then(data => {
                    if (data.status === 'success') {
                        const commentsList = form.nextElementSibling;
                        if (commentsList) {
                            const newComment = document.createElement('div');
                            newComment.className = 'comment';
                            newComment.dataset.commentId = data.comment.id;
                            newComment.innerHTML = `
                                <div class="d-flex">
                                    <div class="avatar me-2">
                                        <div class="avatar-initials bg-primary text-white rounded-circle d-flex justify-content-center align-items-center">
                                            ${data.comment.username[0].toUpperCase()}
                                        </div>
                                    </div>
                                    <div>
                                        <h6 class="mb-0">${data.comment.username}</h6>
                                        <small class="text-muted">${data.comment.created_at}</small>
                                        <p class="mb-1">${data.comment.content}</p>
                                        <button class="btn btn-sm btn-outline-primary comment-like-btn" data-comment-id="${data.comment.id}">
                                            <i class="fas fa-thumbs-up"></i> <span class="like-count">0</span>
                                        </button>
                                    </div>
                                </div>
                            `;
                            commentsList.prepend(newComment);
                            if (textarea) {
                                textarea.value = '';
                            }
                            showNotification('Comentário adicionado com sucesso!', 'success');

                            // Initialize like button for the new comment
                            const newButton = newComment.querySelector('.comment-like-btn');
                            newButton.addEventListener('click', function() {
                                fetch(`/like_comment/${data.comment.id}`, {
                                    method: 'POST',
                                    headers: {
                                        'Content-Type': 'application/json'
                                    }
                                })
                                .then(response => response.json())
                                .then(data => {
                                    if (data.status === 'success') {
                                        newButton.querySelector('.like-count').textContent = data.like_count;
                                        if (data.liked) {
                                            newButton.classList.add('liked');
                                            showNotification('Comentário curtido!', 'success');
                                        } else {
                                            newButton.classList.remove('liked');
                                            showNotification('Like removido', 'info');
                                        }
                                    } else {
                                        showNotification(data.message || 'Erro ao curtir comentário.', 'error');
                                    }
                                })
                                .catch(() => {
                                    showNotification('Erro ao conectar com o servidor.', 'error');
                                });
                            });
                        }
                    } else {
                        showNotification(data.message || 'Erro ao adicionar comentário', 'error');
                    }
                })
                .catch(() => {
                    showNotification('Erro ao conectar com o servidor.', 'error');
                });
            });
        });
    }

    function setupCommentLikeButtons() {
        if (!commentLikeButtons || commentLikeButtons.length === 0) return;

        commentLikeButtons.forEach(button => {
            button.addEventListener('click', function() {
                const commentId = this.getAttribute('data-comment-id');
                fetch(`/like_comment/${commentId}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                })
                .then(response => response.json())
                .then(data => {
                    if (data.status === 'success') {
                        this.querySelector('.like-count').textContent = data.like_count;
                        if (data.liked) {
                            this.classList.add('liked');
                            showNotification('Comentário curtido!', 'success');
                        } else {
                            this.classList.remove('liked');
                            showNotification('Like removido', 'info');
                        }
                    } else {
                        showNotification(data.message || 'Erro ao curtir comentário.', 'error');
                    }
                })
                .catch(() => {
                    showNotification('Erro ao conectar com o servidor.', 'error');
                });
            });
        });
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

    // Função global para mostrar notificações
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

    // Função auxiliar para formatar datas (caso precise no futuro)
    function formatDate(dateStr) {
        const date = new Date(dateStr);
        const options = {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
            timeZone: 'America/Sao_Paulo'
        };
        return date.toLocaleString('pt-BR', options).replace(',', '');
    }
});