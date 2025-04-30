from flask import Flask, render_template, request, redirect, url_for, flash, session, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime
import os
import firebase_admin
from firebase_admin import auth, credentials
from firebase_admin.auth import InvalidIdTokenError, ExpiredIdTokenError, RevokedIdTokenError
from uuid import uuid4
import re
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = Flask(__name__)
app.config.from_object('backend.config.Config')
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', os.urandom(24).hex())
app.config['SESSION_COOKIE_SECURE'] = True  # Requires HTTPS in production
app.config['SESSION_COOKIE_HTTPONLY'] = True
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'

db = SQLAlchemy(app)
migrate = Migrate(app, db)

# Rate limiting
limiter = Limiter(
    app=app,
    key_func=get_remote_address,
    default_limits=["200 per day", "50 per hour"]
)

# Initialize Firebase
try:
    cred = credentials.Certificate('technobug-6daca-firebase-adminsdk-fbsvc-19273e6f57.json')
    firebase_admin.initialize_app(cred)
except FileNotFoundError:
    print("Erro: Arquivo de credenciais do Firebase não encontrado.")
    raise
except Exception as e:
    print(f"Erro ao inicializar Firebase: {str(e)}")
    raise

# Models
class User(db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(64), index=True, nullable=False)
    email = db.Column(db.String(120), index=True, unique=True, nullable=False)
    password = db.Column(db.String(128), nullable=True)  # Nullable for Firebase users
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f'<User {self.username}>'

class Post(db.Model):
    __tablename__ = 'posts'
    
    id = db.Column(db.Integer, primary_key=True)
    content = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    
    author = db.relationship('User', backref=db.backref('posts', lazy=True))
    
    def __repr__(self):
        return f'<Post {self.id} by {self.author.username}>'

# CSRF Token Generation
@app.before_request
def generate_csrf_token():
    if 'csrf_token' not in session:
        session['csrf_token'] = str(uuid4())

# Password Strength Validation
def is_strong_password(password):
    pattern = r'^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$'
    return re.match(pattern, password)

@app.route('/', methods=['GET', 'POST'])
@limiter.limit("5 per minute")  # Limit login attempts
def registroelogin():
    user_id = session.get('user_id')
    if user_id:
        user = db.session.get(User, user_id)
        if not user:
            session.clear()
        else:
            return redirect(url_for('telainicial'))

    if request.method == 'POST':
        # Validate CSRF token
        if request.form.get('csrf_token') != session.get('csrf_token'):
            flash('Token CSRF inválido.', 'error')
            return redirect(url_for('registroelogin'))
        session['csrf_token'] = str(uuid4())  # Regenerate CSRF token

        if 'login' in request.form:
            email = request.form.get('email')
            password = request.form.get('password')
            
            if not email or not password:
                flash('Por favor, preencha todos os campos.', 'error')
                return redirect(url_for('registroelogin'))
            
            user = User.query.filter_by(email=email).first()
            if user and user.password and check_password_hash(user.password, password):
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
                
            if not is_strong_password(password):
                flash('A senha deve ter pelo menos 8 caracteres, incluindo 1 maiúscula, 1 minúscula, 1 número e 1 caractere especial.', 'error')
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
    
    return render_template('registroelogin.html', csrf_token=session['csrf_token'])

@app.route('/verify-token', methods=['POST'])
def verify_token():
    id_token = request.json.get('idToken')
    try:
        decoded_token = auth.verify_id_token(id_token)
        email = decoded_token.get('email')
        username = decoded_token.get('name', email.split('@')[0])
        uid = decoded_token['uid']

        user = User.query.filter_by(email=email).first()
        if not user:
            user = User(
                username=username,
                email=email,
                password=''  # No password for Firebase users
            )
            db.session.add(user)
            db.session.commit()

        session['user_id'] = user.id
        session['username'] = user.username
        
        return jsonify({'status': 'success', 'user': {'id': user.id, 'username': user.username, 'email': user.email}})
    except InvalidIdTokenError as e:
        print(f"Invalid token: {str(e)}")
        return jsonify({'status': 'error', 'message': 'Token inválido.'}), 401
    except ExpiredIdTokenError as e:
        print(f"Expired token: {str(e)}")
        return jsonify({'status': 'error', 'message': 'Token expirado.'}), 401
    except RevokedIdTokenError as e:
        print(f"Revoked token: {str(e)}")
        return jsonify({'status': 'error', 'message': 'Token revogado.'}), 401
    except Exception as e:
        print(f"Erro ao verificar token: {str(e)}")
        return jsonify({'status': 'error', 'message': 'Erro ao verificar token. Verifique a sincronização do relógio do dispositivo.'}), 401

@app.route('/materiais-de-estudo')
def materiais():
    return render_template('materiaisestudo.html')

@app.route('/pdfs-e-apostilas')
def pdfs():
    return render_template('pdfeapostilas.html')

@app.route('/videos-e-tutoriais')
def videos():
    return render_template('videosetutoriais.html')

@app.route('/codigo')
def codigo():
    return render_template('exemplosdecodigo.html')

@app.route('/telainicial', methods=['GET', 'POST'])
def telainicial():
    user_id = session.get('user_id')
    if not user_id:
        flash('Por favor, faça login para acessar esta página.', 'error')
        return redirect(url_for('registroelogin'))
    
    user = db.session.get(User, user_id)
    if not user:
        session.clear()
        flash('Sua sessão expirou ou o usuário não existe mais.', 'error')
        return redirect(url_for('registroelogin'))
    
    if request.method == 'POST':
        content = request.form.get('content')
        if content:
            new_post = Post(content=content, user_id=user.id)
            db.session.add(new_post)
            db.session.commit()
            flash('Postagem publicada com sucesso!', 'success')
            return redirect(url_for('telainicial'))
    
    posts = Post.query.order_by(Post.created_at.desc()).all()
    
    return render_template('telainicial.html', user=user, posts=posts)

@app.route('/logout')
def logout():
    session.clear()
    flash('Você saiu da sua conta.', 'info')
    return redirect(url_for('registroelogin'))

@app.route('/delete_post/<int:post_id>', methods=['POST'])
def delete_post(post_id):
    if 'user_id' not in session:
        flash('Por favor, faça login para realizar esta ação.', 'error')
        return redirect(url_for('registroelogin'))
    
    post = Post.query.get_or_404(post_id)
    
    if post.user_id != session['user_id']:
        flash('Você não tem permissão para deletar esta postagem.', 'error')
        return redirect(url_for('telainicial'))
    
    db.session.delete(post)
    db.session.commit()
    flash('Postagem deletada com sucesso!', 'success')
    return redirect(url_for('telainicial'))

with app.app_context():
    db.create_all()

if __name__ == '__main__':
    app.run(debug=True)