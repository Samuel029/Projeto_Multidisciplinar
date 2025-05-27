document.addEventListener('DOMContentLoaded', function() {
    // Elementos da interface
    const searchBar = document.querySelector('.search-bar');
    const searchInput = document.querySelector('.search-bar input');
    const searchIcon = document.querySelector('.search-bar i');
    const commentForm = document.querySelector('.comment-form');
    const commentTextarea = document.querySelector('textarea[name="comment_content"]');
    const charCounter = document.querySelector('.char-counter');
    const likeButton = document.querySelector('.like-btn');
    const commentLikeButtons = document.querySelectorAll('.comment-like-btn');
    const deleteButton = document.querySelector('.delete-post');
    const sideMenu = document.getElementById('offcanvasMenu');
    const closeCommentsButton = document.querySelector('.close-comments');

    // Inicializa componentes
    initializeComponents();

    // Configura eventos
    setupSearchBar();
    setupCommentForm();
    setupLikeButton();
    setupCommentLikeButtons();
    setupDeleteButton();
    setupDrawer();

    function initializeComponents() {
        // Carrega likes para o post
        if (likeButton) {
            const postId = likeButton.dataset.postId;
            fetch(`/get_post_likes/${postId}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            })
            .then(response => response.json())
            .then(data => {
                if (data.status === 'success') {
                    likeButton.querySelector('.like-count').textContent = data.like_count;
                    if (data.user_liked) {
                        likeButton.classList.add('active');
                    }
                }
            })
            .catch(error => console.error('Error fetching post likes:', error));
        }

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

        // Inicializa o contador de caracteres para o formulário de comentários
        if (commentTextarea && charCounter) {
            commentTextarea.dispatchEvent(new Event('input'));
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
                    const urlParams = new URLSearchParams(window.location.search);
                    searchInput.value = urlParams.get('search') || '';
                } else {
                    searchInput.blur();
                    searchInput.value = '';
                }
                event.stopPropagation();
            }
        });

        // Fecha a barra de pesquisa ao clicar fora
        document.addEventListener('click', function(event) {
            if (window.innerWidth <= 992 && !searchBar.contains(event.target)) {
                searchBar.classList.remove('search-active');
                searchInput.value = '';
            }
        });

        searchBar.addEventListener('click', function(event) {
            event.stopPropagation();
        });

        // Redireciona para a tela inicial com o termo de pesquisa
        searchInput.addEventListener('input', function() {
            const searchTerm = normalizeText(this.value);
            if (searchTerm) {
                window.history.replaceState(null, null, `?search=${encodeURIComponent(searchTerm)}`);
            } else {
                window.history.replaceState(null, null, window.location.pathname);
            }
        });

        searchInput.addEventListener('keypress', function(event) {
            if (event.key === 'Enter') {
                event.preventDefault();
                const searchTerm = this.value.trim();
                if (searchTerm) {
                    window.location.href = `/telainicial?search=${encodeURIComponent(searchTerm)}`;
                } else {
                    window.location.href = '/telainicial';
                }
            }
        });

        // Carrega o termo de busca da URL, se existir
        const urlParams = new URLSearchParams(window.location.search);
        const searchTerm = urlParams.get('search') || '';
        searchInput.value = searchTerm;
        if (searchTerm && window.innerWidth <= 992) {
            searchBar.classList.add('search-active');
        }
    }

    function setupCommentForm() {
        if (!commentForm || !commentTextarea || !charCounter) return;

        // Configura o contador de caracteres
        commentTextarea.addEventListener('input', function() {
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

        commentForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const content = commentTextarea.value.trim();
            const postId = commentForm.dataset.postId;

            if (!content) {
                showNotification('O comentário não pode estar vazio', 'error');
                commentTextarea.focus();
                return;
            }

            const submitButton = commentForm.querySelector('button[type="submit"]');
            if (submitButton) {
                submitButton.disabled = true;
                submitButton.textContent = 'Enviando...';
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
                    const commentsList = document.querySelector('.comments-list');
                    if (commentsList) {
                        const emptyState = commentsList.querySelector('.empty-state-card');
                        if (emptyState) {
                            emptyState.remove();
                        }
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
                        commentTextarea.value = '';
                        charCounter.textContent = '0/500';
                        showNotification('Comentário adicionado com sucesso!', 'success');

                        // Inicializa o botão de like para o novo comentário
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
            })
            .finally(() => {
                if (submitButton) {
                    submitButton.disabled = false;
                    submitButton.textContent = 'Enviar Comentário';
                }
            });
        });
    }

    function setupLikeButton() {
        if (!likeButton) return;

        likeButton.addEventListener('click', function() {
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

    function setupDeleteButton() {
        if (!deleteButton) return;

        deleteButton.addEventListener('click', function() {
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
                        showNotification('Postagem deletada com sucesso!', 'success');
                        setTimeout(() => {
                            window.location.href = '/telainicial';
                        }, 1000);
                    } else {
                        showNotification('Erro ao deletar postagem.', 'error');
                    }
                })
                .catch(() => {
                    showNotification('Erro ao conectar com o servidor.', 'error');
                });
            }
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
});