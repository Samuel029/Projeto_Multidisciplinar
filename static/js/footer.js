document.addEventListener('DOMContentLoaded', function() {
    
    // Animação de hover para links de navegação
    function initNavLinkEffects() {
        const navLinks = document.querySelectorAll('.footer-nav .nav-link');
        
        navLinks.forEach(link => {
            link.addEventListener('mouseenter', function() {
                this.style.background = 'rgba(255, 255, 255, 0.1)';
                this.style.transform = 'translateX(10px) scale(1.05)';
                
                const icon = this.querySelector('i');
                if (icon) {
                    icon.style.transform = 'rotate(360deg) scale(1.2)';
                    icon.style.transition = 'transform 0.5s ease';
                }
            });
            
            link.addEventListener('mouseleave', function() {
                this.style.background = '';
                this.style.transform = '';
                
                const icon = this.querySelector('i');
                if (icon) {
                    icon.style.transform = '';
                }
            });
        });
    }
    
    // Efeito de digitação para descrição
    function typeWriterEffect() {
        const description = document.querySelector('.footer-description');
        if (!description) return;
        
        const originalText = description.textContent;
        const speed = 50;
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    description.textContent = '';
                    let i = 0;
                    
                    function typeChar() {
                        if (i < originalText.length) {
                            description.textContent += originalText.charAt(i);
                            i++;
                            setTimeout(typeChar, speed);
                        }
                    }
                    
                    setTimeout(typeChar, 500);
                    observer.unobserve(description);
                }
            });
        }, { threshold: 0.5 });
        
        observer.observe(description);
    }
    
    // Animação flutuante para ícones sociais
    function initSocialIconsAnimation() {
        const socialIcons = document.querySelectorAll('.social-icons a');
        
        socialIcons.forEach((icon, index) => {
            const floatAnimation = `
                @keyframes float-${index} {
                    0%, 100% { transform: translateY(0px); }
                    50% { transform: translateY(-10px); }
                }
            `;
            
            if (!document.querySelector('#social-animations')) {
                const style = document.createElement('style');
                style.id = 'social-animations';
                document.head.appendChild(style);
            }
            
            const styleSheet = document.querySelector('#social-animations');
            styleSheet.textContent += floatAnimation;
            
            icon.style.animation = `float-${index} 3s ease-in-out infinite`;
            icon.style.animationDelay = `${index * 0.5}s`;
            
            icon.addEventListener('click', function(e) {
                this.style.animation = 'none';
                this.style.transform = 'scale(0.9)';
                
                setTimeout(() => {
                    this.style.transform = 'scale(1.1)';
                    setTimeout(() => {
                        this.style.transform = '';
                        this.style.animation = `float-${index} 3s ease-in-out infinite`;
                        this.style.animationDelay = `${index * 0.5}s`;
                    }, 150);
                }, 100);
            });
        });
    }
    
    // Efeito de partículas interativas
    function initInteractiveParticles() {
        const footer = document.querySelector('.site-footer');
        if (!footer) return;
        
        footer.addEventListener('mousemove', function(e) {
            const rect = footer.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            const particle = document.createElement('div');
            particle.style.position = 'absolute';
            particle.style.left = x + 'px';
            particle.style.top = y + 'px';
            particle.style.width = '4px';
            particle.style.height = '4px';
            particle.style.background = 'rgba(255, 255, 255, 0.8)';
            particle.style.borderRadius = '50%';
            particle.style.pointerEvents = 'none';
            particle.style.zIndex = '10';
            particle.style.animation = 'particle-fade 1s ease-out forwards';
            
            footer.appendChild(particle);
            
            setTimeout(() => {
                if (particle.parentNode) {
                    particle.parentNode.removeChild(particle);
                }
            }, 1000);
        });
        
        if (!document.querySelector('#particle-animations')) {
            const style = document.createElement('style');
            style.id = 'particle-animations';
            style.textContent = `
                @keyframes particle-fade {
                    0% {
                        opacity: 1;
                        transform: scale(1);
                    }
                    100% {
                        opacity: 0;
                        transform: scale(0) translateY(-20px);
                    }
                }
            `;
            document.head.appendChild(style);
        }
    }
    
    // Efeito de revelar conteúdo ao rolar
    function initScrollReveal() {
        const footerSections = document.querySelectorAll('.footer-logo, .footer-nav, .footer-socials');
        
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                }
            });
        }, observerOptions);
        
        footerSections.forEach((section, index) => {
            section.style.opacity = '0';
            section.style.transform = 'translateY(30px)';
            section.style.transition = `opacity 0.6s ease ${index * 0.2}s, transform 0.6s ease ${index * 0.2}s`;
            observer.observe(section);
        });
    }
    
    // Função para criar efeito de brilho nos links
    function initGlowEffect() {
        const links = document.querySelectorAll('.footer-nav .nav-link, .footer-links a');
        
        links.forEach(link => {
            link.addEventListener('mouseenter', function() {
                this.style.textShadow = '0 0 10px rgba(255, 255, 255, 0.8)';
                this.style.transition = 'text-shadow 0.3s ease';
            });
            
            link.addEventListener('mouseleave', function() {
                this.style.textShadow = '';
            });
        });
    }
    
    // Easter egg com efeito de confetti
    function initEasterEgg() {
        const sequence = ['t', 'e', 'c', 'h'];
        let userSequence = [];
        
        document.addEventListener('keydown', function(e) {
            userSequence.push(e.key.toLowerCase());
            
            if (userSequence.length > sequence.length) {
                userSequence.shift();
            }
            
            if (JSON.stringify(userSequence) === JSON.stringify(sequence)) {
                const footer = document.querySelector('.site-footer');
                footer.style.background = 'linear-gradient(45deg, #ff6b6b, #4ecdc4, #45b7d1, #96ceb4, #ffeaa7)';
                footer.style.backgroundSize = '400% 400%';
                footer.style.animation = 'rainbow 2s ease infinite';
                
                if (!document.querySelector('#easter-egg-styles')) {
                    const style = document.createElement('style');
                    style.id = 'easter-egg-styles';
                    style.textContent = `
                        @keyframes rainbow {
                            0% { background-position: 0% 50%; }
                            50% { background-position: 100% 50%; }
                            100% { background-position: 0% 50%; }
                        }
                        .confetti {
                            position: absolute;
                            width: 8px;
                            height: 8px;
                            background: var(--primary-light);
                            animation: confetti-fall 2s ease-out forwards;
                        }
                        @keyframes confetti-fall {
                            0% { transform: translateY(-100px) rotate(0deg); opacity: 1; }
                            100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
                        }
                    `;
                    document.head.appendChild(style);
                }
                
                // Adiciona confetti
                for (let i = 0; i < 50; i++) {
                    const confetti = document.createElement('div');
                    confetti.className = 'confetti';
                    confetti.style.left = Math.random() * 100 + 'vw';
                    confetti.style.background = `hsl(${Math.random() * 360}, 70%, 50%)`;
                    confetti.style.animationDelay = Math.random() * 0.5 + 's';
                    footer.appendChild(confetti);
                    setTimeout(() => {
                        if (confetti.parentNode) {
                            confetti.parentNode.removeChild(confetti);
                        }
                    }, 2000);
                }
                
                setTimeout(() => {
                    footer.style.background = '';
                    footer.style.animation = '';
                }, 5000);
                
                userSequence = [];
            }
        });
    }
    
    // Função para otimizar performance
    function optimizePerformance() {
        let scrollTimeout;
        const originalScrollHandler = window.onscroll;
        
        window.onscroll = function() {
            if (scrollTimeout) {
                clearTimeout(scrollTimeout);
            }
            
            scrollTimeout = setTimeout(() => {
                if (originalScrollHandler) {
                    originalScrollHandler();
                }
            }, 16);
        };
        
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
        if (prefersReducedMotion.matches) {
            document.documentElement.style.setProperty('--animation-duration', '0s');
        }
    }
    
    // Inicialização de todas as funções
    function init() {
        try {
            initNavLinkEffects();
            typeWriterEffect();
            initSocialIconsAnimation();
            initInteractiveParticles();
            initScrollReveal();
            initGlowEffect();
            initEasterEgg();
            optimizePerformance();
            
            console.log('🚀 Footer TechNoBug inicializado com sucesso!');
        } catch (error) {
            console.error('❌ Erro ao inicializar footer:', error);
        }
    }
    
    init();
    
    window.footerDebug = {
        reinit: init,
        version: '1.0.2',
        features: [
            'Interactive Particles',
            'Typewriter Effect',
            'Social Icons Animation',
            'Scroll Reveal',
            'Glow Effects',
            'Easter Egg with Confetti',
            'Performance Optimization'
        ]
    };
});