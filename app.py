from flask import Flask, render_template, request, redirect, url_for, flash, session
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
import os
from backend.config import Config
from backend.extensions import db

app = Flask(__name__)
app.config.from_object(Config)
db.init_app(app)

with app.app_context():
    from backend.models import User
    db.create_all()

@app.route('/', methods=['GET', 'POST'])
def registroelogin():
    from backend.models import User

    # Verifica se há sessão e se o usuário ainda existe no banco
    user_id = session.get('user_id')
    if user_id:
        user = db.session.get(User, user_id)  # Usando a forma recomendada para SQLAlchemy 2.0
        if not user:
            session.clear()  # Limpa a sessão se o usuário não existir mais
        else:
            return redirect(url_for('telainicial'))

    if request.method == 'POST':
        if 'login' in request.form:
            email = request.form.get('email')
            password = request.form.get('password')
            
            if not email or not password:
                flash('Por favor, preencha todos os campos.', 'error')
                return redirect(url_for('registroelogin'))
            
            user = User.query.filter_by(email=email).first()
            if user and check_password_hash(user.password, password):
                session['user_id'] = user.id
                session['username'] = user.username
                flash(f'Bem-vindo de volta, {user.username}!', 'success')
                return redirect(url_for('telainicial'))
            else:
                flash('Email ou senha incorretos.', 'error')
                return redirect(url_for('registroelogin'))
                
        elif 'register' in request.form:
            username = request.form.get('username')
            email = request.form.get('email')
            password = request.form.get('password')
            confirm_password = request.form.get('confirm_password')
            
            if not username or not email or not password or not confirm_password:
                flash('Por favor, preencha todos os campos.', 'error')
                return redirect(url_for('registroelogin'))
                
            if password != confirm_password:
                flash('As senhas não coincidem.', 'error')
                return redirect(url_for('registroelogin'))
                
            existing_user = User.query.filter_by(email=email).first()
            if existing_user:
                flash('Este email já está em uso.', 'error')
                return redirect(url_for('registroelogin'))
                
            new_user = User(
                username=username,
                email=email,
                password=generate_password_hash(password)
            )
            db.session.add(new_user)
            db.session.commit()
            
            flash('Conta criada com sucesso! Faça login para continuar.', 'success')
            return redirect(url_for('registroelogin'))
    
    return render_template('registroelogin.html')

@app.route('/telainicial')
def telainicial():
    from backend.models import User
    user_id = session.get('user_id')
    if not user_id:
        flash('Por favor, faça login para acessar esta página.', 'error')
        return redirect(url_for('registroelogin'))
    
    user = db.session.get(User, user_id)
    if not user:
        session.clear()
        flash('Sua sessão expirou ou o usuário não existe mais.', 'error')
        return redirect(url_for('registroelogin'))
    
    return render_template('telainicial.html', user=user)

@app.route('/logout')
def logout():
    session.clear()
    flash('Você saiu da sua conta.', 'info')
    return redirect(url_for('registroelogin'))

if __name__ == '__main__':
    app.run(debug=True)