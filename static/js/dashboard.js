document.addEventListener('DOMContentLoaded', function() {
    // Inicializar tooltips do Bootstrap
    const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]');
    tooltipTriggerList.forEach(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl));

    // Elementos DOM
    const progressBarFill = document.querySelector('.progress-bar-fill');
    const progressPercentageText = document.querySelector('.progress-label span:last-child');
    const activityPointsElement = document.getElementById('activity-points');
    const progressDetailsElement = document.getElementById('progress-details');
    const suggestionsElement = document.getElementById('suggestions');
    const resourcesCountElement = document.getElementById('resources-count');

    // Verificar se os elementos existem
    if (!activityPointsElement) {
        console.error('Elemento activity-points não encontrado');
    }
    if (!progressBarFill) {
        console.error('Elemento progress-bar-fill não encontrado');
    }
    if (!progressPercentageText) {
        console.error('Elemento progress-label span:last-child não encontrado');
    }
    if (!resourcesCountElement) {
        console.error('Elemento resources-count não encontrado');
    }

    // Função para atualizar o contador de recursos com ícone
    function updateResourcesCount(count) {
        if (!resourcesCountElement) return;
        
        // Criar o conteúdo com ícone
        resourcesCountElement.innerHTML = `
            <i class="fas fa-book-open resources-icon"></i>
            <span class="resources-number">${count}</span>
        `;
    }

    // Função principal para carregar o progresso
    function loadUserProgress() {
        // Mostrar indicador de carregamento
        if (activityPointsElement) {
            activityPointsElement.innerHTML = '<span class="loading-dots">Carregando<span class="dots"></span></span>';
        }
        if (progressPercentageText) {
            progressPercentageText.textContent = '...';
        }
        
        // Atualizar recursos count com ícone de carregamento
        if (resourcesCountElement) {
            resourcesCountElement.innerHTML = '<i class="fas fa-spinner fa-spin resources-icon"></i>';
        }
        
        fetch('/user_progress')
            .then(response => {
                if (!response.ok) {
                    throw new Error('Erro na resposta da rede');
                }
                return response.json();
            })
            .then(data => {
                if (data.status === 'success') {
                    // Validar e garantir que os valores sejam números válidos
                    const activityPoints = parseInt(data.activity_points) || 0;
                    const percentage = parseFloat(data.progress_percentage) || 0;
                    const resourcesCount = parseInt(data.resources_count) || 0;
                    
                    // Verificar se os valores são válidos
                    if (!isNaN(activityPoints) && !isNaN(percentage) && !isNaN(resourcesCount)) {
                        // Atualizar contador de pontos de atividade
                        animateValue(activityPointsElement, 0, activityPoints, 1000);
                        
                        // Atualizar barra de progresso
                        animateProgressBar(percentage);
                        
                        // Atualizar contador de recursos com animação
                        animateResourcesCount(resourcesCount);
                        
                        // Atualizar detalhes do progresso
                        updateProgressDetails(data.details || {});
                        
                        // Atualizar sugestões
                        updateSuggestions(data.suggestions || []);
                    } else {
                        // Dados inválidos - mostrar animação de "sem dados"
                        showNoDataAnimation();
                    }
                } else {
                    console.error('Erro no servidor:', data.message);
                    // Mesmo com erro, tentar mostrar os dados disponíveis
                    const activityPoints = parseInt(data.activity_points) || 0;
                    const percentage = parseFloat(data.progress_percentage) || 0;
                    const resourcesCount = parseInt(data.resources_count) || 0;
                    
                    animateValue(activityPointsElement, 0, activityPoints, 1000);
                    animateProgressBar(percentage);
                    animateResourcesCount(resourcesCount);
                    updateProgressDetails(data.details || {});
                    updateSuggestions(data.suggestions || []);
                }
            })
            .catch(error => {
                console.error('Erro ao buscar progresso:', error);
                showErrorAnimation();
            });
    }

    // Função para animar o contador de recursos
    function animateResourcesCount(targetCount) {
        if (!resourcesCountElement) return;
        
        let currentCount = 0;
        const duration = 1000;
        const increment = targetCount / (duration / 16); // 60fps
        
        const animate = () => {
            currentCount += increment;
            if (currentCount >= targetCount) {
                currentCount = targetCount;
                updateResourcesCount(Math.round(currentCount));
                return;
            }
            
            updateResourcesCount(Math.round(currentCount));
            requestAnimationFrame(animate);
        };
        
        animate();
    }

    // Função para atualizar os detalhes do progresso
    function updateProgressDetails(details) {
        if (!progressDetailsElement) return;
        
        progressDetailsElement.innerHTML = '';
        
        // Verificar se details está vazio ou não é um objeto válido
        if (!details || typeof details !== 'object' || Object.keys(details).length === 0) {
            progressDetailsElement.innerHTML = '<div class="no-data-pulse">Complete atividades para ver seu progresso detalhado</div>';
            return;
        }
        
        for (const [category, info] of Object.entries(details)) {
            if (!info || typeof info !== 'object') continue;
            
            const detailItem = document.createElement('div');
            detailItem.className = 'progress-detail-item';
            
            const progressBar = document.createElement('div');
            progressBar.className = 'progress-detail-bar';
            
            const progressFill = document.createElement('div');
            progressFill.className = 'progress-detail-fill';
            
            const percentage = Math.min(Math.max(info.percentage || 0, 0), 100);
            progressFill.style.width = `${percentage}%`;
            
            // Definir cor baseada na porcentagem
            if (percentage < 30) {
                progressFill.style.backgroundColor = '#e74a3b';
            } else if (percentage < 70) {
                progressFill.style.backgroundColor = '#f6c23e';
            } else {
                progressFill.style.backgroundColor = '#1cc88a';
            }
            
            progressBar.appendChild(progressFill);
            
            const detailText = document.createElement('div');
            detailText.className = 'progress-detail-text';
            detailText.innerHTML = `
                <span class="detail-category">${category}:</span>
                <span class="detail-percentage">${Math.round(percentage)}%</span>
                <span class="detail-count">(${info.completed || 0}/${info.total || 0})</span>
            `;
            
            detailItem.appendChild(progressBar);
            detailItem.appendChild(detailText);
            progressDetailsElement.appendChild(detailItem);
        }
    }

    // Função para atualizar as sugestões
    function updateSuggestions(suggestions) {
        if (!suggestionsElement) return;
        
        suggestionsElement.innerHTML = '';
        
        if (suggestions && Array.isArray(suggestions) && suggestions.length > 0) {
            suggestions.forEach(suggestion => {
                const suggestionItem = document.createElement('div');
                suggestionItem.className = 'suggestion-item';
                suggestionItem.innerHTML = `
                    <i class="fas fa-lightbulb suggestion-icon"></i>
                    <span class="suggestion-text">${suggestion}</span>
                `;
                suggestionsElement.appendChild(suggestionItem);
            });
        } else {
            suggestionsElement.innerHTML = `
                <div class="suggestion-item">
                    <i class="fas fa-check-circle suggestion-icon"></i>
                    <span class="suggestion-text">Você está no caminho certo! Continue explorando.</span>
                </div>
            `;
        }
    }

    // Função para mostrar animação quando não há dados
    function showNoDataAnimation() {
        if (activityPointsElement) {
            activityPointsElement.innerHTML = '<span class="progress-icon">📊 <span class="progress-text">Comece a explorar</span></span>';
        }
        if (progressPercentageText) {
            progressPercentageText.innerHTML = '<span class="progress-icon">🎯 0%</span>';
        }
        if (progressBarFill) {
            progressBarFill.style.width = '0%';
            progressBarFill.style.backgroundColor = '#74b9ff';
        }
        if (resourcesCountElement) {
            resourcesCountElement.innerHTML = '<i class="fas fa-book-open resources-icon"></i><span class="resources-number">0</span>';
        }
        if (progressDetailsElement) {
            progressDetailsElement.innerHTML = '<div class="no-data-pulse">Complete atividades para ver seu progresso detalhado</div>';
        }
        if (suggestionsElement) {
            suggestionsElement.innerHTML = '<div class="no-data-pulse">Complete algumas atividades para receber sugestões</div>';
        }
    }

    // Função para mostrar animação de erro
    function showErrorAnimation() {
        if (activityPointsElement) {
            activityPointsElement.innerHTML = '<span class="error-shake">Erro</span>';
        }
        if (progressPercentageText) {
            progressPercentageText.innerHTML = '<span class="error-shake">Erro</span>';
        }
        if (progressBarFill) {
            progressBarFill.style.width = '0%';
            progressBarFill.style.backgroundColor = '#ff6b6b';
        }
        if (resourcesCountElement) {
            resourcesCountElement.innerHTML = '<i class="fas fa-exclamation-triangle resources-icon error-shake"></i>';
        }
        if (progressDetailsElement) {
            progressDetailsElement.innerHTML = '<div class="error-shake">Erro ao carregar detalhes</div>';
        }
        if (suggestionsElement) {
            suggestionsElement.innerHTML = '<div class="error-shake">Erro ao carregar sugestões</div>';
        }
    }

    // Função para animar o valor numérico
    function animateValue(element, start, end, duration) {
        // Validar que element existe e que start/end são números válidos
        if (!element || isNaN(start) || isNaN(end)) {
            console.error('Parâmetros inválidos para animateValue:', { element, start, end });
            if (element) element.textContent = end || '0';
            return;
        }
        
        let startTimestamp = null;
        const step = (timestamp) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            const currentValue = Math.floor(progress * (end - start) + start);
            element.textContent = currentValue;
            if (progress < 1) {
                window.requestAnimationFrame(step);
            }
        };
        window.requestAnimationFrame(step);
    }

    // Função para animar a barra de progresso
    function animateProgressBar(targetPercentage) {
        if (!progressBarFill || !progressPercentageText) return;
        
        let currentPercentage = 0;
        const duration = 1000; // 1 segundo de animação
        const increment = (targetPercentage - currentPercentage) / (duration / 16); // 60fps
        
        const animate = () => {
            currentPercentage += increment;
            if (currentPercentage >= targetPercentage) {
                currentPercentage = targetPercentage;
                updateProgressBar(currentPercentage);
                return;
            }
            
            updateProgressBar(currentPercentage);
            requestAnimationFrame(animate);
        };
        
        animate();
    }

    // Função para atualizar a UI do progresso
    function updateProgressBar(percentage) {
        if (!progressBarFill || !progressPercentageText) return;
        
        progressBarFill.style.width = `${percentage}%`;
        // Apenas atualizar o conteúdo do span de porcentagem, preservando "Seu progresso"
        progressPercentageText.textContent = `${Math.round(percentage)}%`;
        
        // Mudar cor baseada na porcentagem
        if (percentage < 30) {
            progressBarFill.style.backgroundColor = '#e74a3b'; // Vermelho
        } else if (percentage < 70) {
            progressBarFill.style.backgroundColor = '#f6c23e'; // Amarelo
        } else {
            progressBarFill.style.backgroundColor = '#1cc88a'; // Verde
        }
    }

    // Adicionar estilos CSS dinamicamente para as animações
    const style = document.createElement('style');
    style.textContent = `
        .loading-dots {
            font-size: 14px;
            color: #6c757d;
            font-weight: 500;
        }
        
        .loading-dots .dots::after {
            content: '';
            animation: dots 1.5s infinite;
        }
        
        @keyframes dots {
            0%, 20% { content: ''; }
            40% { content: '.'; }
            60% { content: '..'; }
            80%, 100% { content: '...'; }
        }
        
        .progress-icon {
            animation: float 3s ease-in-out infinite;
            color: #5a67d8;
            font-weight: 500;
            display: inline-flex;
            align-items: center;
            gap: 5px;
        }
        
        @keyframes float {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-5px); }
        }
        
        .no-data-pulse {
            animation: pulse 2s infinite;
            color: #6c757d;
            font-style: italic;
            text-align: center;
            padding: 10px;
            border-radius: 5px;
            background-color: #f8f9fa;
        }
        
        @keyframes pulse {
            0% { opacity: 0.6; }
            50% { opacity: 1; }
            100% { opacity: 0.6; }
        }
        
        .error-shake {
            animation: shake 0.5s;
            color: #e74a3b;
        }
        
        @keyframes shake {
            0%, 100% { transform: translateX(0); }
            20%, 60% { transform: translateX(-5px); }
            40%, 80% { transform: translateX(5px); }
        }
        
        .resources-icon {
            margin-right: 5px;
            color: #4e73df;
        }
        
        .progress-detail-item {
            margin-bottom: 15px;
        }
        
        .progress-detail-bar {
            height: 10px;
            background-color: #eaecf4;
            border-radius: 5px;
            overflow: hidden;
            margin-bottom: 5px;
        }
        
        .progress-detail-fill {
            height: 100%;
            transition: width 0.5s ease, background-color 0.5s ease;
        }
        
        .progress-detail-text {
            display: flex;
            justify-content: space-between;
            font-size: 14px;
        }
        
        .detail-category {
            font-weight: 600;
            color: #5a5c69;
        }
        
        .detail-percentage {
            font-weight: 700;
            color: #4e73df;
        }
        
        .detail-count {
            color: #858796;
        }
        
        .suggestion-item {
            display: flex;
            align-items: center;
            padding: 10px;
            background-color: #f8f9fa;
            border-radius: 5px;
            margin-bottom: 10px;
            animation: fadeIn 0.5s ease;
        }
        
        .suggestion-icon {
            margin-right: 10px;
            color: #f6c23e;
        }
        
        .suggestion-text {
            flex-grow: 1;
            color: #5a5c69;
        }
        
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }
    `;
    document.head.appendChild(style);

    // Carregar o progresso do usuário quando a página é carregada
    loadUserProgress();

    // Atualizar a cada 30 segundos
    setInterval(loadUserProgress, 30000);
});