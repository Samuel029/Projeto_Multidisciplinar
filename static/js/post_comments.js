document.addEventListener('DOMContentLoaded', function() {
    // Elementos da interface
    const searchBar = document.querySelector('.search-bar');
    const searchInput = document.querySelector('.search-bar input');
    const searchIcon = document.querySelector('.search-bar i');
    const commentForm = document.querySelector('.comment-form');
    const commentTextarea = document.querySelector('textarea[name="comment_content"]');
    const charCounter = document.querySelector('.comment-form .char-counter');
    const likeButton = document.querySelector('.like-btn');
    const deleteButton = document.querySelector('.delete-post');
    const sideMenu = document.getElementById('offcanvasMenu');

    // Inicializa componentes
    initializeComponents();

    // Configura eventos
    setupSearchBar();
    setupCommentForm();
    setupLikeButton();
    setupCommentLikeButtons();
    setupDeleteButton();
    setupReplyForms();
    setupEditForms();
    setupDeleteComments();
    setupEmojiPickers();
    setupDrawer();
    updateTimeAgo();

    // Atualiza time-ago a cada minuto
    setInterval(updateTimeAgo, 60000);

    function initializeComponents() {
        console.log('Inicializando componentes...');
        // Carrega likes para o post
        if (likeButton) {
            const postId = likeButton.dataset.postId;
            fetch(`/get_post_likes/${postId}`)
                .then(response => response.json())
                .then(data => {
                    if (data.status === 'success') {
                        likeButton.querySelector('.like-count').textContent = data.like_count;
                        if (data.user_liked) likeButton.classList.add('active');
                    }
                })
                .catch(error => console.error('Erro ao carregar likes do post:', error));
        }

        // Carrega likes para comentários e respostas
        document.querySelectorAll('.comment-like-btn').forEach(btn => {
            const id = btn.dataset.commentId || btn.dataset.replyId;
            fetch(`/get_comment_likes/${id}`)
                .then(response => response.json())
                .then(data => {
                    if (data.status === 'success') {
                        btn.querySelector('.like-count').textContent = data.like_count;
                        if (data.user_liked) btn.classList.add('liked');
                    }
                })
                .catch(error => console.error('Erro ao carregar likes do comentário:', error));
        });

        // Inicializa contadores de caracteres
        document.querySelectorAll('textarea[name="comment_content"], textarea[name="reply_content"], textarea[name="edit_comment_content"], textarea[name="edit_reply_content"]').forEach(textarea => {
            textarea.dispatchEvent(new Event('input'));
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
                window.location.href = searchTerm ? `/telainicial?search=${encodeURIComponent(searchTerm)}` : '/telainicial';
            }
        });

        const urlParams = new URLSearchParams(window.location.search);
        const searchTerm = urlParams.get('search') || '';
        searchInput.value = searchTerm;
        if (searchTerm && window.innerWidth <= 992) {
            searchBar.classList.add('search-active');
        }
    }

    function setupCommentForm() {
        if (!commentForm || !commentTextarea || !charCounter) return;

        commentTextarea.addEventListener('input', updateCharCounter);

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
            submitButton.disabled = true;
            submitButton.textContent = 'Enviando...';

            fetch(`/comment/${postId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({ 'comment_content': content })
            })
                .then(response => response.json())
                .then(data => {
                    if (data.status === 'success') {
                        const commentsList = document.querySelector('.comments-list');
                        const emptyState = commentsList.querySelector('.empty-state-card');
                        if (emptyState) emptyState.remove();

                        const newComment = createCommentElement(data.comment, true);
                        commentsList.prepend(newComment);
                        commentTextarea.value = '';
                        charCounter.textContent = '0/500';
                        showNotification('Comentário adicionado com sucesso!', 'success');
                        updateCommentCount();
                        updateTimeAgo();
                        setupCommentLikeButtons();
                        setupReplyForms();
                        setupEditForms();
                        setupDeleteComments();
                        setupEmojiPickers(); // Reconfigura emoji pickers para o novo comentário
                    } else {
                        showNotification(data.message || 'Erro ao adicionar comentário', 'error');
                    }
                })
                .catch(() => showNotification('Erro ao conectar com o servidor.', 'error'))
                .finally(() => {
                    submitButton.disabled = false;
                    submitButton.textContent = 'Enviar Comentário';
                });
        });

        const cancelButton = commentForm.querySelector('.btn-cancel');
        if (cancelButton) {
            cancelButton.addEventListener('click', () => {
                commentTextarea.value = '';
                charCounter.textContent = '0/500';
                charCounter.classList.remove('limit');
                const emojiPicker = commentForm.querySelector('emoji-picker');
                if (emojiPicker) emojiPicker.style.display = 'none';
            });
        }
    }

    function setupLikeButton() {
        if (!likeButton) return;

        likeButton.addEventListener('click', function() {
            const postId = this.dataset.postId;
            fetch(`/like_post/${postId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            })
                .then(response => response.json())
                .then(data => {
                    if (data.status === 'success') {
                        this.querySelector('.like-count').textContent = data.like_count;
                        this.classList.toggle('active', data.liked);
                        showNotification(data.liked ? 'Postagem curtida!' : 'Like removido', data.liked ? 'success' : 'info');
                    } else {
                        showNotification(data.message || 'Erro ao curtir postagem.', 'error');
                    }
                })
                .catch(() => showNotification('Erro ao conectar com o servidor.', 'error'));
        });
    }

    function setupCommentLikeButtons() {
        document.querySelectorAll('.comment-like-btn').forEach(button => {
            button.removeEventListener('click', handleCommentLike);
            button.addEventListener('click', handleCommentLike);
        });
    }

    function handleCommentLike() {
        const id = this.dataset.commentId || this.dataset.replyId;
        fetch(`/like_comment/${id}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        })
            .then(response => response.json())
            .then(data => {
                if (data.status === 'success') {
                    this.querySelector('.like-count').textContent = data.like_count;
                    this.classList.toggle('liked', data.liked);
                    showNotification(data.liked ? 'Comentário curtido!' : 'Like removido', data.liked ? 'success' : 'info');
                } else {
                    showNotification(data.message || 'Erro ao curtir comentário.', 'error');
                }
            })
            .catch(() => showNotification('Erro ao conectar com o servidor.', 'error'));
    }

    function setupDeleteButton() {
        if (!deleteButton) return;

        deleteButton.addEventListener('click', function() {
            const postId = this.dataset.postId;
            if (confirm('Tem certeza que deseja deletar esta postagem?')) {
                fetch(`/delete_post/${postId}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' }
                })
                    .then(response => response.json())
                    .then(data => {
                        if (data.status === 'success') {
                            showNotification('Postagem deletada com sucesso!', 'success');
                            setTimeout(() => window.location.href = '/telainicial', 1000);
                        } else {
                            showNotification('Erro ao deletar postagem.', 'error');
                        }
                    })
                    .catch(() => showNotification('Erro ao conectar com o servidor.', 'error'));
            }
        });
    }

    function setupReplyForms() {
        document.querySelectorAll('.reply-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const commentId = this.dataset.commentId;
                const replyFormContainer = this.closest('.comment').querySelector('.reply-form-container');
                replyFormContainer.style.display = replyFormContainer.style.display === 'none' ? 'block' : 'none';
                if (replyFormContainer.style.display === 'block') {
                    replyFormContainer.querySelector('.reply-input').focus();
                }
            });
        });

        document.querySelectorAll('.reply-form').forEach(form => {
            const replyTextarea = form.querySelector('.reply-input');
            const replyCharCounter = form.querySelector('.char-counter');
            if (replyTextarea && replyCharCounter) {
                replyTextarea.addEventListener('input', updateCharCounter);
            }

            form.addEventListener('submit', function(e) {
                e.preventDefault();
                const commentId = this.dataset.commentId;
                const content = this.querySelector('.reply-input').value.trim();
                const submitButton = this.querySelector('button[type="submit"]');

                if (!content) {
                    showNotification('A resposta não pode estar vazia', 'error');
                    this.querySelector('.reply-input').focus();
                    return;
                }

                submitButton.disabled = true;
                submitButton.textContent = 'Enviando...';

                fetch(`/reply/${commentId}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: new URLSearchParams({ 'reply_content': content })
                })
                    .then(response => response.json())
                    .then(data => {
                        if (data.status === 'success') {
                            const repliesList = form.closest('.comment').querySelector('.replies-list');
                            const newReply = createReplyElement(data.reply);
                            repliesList.appendChild(newReply);
                            form.querySelector('.reply-input').value = '';
                            form.querySelector('.char-counter').textContent = '0/500';
                            form.style.display = 'none';
                            showNotification('Resposta adicionada com sucesso!', 'success');
                            updateCommentCount();
                            updateTimeAgo();
                            setupCommentLikeButtons();
                            setupEditForms();
                            setupDeleteComments();
                            setupEmojiPickers(); // Reconfigura emoji pickers para a nova resposta
                        } else {
                            showNotification(data.message || 'Erro ao adicionar resposta', 'error');
                        }
                    })
                    .catch(() => showNotification('Erro ao conectar com o servidor.', 'error'))
                    .finally(() => {
                        submitButton.disabled = false;
                        submitButton.textContent = 'Enviar Resposta';
                    });
            });

            const cancelButton = form.querySelector('.btn-cancel-reply');
            if (cancelButton) {
                cancelButton.addEventListener('click', () => {
                    form.querySelector('.reply-input').value = '';
                    form.querySelector('.char-counter').textContent = '0/500';
                    form.querySelector('.char-counter').classList.remove('limit');
                    form.closest('.reply-form-container').style.display = 'none';
                    const emojiPicker = form.querySelector('emoji-picker');
                    if (emojiPicker) emojiPicker.style.display = 'none';
                });
            }
        });
    }

    function setupEditForms() {
        document.querySelectorAll('.edit-comment, .edit-reply').forEach(btn => {
            btn.addEventListener('click', function() {
                const id = this.dataset.commentId || this.dataset.replyId;
                const type = this.classList.contains('edit-comment') ? 'comment' : 'reply';
                const commentElement = this.closest('.comment');
                const editForm = commentElement.querySelector(`.edit-${type}-form`);
                const commentContent = commentElement.querySelector('.comment-content');
                editForm.style.display = editForm.style.display === 'none' ? 'block' : 'none';
                commentContent.style.display = editForm.style.display === 'block' ? 'none' : 'block';
                if (editForm.style.display === 'block') {
                    editForm.querySelector(`.edit-${type}-input`).focus();
                }
            });
        });

        document.querySelectorAll('.edit-comment-form-inner, .edit-reply-form-inner').forEach(form => {
            const textarea = form.querySelector(`textarea[name="edit_comment_content"], textarea[name="edit_reply_content"]`);
            const charCounter = form.querySelector('.char-counter');
            if (textarea && charCounter) {
                textarea.addEventListener('input', updateCharCounter);
                textarea.dispatchEvent(new Event('input'));
            }

            form.addEventListener('submit', function(e) {
                e.preventDefault();
                const id = this.dataset.commentId || this.dataset.replyId;
                const type = this.classList.contains('edit-comment-form-inner') ? 'comment' : 'reply';
                const content = this.querySelector(`.edit-${type}-input`).value.trim();
                const submitButton = this.querySelector('button[type="submit"]');

                if (!content) {
                    showNotification(`A ${type === 'comment' ? 'comentário' : 'resposta'} não pode estar vazia`, 'error');
                    this.querySelector(`.edit-${type}-input`).focus();
                    return;
                }

                submitButton.disabled = true;
                submitButton.textContent = 'Salvando...';

                fetch(`/edit_${type}/${id}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: new URLSearchParams({ [`edit_${type}_content`]: content })
                })
                    .then(response => response.json())
                    .then(data => {
                        if (data.status === 'success') {
                            const commentElement = form.closest('.comment');
                            commentElement.querySelector('.comment-content').textContent = content;
                            commentElement.querySelector('.comment-content').style.display = 'block';
                            form.style.display = 'none';
                            showNotification(`${type === 'comment' ? 'Comentário' : 'Resposta'} editado com sucesso!`, 'success');
                        } else {
                            showNotification(data.message || `Erro ao editar ${type === 'comment' ? 'comentário' : 'resposta'}`, 'error');
                        }
                    })
                    .catch(() => showNotification('Erro ao conectar com o servidor.', 'error'))
                    .finally(() => {
                        submitButton.disabled = false;
                        submitButton.textContent = 'Salvar';
                    });
            });

            const cancelButton = form.querySelector('.btn-cancel-edit');
            if (cancelButton) {
                cancelButton.addEventListener('click', () => {
                    form.querySelector(`textarea`).value = form.closest('.comment').querySelector('.comment-content').textContent;
                    form.querySelector('.char-counter').textContent = '0/500';
                    form.querySelector('.char-counter').classList.remove('limit');
                    form.style.display = 'none';
                    form.closest('.comment').querySelector('.comment-content').style.display = 'block';
                    const emojiPicker = form.querySelector('emoji-picker');
                    if (emojiPicker) emojiPicker.style.display = 'none';
                });
            }
        });
    }

    function setupDeleteComments() {
        document.querySelectorAll('.delete-comment, .delete-reply').forEach(btn => {
            btn.addEventListener('click', function() {
                const id = this.dataset.commentId || this.dataset.replyId;
                const type = this.classList.contains('delete-comment') ? 'comment' : 'reply';
                if (confirm(`Tem certeza que deseja deletar este ${type === 'comment' ? 'comentário' : 'resposta'}?`)) {
                    fetch(`/delete_${type}/${id}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' }
                    })
                        .then(response => response.json())
                        .then(data => {
                            if (data.status === 'success') {
                                this.closest('.comment').remove();
                                showNotification(`${type === 'comment' ? 'Comentário' : 'Resposta'} deletado com sucesso!`, 'success');
                                updateCommentCount();
                                if (type === 'comment' && !document.querySelector('.comments-list .comment:not(.reply)')) {
                                    const commentsList = document.querySelector('.comments-list');
                                    commentsList.innerHTML = `
                                        <div class="empty-state-card">
                                            <div class="text-center py-4">
                                                <i class="fas fa-comment-slash fa-3x mb-3 text-muted"></i>
                                                <p class="text-muted fs-5">Nenhum comentário ainda. Seja o primeiro a comentar!</p>
                                            </div>
                                        </div>
                                    `;
                                }
                            } else {
                                showNotification(`Erro ao deletar ${type === 'comment' ? 'comentário' : 'resposta'}.`, 'error');
                            }
                        })
                        .catch(() => showNotification('Erro ao conectar com o servidor.', 'error'));
                }
            });
        });
    }

    function setupEmojiPickers() {
        console.log('Inicializando emoji pickers...');
        document.querySelectorAll('.emoji-btn').forEach(btn => {
            const emojiPicker = btn.parentElement.querySelector('emoji-picker');
            if (!emojiPicker) {
                console.warn('Emoji picker não encontrado para o botão:', btn);
                return;
            }

            console.log('Configurando botão de emoji:', btn);
            btn.addEventListener('click', function(event) {
                console.log('Botão de emoji clicado:', btn);
                emojiPicker.style.display = emojiPicker.style.display === 'none' ? 'block' : 'none';
                event.stopPropagation();
            });

            emojiPicker.addEventListener('emoji-click', event => {
                console.log('Emoji selecionado:', event.detail.unicode);
                const textarea = btn.parentElement.querySelector('textarea');
                if (!textarea) {
                    console.warn('Textarea não encontrada para o emoji picker:', emojiPicker);
                    return;
                }

                const cursorPos = textarea.selectionStart;
                const textBefore = textarea.value.substring(0, cursorPos);
                const textAfter = textarea.value.substring(cursorPos);
                textarea.value = textBefore + event.detail.unicode + textAfter;
                textarea.dispatchEvent(new Event('input'));
                textarea.focus();
                textarea.selectionStart = textarea.selectionEnd = cursorPos + event.detail.unicode.length;
                emojiPicker.style.display = 'none';
            });
        });

        document.addEventListener('click', function(event) {
            if (!event.target.closest('.emoji-btn') && !event.target.closest('emoji-picker')) {
                console.log('Fechando todos os emoji pickers');
                document.querySelectorAll('emoji-picker').forEach(picker => {
                    picker.style.display = 'none';
                });
            }
        });
    }

    function updateCharCounter() {
        const maxLength = 500;
        const currentLength = this.value.length;
        const charCounter = this.parentElement.querySelector('.char-counter');
        charCounter.textContent = `${currentLength}/${maxLength}`;
        charCounter.classList.toggle('limit', currentLength > maxLength * 0.8);

        if (currentLength > maxLength) {
            this.value = this.value.substring(0, maxLength);
            charCounter.textContent = `${maxLength}/${maxLength}`;
            showNotification('Limite de caracteres atingido', 'error');
        }
    }

    function createCommentElement(comment, isOwnComment) {
        const div = document.createElement('div');
        div.className = 'comment';
        div.dataset.commentId = comment.id;
        div.innerHTML = `
            <div class="comment-wrapper">
                <div class="comment-header d-flex align-items-center">
                    <div class="avatar me-3">
                        <div class="avatar-initials bg-primary text-white rounded-circle d-flex justify-content-center align-items-center">
                            ${comment.username[0].toUpperCase()}
                        </div>
                    </div>
                    <div class="comment-meta">
                        <h6 class="mb-0">
                            ${comment.username}
                            ${comment.is_admin ? '<span class="badge bg-danger ms-2">Admin</span>' : comment.is_moderator ? '<span class="badge bg-success ms-2">Moderador</span>' : ''}
                        </h6>
                        <small class="text-muted time-ago" data-original="${comment.created_at}">${comment.created_at}</small>
                    </div>
                    ${isOwnComment ? `
                    <div class="comment-actions ms-auto">
                        <button class="btn btn-sm btn-outline-primary edit-comment" data-comment-id="${comment.id}">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger delete-comment" data-comment-id="${comment.id}">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>` : ''}
                </div>
                <div class="comment-body">
                    <p class="mb-2 comment-content">${comment.content}</p>
                </div>
                <div class="comment-footer d-flex align-items-center gap-2">
                    <button class="btn btn-sm btn-outline-primary comment-like-btn" data-comment-id="${comment.id}">
                        <i class="fas fa-thumbs-up"></i> <span class="like-count">0</span>
                    </button>
                    <button class="btn btn-sm btn-outline-secondary reply-btn" data-comment-id="${comment.id}">
                        <i class="fas fa-reply"></i> Responder
                    </button>
                </div>
                <div class="edit-comment-form" style="display: none;">
                    <form class="edit-comment-form-inner" data-comment-id="${comment.id}">
                        <div class="mb-3 position-relative">
                            <textarea class="form-control edit-comment-input" name="edit_comment_content" rows="3" required>${comment.content}</textarea>
                            <div class="char-counter">0/500</div>
                            <button type="button" class="emoji-btn" title="Adicionar Emoji"><i class="fas fa-smile"></i></button>
                            <emoji-picker class="emoji-picker" style="display: none;"></emoji-picker>
                        </div>
                        <div class="edit-comment-footer">
                            <button type="submit" class="btn btn-sm btn-primary btn-save-edit">Salvar</button>
                            <button type="button" class="btn btn-sm btn-outline-secondary btn-cancel-edit">Cancelar</button>
                        </div>
                    </form>
                </div>
                <div class="reply-form-container" style="display: none;">
                    <form class="reply-form" data-comment-id="${comment.id}">
                        <div class="mb-3 position-relative">
                            <textarea class="form-control reply-input" name="reply_content" rows="3" placeholder="Escreva sua resposta..." required></textarea>
                            <div class="char-counter">0/500</div>
                            <button type="button" class="emoji-btn" title="Adicionar Emoji"><i class="fas fa-smile"></i></button>
                            <emoji-picker class="emoji-picker" style="display: none;"></emoji-picker>
                        </div>
                        <div class="reply-form-footer">
                            <button type="submit" class="btn btn-sm btn-primary btn-publish">Enviar Resposta</button>
                            <button type="button" class="btn btn-sm btn-outline-secondary btn-cancel-reply">Cancelar</button>
                        </div>
                    </form>
                </div>
                <div class="replies-list ms-5"></div>
            </div>
        `;
        return div;
    }

    function createReplyElement(reply) {
        const div = document.createElement('div');
        div.className = 'comment reply';
        div.dataset.replyId = reply.id;
        div.innerHTML = `
            <div class="comment-wrapper">
                <div class="comment-header d-flex align-items-center">
                    <div class="avatar me-3">
                        <div class="avatar-initials bg-secondary text-white rounded-circle d-flex justify-content-center align-items-center">
                            ${reply.username[0].toUpperCase()}
                        </div>
                    </div>
                    <div class="comment-meta">
                        <h6 class="mb-0">
                            ${reply.username}
                            ${reply.is_admin ? '<span class="badge bg-danger ms-2">Admin</span>' : reply.is_moderator ? '<span class="badge bg-success ms-2">Moderador</span>' : ''}
                        </h6>
                        <small class="text-muted time-ago" data-original="${reply.created_at}">${reply.created_at}</small>
                    </div>
                    <div class="comment-actions ms-auto">
                        <button class="btn btn-sm btn-outline-primary edit-reply" data-reply-id="${reply.id}">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger delete-reply" data-reply-id="${reply.id}">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                <div class="comment-body">
                    <p class="mb-2 comment-content">${reply.content}</p>
                </div>
                <div class="comment-footer d-flex align-items-center gap-2">
                    <button class="btn btn-sm btn-outline-primary comment-like-btn" data-reply-id="${reply.id}">
                        <i class="fas fa-thumbs-up"></i> <span class="like-count">0</span>
                    </button>
                </div>
                <div class="edit-reply-form" style="display: none;">
                    <form class="edit-reply-form-inner" data-reply-id="${reply.id}">
                        <div class="mb-3 position-relative">
                            <textarea class="form-control edit-reply-input" name="edit_reply_content" rows="3" required>${reply.content}</textarea>
                            <div class="char-counter">0/500</div>
                            <button type="button" class="emoji-btn" title="Adicionar Emoji"><i class="fas fa-smile"></i></button>
                            <emoji-picker class="emoji-picker" style="display: none;"></emoji-picker>
                        </div>
                        <div class="edit-reply-footer">
                            <button type="submit" class="btn btn-sm btn-primary btn-save-edit">Salvar</button>
                            <button type="button" class="btn btn-sm btn-outline-secondary btn-cancel-edit">Cancelar</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
        return div;
    }

    function updateCommentCount() {
        const commentCount = document.querySelectorAll('.comments-list .comment:not(.reply)').length;
        const commentCountElement = document.querySelector('.comment-count');
        if (commentCountElement) {
            commentCountElement.textContent = `(${commentCount})`;
        }
    }

    function timeAgo(date) {
        if (typeof date === 'string') {
            if (date.includes('T')) {
                date = new Date(date);
            } else {
                const parts = date.split(/[- :/]/);
                date = new Date(parts[2], parts[1] - 1, parts[0], parts[3] || 0, parts[4] || 0, parts[5] || 0);
            }
        }

        const now = new Date();
        const seconds = Math.floor((now - date) / 1000);

        const intervals = {
            ano: 31536000,
            mês: 2592000,
            dia: 86400,
            hora: 3600,
            minuto: 60,
            segundo: 1
        };

        for (const [unit, secondsInUnit] of Object.entries(intervals)) {
            const interval = Math.floor(seconds / secondsInUnit);
            if (interval >= 1) {
                return `há ${interval} ${unit}${interval > 1 ? 's' : ''}`;
            }
        }
        return 'agora';
    }

    function updateTimeAgo() {
        document.querySelectorAll('.time-ago').forEach(el => {
            const originalDate = el.dataset.original || el.textContent;
            el.textContent = timeAgo(originalDate);
        });
    }

    function setupDrawer() {
        if (!sideMenu) return;

        document.querySelectorAll('.offcanvas .nav-link').forEach(btn => {
            btn.addEventListener('click', () => {
                const bsOffcanvas = bootstrap.Offcanvas.getInstance(sideMenu);
                if (bsOffcanvas) {
                    bsOffcanvas.hide();
                }
            });
        });

        document.addEventListener('click', function(event) {
            const isClickInsideDrawer = sideMenu.contains(event.target);
            const isClickOnToggler = event.target.closest('button');
            const isOffcanvasOpen = sideMenu.classList.contains('show');

            if (!isClickInsideDrawer && !isClickOnToggler && isOffcanvasOpen) {
                const bsOffcanvas = bootstrap.Offcanvas.getInstance(sideMenu);
                if (bsOffcanvas) {
                    bsOffcanvas.hide();
                }
            }
        });

        sideMenu.addEventListener('shown.bs.offcanvas', () => {
            document.body.style.overflow='hidden';
            document.body.style.paddingRight = '0';
            sideMenu.style.top = '0';
            sideMenu.style.height = '100vh';
        });

        sideMenu.addEventListener('hidden.bs.offcanvas', () => {
            document.body.style.overflow = 'auto';
            document.body.style.paddingRight = '0';
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
        document.querySelector('.body').appendChild(notification);

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
})();