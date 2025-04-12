document.addEventListener('DOMContentLoaded', function() {
    const container = document.getElementById('container');
    const criarBtn = document.getElementById('criar');
    const loginBtn = document.getElementById('login');

    if (criarBtn) {
        criarBtn.addEventListener('click', ()=>{
            container.classList.add("active");
        });
    }

    if (loginBtn) {
        loginBtn.addEventListener('click', ()=>{
            container.classList.remove("active");
        });
    }

    const closeButtons = document.querySelectorAll('.close-btn');
    closeButtons.forEach(button => {
        button.addEventListener('click', function() {
            this.parentElement.style.display = 'none';
        });
    });

    setTimeout(() => {
        const flashMessages = document.querySelectorAll('.flash-message');
        flashMessages.forEach(message => {
            message.style.display = 'none';
        });
    }, 5000);
});