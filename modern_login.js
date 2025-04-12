document.addEventListener('DOMContentLoaded', function() {
    const container = document.getElementById('container');
    const criarBtn = document.getElementById('criar');
    const loginBtn = document.getElementById('login');

    // Verificar se os botões existem antes de adicionar os event listeners
    if (criarBtn) {
        criarBtn.addEventListener('click', () => {
            container.classList.add("active");
        });
    }

    if (loginBtn) {
        loginBtn.addEventListener('click', () => {
            container.classList.remove("active");
        });
    }

    // Auto-hide de mensagens flash após 5 segundos
    const alerts = document.querySelectorAll('.alert');
    alerts.forEach(alert => {
        setTimeout(() => {
            alert.style.opacity = '0';
            setTimeout(() => {
                alert.style.display = 'none';
            }, 500);
        }, 5000);
    });
});