from flask import Flask, render_template, request, redirect, url_for, flash, session, jsonify
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime
import os
import firebase_admin
from firebase_admin import auth, credentials
from flask_migrate import Migrate
import logging

# Configurar logging para depuração
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

app = Flask(__name__)
app.config.from_object('backend.config.Config')
db = SQLAlchemy(app)
migrate = Migrate(app, db)

# Criar pasta instance se não existir
instance_dir = app.config['INSTANCE_DIR']
if not os.path.exists(instance_dir):
    try:
        os.makedirs(instance_dir)
        logger.info(f"Pasta instance criada em: {instance_dir}")
    except Exception as e:
        logger.error(f"Erro ao criar pasta instance: {str(e)}")
        raise

# Log do caminho do banco de dados
logger.info(f"SQLALCHEMY_DATABASE_URI: {app.config['SQLALCHEMY_DATABASE_URI']}")

# Verificar permissões de escrita no diretório instance
try:
    test_file = os.path.join(instance_dir, 'test_write.txt')
    with open(test_file, 'w') as f:
        f.write('test')
    os.remove(test_file)
    logger.info(f"Permissões de escrita verificadas com sucesso em: {instance_dir}")
except Exception as e:
    logger.error(f"Erro de permissão no diretório instance: {str(e)}")
    raise

# Inicializar Firebase
try:
    cred = credentials.Certificate('technobug-6daca-firebase-adminsdk-fbsvc-19273e6f57.json')
    firebase_admin.initialize_app(cred)
    logger.info("Firebase inicializado com sucesso")
except Exception as e:
    logger.error(f"Erro ao inicializar Firebase: {str(e)}")

class User(db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(64), index=True, nullable=False)
    email = db.Column(db.String(120), index=True, unique=True, nullable=False)
    password = db.Column(db.String(128), nullable=True)  # Permitir nulo para autenticação Google
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f'<User {self.username}>'

class Post(db.Model):
    __tablename__ = 'posts'
    
    id = db.Column(db.Integer, primary_key=True)
    content = db.Column(db.Text, nullable=False)
    category = db.Column(db.String(50), nullable=False, default='Dúvidas Gerais')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    
    author = db.relationship('User', backref=db.backref('posts', lazy=True))
    
    def __repr__(self):
        return f'<Post {self.id} by {self.author.username}>'

@app.route('/', methods=['GET', 'POST'])
def registroelogin():
    user_id = session.get('user_id')
    if user_id:
        user = db.session.get(User, user_id)
        if not user:
            session.clear()
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
                
            existing_user = User.query.filter_by(email=email).first()
            if existing_user:
                flash('Este email já está em uso.', 'error')
                return redirect(url_for('registroelogin'))
                
            new_user = User(
                username=username,
                email=email,
                password=generate_password_hash(password)
            )
            try:
                db.session.add(new_user)
                db.session.commit()
                flash('Conta criada com sucesso! Faça login para continuar.', 'success')
            except Exception as e:
                db.session.rollback()
                logger.error(f"Erro ao criar usuário: {str(e)}")
                flash('Erro ao criar conta. Tente novamente.', 'error')
            
            return redirect(url_for('registroelogin'))
    
    return render_template('registroelogin.html')

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
                password=''  # Sem senha para autenticação Google
            )
            try:
                db.session.add(user)
                db.session.commit()
                logger.info(f"Usuário {email} criado com sucesso")
            except Exception as e:
                db.session.rollback()
                logger.error(f"Erro ao criar usuário no banco: {str(e)}")
                return jsonify({'status': 'error', 'message': 'Erro ao criar usuário no banco de dados'}), 500
        
        session['user_id'] = user.id
        session['username'] = user.username
        
        return jsonify({'status': 'success', 'user': {'id': user.id, 'username': user.username, 'email': user.email}})
    except auth.ExpiredIdTokenError:
        logger.warning("Token expirado recebido")
        return jsonify({'status': 'error', 'message': 'Token expirado. Faça login novamente.'}), 401
    except Exception as e:
        logger.error(f"Erro ao verificar token: {str(e)}")
        return jsonify({'status': 'error', 'message': 'Erro ao verificar token'}), 401

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
        category = request.form.get('category')
        if content and category:
            new_post = Post(content=content, category=category, user_id=user.id)
            try:
                db.session.add(new_post)
                db.session.commit()
                flash('Postagem publicada com sucesso!', 'success')
            except Exception as e:
                db.session.rollback()
                logger.error(f"Erro ao criar postagem: {str(e)}")
                flash('Erro ao publicar postagem. Tente novamente.', 'error')
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
        return jsonify({'status': 'error', 'message': 'Por favor, faça login para realizar esta ação.'}), 401
    
    post = Post.query.get_or_404(post_id)
    
    if post.user_id != session['user_id']:
        return jsonify({'status': 'error', 'message': 'Você não tem permissão para deletar esta postagem.'}), 403
    
    try:
        db.session.delete(post)
        db.session.commit()
        return jsonify({'status': 'success', 'message': 'Postagem deletada com sucesso!'})
    except Exception as e:
        db.session.rollback()
        logger.error(f"Erro ao deletar postagem: {str(e)}")
        return jsonify({'status': 'error', 'message': 'Erro ao deletar postagem. Tente novamente.'}), 500

with app.app_context():
    try:
        # Verificar se o diretório do banco de dados é acessível
        db_path = os.path.join(instance_dir, 'app.db')
        if not os.path.exists(instance_dir):
            logger.error(f"Diretório instance não encontrado: {instance_dir}")
            raise FileNotFoundError(f"Diretório instance não encontrado: {instance_dir}")
        
        # Tentar abrir o arquivo do banco de dados
        with open(db_path, 'a'):
            pass  # Apenas verificar se é possível criar/acessar o arquivo
        
        db.create_all()
        logger.info("Tabelas do banco de dados criadas com sucesso")
    except Exception as e:
        logger.error(f"Erro ao criar tabelas do banco de dados: {str(e)}")
        raise

if __name__ == '__main__':
    app.run(debug=True)