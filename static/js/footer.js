document.addEventListener('DOMContentLoaded', () => {
    // Animate social icons on hover
    const socialIcons = document.querySelectorAll('.social-icons a');
    socialIcons.forEach(icon => {
        icon.addEventListener('mouseenter', () => {
            icon.style.transition = 'transform 0.3s ease, color 0.3s ease, box-shadow 0.3s ease';
            icon.style.transform = 'scale(1.3) rotate(10deg)';
            icon.style.boxShadow = '0 0 10px rgba(74, 145, 255, 0.8)';
        });
        icon.addEventListener('mouseleave', () => {
            icon.style.transform = 'scale(1) rotate(0deg)';
            icon.style.boxShadow = 'none';
        });
    });

    // Animate nav links on hover
    const navLinks = document.querySelectorAll('.footer-nav .nav-link');
    navLinks.forEach(link => {
        link.addEventListener('mouseenter', () => {
            link.style.transition = 'transform 0.3s ease, color 0.3s ease, box-shadow 0.3s ease';
            link.style.transform = 'translateX(8px)';
            link.style.boxShadow = '0 0 5px rgba(74, 145, 255, 0.5)';
        });
        link.addEventListener('mouseleave', () => {
            link.style.transform = 'translateX(0)';
            link.style.boxShadow = 'none';
        });
    });
});