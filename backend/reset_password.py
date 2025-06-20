from flask import Blueprint, request, jsonify, render_template, flash, current_app
from backend.models import User, ResetCode
from backend.extensions import db
from werkzeug.security import generate_password_hash
from firebase_admin import auth
import random
import string
from datetime import datetime, timedelta
import logging

# Configurar logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

reset_bp = Blueprint('reset', __name__)

def generate_reset_code():
    """Gera um código de 6 dígitos."""
    return ''.join(random.choices(string.digits, k=6))

def send_reset_email(to_email, subject, html_content):
    """Envia e-mail via SMTP usando Flask-Mail"""
    from app import mail  # importa o mail já inicializado no app.py
    from flask_mail import Message

    sender = current_app.config.get('MAIL_DEFAULT_SENDER', 'technobugproject@gmail.com')
    msg = Message(subject, recipients=[to_email], html=html_content, sender=sender)
    mail.send(msg)

@reset_bp.route('/reset_password', methods=['GET'])
def reset_password_form():
    return render_template('reset_password.html')

@reset_bp.route('/reset_password', methods=['POST'])
def reset_password():
    email = request.form.get('email')

    if not email:
        logger.warning("Tentativa de recuperação de senha sem email fornecido")
        flash('Por favor, forneça um email.', 'error')
        return jsonify({'status': 'error', 'message': 'Por favor, forneça um email.'}), 400

    # 1. Checar se é usuário local
    local_user = User.query.filter_by(email=email).first()
    found_in_firebase = False

    if not local_user:
        # Se não for local, tente Firebase (login Google)
        try:
            user = auth.get_user_by_email(email)
            logger.info(f"Usuário encontrado no Firebase: {user.email}, UID: {user.uid}")
            found_in_firebase = True
        except auth.UserNotFoundError:
            logger.warning(f"Tentativa de recuperação de senha para email não registrado: {email}")
            flash('Email não registrado.', 'error')
            return jsonify({'status': 'error', 'message': 'Email não registrado.'}), 404

    code = generate_reset_code()
    expires_at = datetime.utcnow() + timedelta(minutes=10)

    reset_code = ResetCode(email=email, code=code, expires_at=expires_at)
    db.session.add(reset_code)
    db.session.commit()

    subject = 'Código de Redefinição de Senha - TechnoBug'
    html_content = f"""
    <p>Olá,</p>
    <p>Seu código de redefinição de senha é: <strong>{code}</strong></p>
    <p>Este código expira em 10 minutos.</p>
    <p>Se você não solicitou esta redefinição, ignore este e-mail.</p>
    <p>Atenciosamente,<br>Equipe TechnoBug</p>
    """

    send_reset_email(email, subject, html_content)

    logger.info(f"Email com código de redefinição enviado para: {email}")
    flash('Um código de redefinição foi enviado para o seu e-mail. Verifique sua caixa de entrada ou spam.', 'success')
    return jsonify({
        'status': 'success',
        'message': 'Um código de redefinição foi enviado para o seu e-mail. Verifique sua caixa de entrada ou spam.',
        'email': email
    })

@reset_bp.route('/verify_reset_code', methods=['GET'])
def verify_reset_code_form():
    email = request.args.get('email')
    return render_template('verify_reset_code.html', email=email)

@reset_bp.route('/verify_reset_code', methods=['POST'])
def verify_reset_code():
    email = request.form.get('email')
    code = request.form.get('code')
    new_password = request.form.get('new_password')
    confirm_password = request.form.get('confirm_password')

    if not all([email, code, new_password, confirm_password]):
        logger.warning("Campos incompletos na verificação do código")
        flash('Por favor, preencha todos os campos.', 'error')
        return jsonify({'status': 'error', 'message': 'Por favor, preencha todos os campos.'}), 400

    if new_password != confirm_password:
        logger.warning(f"Senhas não coincidem para {email}")
        flash('As senhas não coincidem.', 'error')
        return jsonify({'status': 'error', 'message': 'As senhas não coincidem.'}), 400

    reset_code = ResetCode.query.filter_by(email=email, code=code).first()
    if not reset_code:
        logger.warning(f"Código inválido para {email}")
        flash('Código inválido.', 'error')
        return jsonify({'status': 'error', 'message': 'Código inválido.'}), 404

    if datetime.utcnow() > reset_code.expires_at:
        logger.warning(f"Código expirado para {email}")
        db.session.delete(reset_code)
        db.session.commit()
        flash('O código expirou. Solicite um novo.', 'error')
        return jsonify({'status': 'error', 'message': 'O código expirou. Solicite um novo.'}), 400

    # Checar se é usuário local
    local_user = User.query.filter_by(email=email).first()
    if local_user:
        # Só atualiza local
        local_user.password = generate_password_hash(new_password)
        db.session.commit()
        logger.info(f"Senha atualizada no banco local para {email}")
    else:
        # Atualiza no Firebase e cria/sincroniza local
        try:
            user = auth.get_user_by_email(email)
            if len(new_password) < 6:
                logger.error(f"Erro ao verificar código para {email}: Password menor que 6 caracteres.")
                flash('A senha deve ter pelo menos 6 caracteres.', 'error')
                return jsonify({'status': 'error', 'message': 'A senha deve ter pelo menos 6 caracteres.'}), 400

            auth.update_user(user.uid, password=new_password)
            logger.info(f"Senha atualizada no Firebase para {email}")

            local_user = User(
                username=email.split('@')[0],
                email=email,
                password=generate_password_hash(new_password)
            )
            db.session.add(local_user)
            db.session.commit()
            logger.info(f"Usuário local criado/sincronizado para {email}")
        except auth.UserNotFoundError:
            logger.warning(f"Usuário não encontrado no Firebase durante verificação: {email}")
            flash('Email não registrado.', 'error')
            return jsonify({'status': 'error', 'message': 'Email não registrado.'}), 404
        except Exception as e:
            db.session.rollback()
            logger.error(f"Erro ao atualizar senha no Firebase para {email}: {str(e)}")
            flash(f'Erro ao atualizar senha no Firebase: {str(e)}', 'error')
            return jsonify({'status': 'error', 'message': f'Erro ao atualizar senha no Firebase: {str(e)}'}), 500

    db.session.delete(reset_code)
    db.session.commit()

    flash('Senha redefinida com sucesso! Faça login com sua nova senha.', 'success')
    return jsonify({
        'status': 'success',
        'message': 'Senha redefinida com sucesso! Faça login com sua nova senha.'
    })