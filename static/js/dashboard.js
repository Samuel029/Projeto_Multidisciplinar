document.addEventListener('DOMContentLoaded', function() {
    // Initialize tooltips
    const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]');
    tooltipTriggerList.forEach(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl));

    // Progress animation
    function updateProgress() {
        const progressElement = document.querySelector('.progress-bar-fill');
        let progress = 0;
        const interval = setInterval(() => {
            progress += 1;
            progressElement.style.width = progress + '%';
            document.querySelector('.progress-label span:last-child').textContent = progress + '%';
            if (progress >= 65) clearInterval(interval);
        }, 30);
    }

    // Resource count animation
    function animateValue(id, start, end, duration) {
        const obj = document.getElementById(id);
        let startTimestamp = null;
        const step = (timestamp) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            obj.innerHTML = Math.floor(progress * (end - start) + start);
            if (progress < 1) {
                window.requestAnimationFrame(step);
            }
        };
        window.requestAnimationFrame(step);
    }

    updateProgress();
    animateValue("resources-count", 0, 28, 1500);

    // Search functionality
    const searchInputs = document.querySelectorAll('#searchInput, #mainSearchInput');
    searchInputs.forEach(input => {
        const resultsContainer = document.createElement('div');
        resultsContainer.className = 'search-results';
        input.parentElement.appendChild(resultsContainer);

        input.addEventListener('input', async function(e) {
            const query = e.target.value.trim();
            if (query.length < 2) {
                resultsContainer.innerHTML = '';
                resultsContainer.classList.remove('show');
                return;
            }

            try {
                const response = await fetch(`/search?q=${encodeURIComponent(query)}`);
                const results = await response.json();

                resultsContainer.innerHTML = '';
                if (results.length === 0) {
                    resultsContainer.innerHTML = '<div class="search-result-item">Nenhum resultado encontrado</div>';
                } else {
                    results.forEach(result => {
                        const resultItem = document.createElement('div');
                        resultItem.className = 'search-result-item';
                        resultItem.innerHTML = `
                            <div class="search-result-title">${result.title}</div>
                            <div class="search-result-meta">${result.type} | ${result.category}</div>
                        `;
                        resultItem.addEventListener('click', () => {
                            window.location.href = result.url;
                        });
                        resultsContainer.appendChild(resultItem);
                    });
                }
                resultsContainer.classList.add('show');
            } catch (error) {
                console.error('Search error:', error);
                resultsContainer.innerHTML = '<div class="search-result-item">Erro ao buscar resultados</div>';
                resultsContainer.classList.add('show');
            }
        });

        // Hide results when clicking outside
        document.addEventListener('click', (e) => {
            if (!input.contains(e.target) && !resultsContainer.contains(e.target)) {
                resultsContainer.classList.remove('show');
            }
        });
    });

    // Post deletion
    document.querySelectorAll('.delete-post').forEach(button => {
        button.addEventListener('click', async function() {
            const postId = this.getAttribute('data-post-id');
            if (confirm('Tem certeza que deseja excluir esta postagem?')) {
                try {
                    const response = await fetch(`/delete_post/${postId}`, {
                        method: 'DELETE',
                        headers: {
                            'Content-Type': 'application/json'
                        }
                    });
                    const data = await response.json();
                    if (data.status === 'success') {
                        this.closest('.post-card').remove();
                    } else {
                        alert(data.message);
                    }
                } catch (error) {
                    console.error('Delete error:', error);
                    alert('Erro ao excluir postagem');
                }
            }
        });
    });

    // Like functionality
    document.querySelectorAll('.like-btn').forEach(button => {
        button.addEventListener('click', async function() {
            const postId = this.getAttribute('data-post-id');
            try {
                const response = await fetch(`/like_post/${postId}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
                const data = await response.json();
                if (data.status === 'success') {
                    this.querySelector('.like-count').textContent = data.likes;
                    this.classList.toggle('btn-primary', data.liked);
                    this.classList.toggle('btn-outline-primary', !data.liked);
                }
            } catch (error) {
                console.error('Like error:', error);
            }
        });
    });
});