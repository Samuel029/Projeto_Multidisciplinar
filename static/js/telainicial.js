document.addEventListener('DOMContentLoaded', function() {
    // Elementos da interface
    const preloader = document.querySelector('.preloader');
    const navbar = document.querySelector('.navbar');
    const postForm = document.getElementById('postForm');
    const postTextarea = document.querySelector('textarea[name="content"]');
    const usernameHighlight = document.querySelector('.username-highlight');
    const sideMenu = document.getElementById('sideMenu');

    // Inicializa componentes
    initializeComponents();

    // Configura eventos
    setupScrollEffects();
    setupPostForm();
    setupThemeSwitch();
    setupDrawer();

    // Função para inicializar componentes
    function initializeComponents() {
        // Remove preloader
        setTimeout(() => {
            preloader.classList.add('loaded');
            setTimeout(() => preloader.style.display = 'none', 500);
        }, 800);

        // Efeito de digitação no nome do usuário
        if (usernameHighlight) {
            typeWriterEffect(usernameHighlight, usernameHighlight.textContent);
        }
    }

    // Efeito de máquina de escrever
    function typeWriterEffect(element, text) {
        let i = 0;
        element.textContent = '';
        function type() {
            if (i < text.length) {
                element.textContent += text.charAt(i);
                i++;
                setTimeout(type, 80);
            }
        }
        type();
    }

    // Configura efeitos de scroll com debouncing
    function setupScrollEffects() {
        let scrollTimeout;
        window.addEventListener('scroll', function() {
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(() => {
                if (window.scrollY > 50) {
                    navbar.classList.add('scrolled');
                } else {
                    navbar.classList.remove('scrolled');
                }
            }, 80);
        });
    }

    // Configura formulário de postagem
    function setupPostForm() {
        if (!postForm || !postTextarea) return;

        const charCounter = postForm.querySelector('.char-counter');
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

        const publishButton = postForm.querySelector('.btn-publish');
        publishButton.addEventListener('click', function(e) {
            if (postTextarea.value.trim() === '') {
                e.preventDefault();
                showNotification('Digite algo para publicar', 'error');
                postTextarea.focus();
            } else {
                showNotification('Postagem enviada com sucesso!', 'success');
            }
        });
    }

    // Configura switch de tema
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

    // Configura comportamento do drawer
    function setupDrawer() {
        const drawerLinks = document.querySelectorAll('.offcanvas .nav-link');
        drawerLinks.forEach(link => {
            link.addEventListener('click', function() {
                const bsOffcanvas = bootstrap.Offcanvas.getInstance(sideMenu);
                if (bsOffcanvas) bsOffcanvas.hide();
            });
        });

        // Fecha o drawer ao clicar fora
        document.addEventListener('click', function(event) {
            const isClickInsideDrawer = sideMenu.contains(event.target);
            const isClickOnToggler = event.target.closest('.navbar-toggler');
            if (!isClickInsideDrawer && !isClickOnToggler && sideMenu.classList.contains('show')) {
                const bsOffcanvas = bootstrap.Offcanvas.getInstance(sideMenu);
                if (bsOffcanvas) bsOffcanvas.hide();
            }
        });
    }

    // Função para mostrar notificações
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