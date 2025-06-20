document.addEventListener('DOMContentLoaded', () => {
    // Pré-visualização da foto de perfil
    const profilePicInput = document.getElementById('profile-pic');
    const profilePicPreview = document.getElementById('profile-pic-preview');
    const profilePicPreviewImg = document.getElementById('profile-pic-preview-img');
    const profilePicAvatar = document.getElementById('profile-pic-avatar');

    if (profilePicInput) {
        profilePicInput.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    if (profilePicPreviewImg) {
                        profilePicPreviewImg.src = e.target.result;
                        profilePicPreviewImg.style.display = 'block';
                        if (profilePicAvatar) {
                            profilePicAvatar.style.display = 'none';
                        }
                    } else {
                        const img = document.createElement('img');
                        img.id = 'profile-pic-preview-img';
                        img.className = 'profile-pic-img rounded-circle';
                        img.src = e.target.result;
                        img.style.width = '80px';
                        img.style.height = '80px';
                        img.style.objectFit = 'cover';
                        profilePicPreview.innerHTML = '';
                        profilePicPreview.appendChild(img);
                    }
                };
                reader.readAsDataURL(file);
            }
        });
    }

    // Envio do formulário de nome de usuário
    const usernameForm = document.getElementById('update-username-form');
    const usernameMsg = document.getElementById('username-msg');

    if (usernameForm) {
        usernameForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const username = document.getElementById('username').value;

            try {
                const response = await fetch(usernameForm.action, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ username }),
                });

                const result = await response.json();
                usernameMsg.textContent = result.message;

                if (response.ok) {
                    usernameMsg.classList.remove('error');
                    usernameMsg.classList.add('success');
                } else {
                    usernameMsg.classList.remove('success');
                    usernameMsg.classList.add('error');
                }
            } catch (error) {
                usernameMsg.textContent = 'Erro ao atualizar o nome de usuário.';
                usernameMsg.classList.remove('success');
                usernameMsg.classList.add('error');
            }
        });
    }

    // Envio do formulário de foto de perfil
    const profilePicForm = document.getElementById('update-profile-pic-form');
    const profilePicMsg = document.getElementById('profile-pic-msg');

    if (profilePicForm) {
        profilePicForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const formData = new FormData(profilePicForm);

            try {
                const response = await fetch(profilePicForm.action, {
                    method: 'POST',
                    body: formData,
                });

                const result = await response.json();
                profilePicMsg.textContent = result.message;

                if (response.ok) {
                    profilePicMsg.classList.remove('error');
                    profilePicMsg.classList.add('success');
                    // Atualizar a imagem no menu offcanvas
                    const offcanvasAvatarImg = document.querySelector('.offcanvas .profile-pic-img');
                    const offcanvasAvatarInitials = document.querySelector('.offcanvas .avatar-initials');
                    if (offcanvasAvatarImg && result.profile_pic) {
                        offcanvasAvatarImg.src = result.profile_pic;
                        offcanvasAvatarImg.style.display = 'block';
                        if (offcanvasAvatarInitials) {
                            offcanvasAvatarInitials.style.display = 'none';
                        }
                    }
                } else {
                    profilePicMsg.classList.remove('success');
                    profilePicMsg.classList.add('error');
                }
            } catch (error) {
                profilePicMsg.textContent = 'Erro ao atualizar a foto de perfil.';
                profilePicMsg.classList.remove('success');
                profilePicMsg.classList.add('error');
            }
        });
    }
});