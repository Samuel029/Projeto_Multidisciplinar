document.addEventListener('DOMContentLoaded', function() {
    // Atualizar nome de usuário
    document.getElementById('update-username-form').onsubmit = async function(e) {
        e.preventDefault();
        const username = document.getElementById('username').value;
        const msg = document.getElementById('username-msg');
        msg.textContent = "Salvando...";
        try {
            const response = await fetch('/update_username', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({username})
            });
            const data = await response.json();
            msg.textContent = data.message;
            msg.className = data.status === 'success' ? 'msg success' : 'msg error';
            // Atualiza a letra do avatar se não tiver foto
            if (data.status === 'success') {
                const avatarDiv = document.getElementById('profile-pic-avatar');
                if (avatarDiv) {
                    avatarDiv.textContent = username[0].toUpperCase();
                }
            }
        } catch (err) {
            msg.textContent = "Erro ao atualizar nome.";
            msg.className = 'msg error';
        }
    };

    // Preview foto de perfil
    const fileInput = document.getElementById('profile-pic');
    if (fileInput) {
        fileInput.onchange = function(e) {
            const [file] = e.target.files;
            const previewDiv = document.getElementById('profile-pic-preview');
            let img = document.getElementById('profile-pic-preview-img');
            let avatarDiv = document.getElementById('profile-pic-avatar');

            if (file) {
                // Remove a letra se existir
                if (avatarDiv) {
                    avatarDiv.remove();
                }
                // Cria ou mostra o <img>
                if (!img) {
                    img = document.createElement('img');
                    img.id = "profile-pic-preview-img";
                    img.className = "profile-pic-img";
                    img.style.width = "80px";
                    img.style.height = "80px";
                    img.style.borderRadius = "50%";
                    previewDiv.appendChild(img);
                }
                img.src = URL.createObjectURL(file);
                img.style.display = 'block';
            } else {
                // Remove a imagem se existir
                if (img) {
                    img.remove();
                }
                // Cria a letra se não existir
                if (!avatarDiv) {
                    avatarDiv = document.createElement('div');
                    avatarDiv.id = "profile-pic-avatar";
                    avatarDiv.className = "profile-pic-avatar";
                    // Pega a letra do input username
                    avatarDiv.textContent = document.getElementById('username').value[0].toUpperCase();
                    previewDiv.appendChild(avatarDiv);
                }
                avatarDiv.style.display = 'flex';
            }
        }
    }

    // Atualizar foto de perfil
    document.getElementById('update-profile-pic-form').onsubmit = async function(e) {
        e.preventDefault();
        const msg = document.getElementById('profile-pic-msg');
        msg.textContent = "Salvando...";
        const formData = new FormData();
        const fileInput = document.getElementById('profile-pic');
        if (fileInput.files.length === 0) {
            msg.textContent = "Selecione uma imagem!";
            msg.className = 'msg error';
            return;
        }
        formData.append('profile_pic', fileInput.files[0]);
        try {
            const response = await fetch('/update_profile_pic', {
                method: 'POST',
                body: formData
            });
            const data = await response.json();
            msg.textContent = data.message;
            msg.className = data.status === 'success' ? 'msg success' : 'msg error';
            if (data.status === 'success' && data.new_url) {
                const previewDiv = document.getElementById('profile-pic-preview');
                let img = document.getElementById('profile-pic-preview-img');
                let avatarDiv = document.getElementById('profile-pic-avatar');
                if (avatarDiv) avatarDiv.remove();
                if (!img) {
                    img = document.createElement('img');
                    img.id = "profile-pic-preview-img";
                    img.className = "profile-pic-img";
                    img.style.width = "80px";
                    img.style.height = "80px";
                    img.style.borderRadius = "50%";
                    previewDiv.appendChild(img);
                }
                img.src = data.new_url + '?t=' + Date.now();
                img.style.display = 'block';
            }
        } catch (err) {
            msg.textContent = "Erro ao atualizar foto.";
            msg.className = 'msg error';
        }
    };
});