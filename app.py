from flask import Flask, render_template, request, redirect, url_for, flash, session, send_from_directory, jsonify
from backend.progress_tracker import ProgressTracker
from functools import wraps
from werkzeug.exceptions import BadRequest
from werkzeug.security import generate_password_hash, check_password_hash
from backend.extensions import db
from backend.models import User, Post, Comment, Like, ResetCode, CodeExample
from datetime import datetime
import os 
import firebase_admin
from firebase_admin import auth, credentials
from flask_migrate import Migrate
from backend.reset_password import reset_bp
import logging
from flask_caching import Cache
from flask_mail import Mail
from werkzeug.utils import secure_filename
import unicodedata
from backend.config import ActiveConfig

# Configurar logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

app = Flask(__name__)
app.config.from_object(ActiveConfig)

# Inicializar Cache
cache = Cache(app, config={'CACHE_TYPE': 'simple'})

# Configurar diretórios para PDFs e JSON
PDFS_FOLDER = os.path.join(app.root_path, 'pdfs')
DATA_FOLDER = os.path.join(app.root_path, 'data')
app.config['PDFS_FOLDER'] = PDFS_FOLDER
app.config['DATA_FOLDER'] = DATA_FOLDER

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB limit for profile pictures

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# Configuração do Flask-Mail para Brevo SMTP
app.config['MAIL_SERVER'] = 'smtp-relay.brevo.com'
app.config['MAIL_PORT'] = 587
app.config['MAIL_USE_TLS'] = True
app.config['MAIL_USERNAME'] = '901acc001@smtp-brevo.com'
app.config['MAIL_PASSWORD'] = 'VPt45nhgXkBxjEy6'
app.config['MAIL_DEFAULT_SENDER'] = 'technobugproject@gmail.com'

mail = Mail(app)

db.init_app(app)
migrate = Migrate(app, db)

# Registrar o blueprint de recuperação de senha
app.register_blueprint(reset_bp)

# Criar pastas instance, pdfs e data se não existirem
instance_dir = app.config['INSTANCE_DIR']
for directory in [instance_dir, PDFS_FOLDER, DATA_FOLDER]:
    if not os.path.exists(directory):
        try:
            os.makedirs(directory)
            logger.info(f"Pasta criada em: {directory}")
        except Exception as e:
            logger.error(f"Erro ao criar pasta {directory}: {str(e)}")
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

cred_path = 'technobug-6daca-firebase-adminsdk-fbsvc-19273e6f57.json'

if not os.path.exists(cred_path):
    logger.error(f"Arquivo de credenciais Firebase não encontrado: {cred_path}")
    raise FileNotFoundError(f"Arquivo de credenciais Firebase não encontrado: {cred_path}")

try:
    if not firebase_admin._apps:
        cred = credentials.Certificate(cred_path)
        firebase_admin.initialize_app(cred)
        logger.info("Firebase inicializado com sucesso")
    else:
        logger.info("Firebase já estava inicializado")
except Exception as e:
    logger.error(f"Erro ao inicializar Firebase: {str(e)}")
    raise

def normalize_filename(filename):
    """Normaliza o nome do arquivo, removendo acentos e convertendo para minúsculas."""
    normalized = unicodedata.normalize('NFKD', filename).encode('ASCII', 'ignore').decode('ASCII')
    return normalized.lower()

def find_file_case_insensitive(directory, target_filename):
    """Busca um arquivo no diretório de forma case-insensitive."""
    target_normalized = normalize_filename(target_filename)
    try:
        for filename in os.listdir(directory):
            if normalize_filename(filename) == target_normalized:
                return filename
        return None
    except Exception as e:
        logger.error(f"Erro ao listar arquivos em {directory}: {str(e)}")
        return None

def track_page_visit(page_name):
    """Decorator para rastrear visitas às páginas"""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            result = f(*args, **kwargs)
            if 'user_id' in session:
                ProgressTracker.track_page_visit(session['user_id'], page_name)
            return result
        return decorated_function
    return decorator

def track_user_activity(activity_type):
    """Registra atividade do usuário para cálculo de progresso"""
    if 'user_id' not in session:
        return
    user = db.session.get(User, session['user_id'])
    if user:
        user.last_activity = datetime.utcnow()
        try:
            db.session.commit()
        except Exception as e:
            db.session.rollback()
            logger.error(f"Erro ao rastrear atividade: {str(e)}")

@app.errorhandler(404)
def page_not_found(e):
    logger.error(f"Erro 404: {request.url}")
    return render_template('404.html'), 404

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/telainicial')
@track_page_visit('telainicial')
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
    posts = Post.query.options(
        db.joinedload(Post.author),
        db.joinedload(Post.likes)
    ).order_by(Post.created_at.desc()).limit(10).all()
    return render_template('telainicial.html', user=user, posts=posts)

@app.route('/post/<int:post_id>', methods=['GET'])
def post_comments(post_id):
    user_id = session.get('user_id')
    if not user_id:
        flash('Por favor, faça login para acessar esta página.', 'error')
        return redirect(url_for('registroelogin'))
    user = db.session.get(User, user_id)
    if not user:
        session.clear()
        flash('Sua sessão expirou ou o usuário não existe mais.', 'error')
        return redirect(url_for('registroelogin'))
    post = Post.query.options(
        db.joinedload(Post.comments).joinedload(Comment.author),
        db.joinedload(Post.comments).joinedload(Comment.replies).joinedload(Comment.author)
    ).get_or_404(post_id)
    return render_template('post_comments.html', user=user, post=post)

@app.route('/registroelogin', methods=['GET', 'POST'])
def registroelogin():
    user_id = session.get('user_id')
    if user_id:
        user = db.session.get(User, user_id)
        if user:
            return redirect(url_for('telainicial'))
        session.clear()
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
            if len(password) < 8:
                flash('A senha deve ter no mínimo 8 caracteres.', 'error')
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
                try:
                    auth.create_user(email=email, password=password)
                    logger.info(f"Usuário {email} criado no Firebase Authentication")
                except Exception as e:
                    logger.warning(f"Erro ao criar usuário no Firebase: {str(e)}")
                flash('Conta criada com sucesso! Faça login para continuar.', 'success')
            except Exception as e:
                db.session.rollback()
                logger.error(f"Erro ao criar usuário: {str(e)}")
                flash('Erro ao criar conta. Tente novamente.', 'error')
            return redirect(url_for('registroelogin'))
    return render_template('registroelogin.html')

@app.route('/user_progress', methods=['GET'])
def user_progress():
    if 'user_id' not in session:
        return jsonify({'status': 'error', 'message': 'Por favor, faça login para visualizar o progresso.'}), 401
    user = db.session.get(User, session['user_id'])
    if not user:
        return jsonify({'status': 'error', 'message': 'Usuário não encontrado.'}), 404
    try:
        progress_data = ProgressTracker.calculate_progress(user.id)
        print(f"DEBUG - Progress data: {progress_data}")
        print(f"DEBUG - Progress percentage: {progress_data.get('progress_percentage')}")
        print(f"DEBUG - Activity points: {progress_data.get('activity_points')}")
        print(f"DEBUG - Resources count: {progress_data.get('resources_count')}")
        suggestions = ProgressTracker.get_next_actions(user.id)
        details = progress_data.get('details', {})
        structured_details = {
            'Páginas Visitadas': {
                'completed': details.get('pages_visited', 0),
                'total': details.get('total_pages', 0),
                'percentage': (details.get('pages_visited', 0) / details.get('total_pages', 1)) * 100
            },
            'Recursos Acessados': {
                'completed': details.get('resources_accessed', 0),
                'total': details.get('total_resources', 0),
                'percentage': (details.get('resources_accessed', 0) / details.get('total_resources', 1)) * 100
            },
            'Posts Criados': {
                'completed': details.get('posts_count', 0),
                'total': 5,
                'percentage': min((details.get('posts_count', 0) / 5) * 100, 100)
            },
            'Comentários': {
                'completed': details.get('comments_count', 0),
                'total': 10,
                'percentage': min((details.get('comments_count', 0) / 10) * 100, 100)
            },
            'Curtidas Dadas': {
                'completed': details.get('likes_count', 0),
                'total': 20,
                'percentage': min((details.get('likes_count', 0) / 20) * 100, 100)
            }
        }
        return jsonify({
            'status': 'success',
            'progress_percentage': progress_data['progress_percentage'],
            'activity_points': progress_data['activity_points'],
            'resources_count': progress_data['resources_count'],
            'details': structured_details,
            'suggestions': suggestions
        })
    except Exception as e:
        logger.error(f"Erro ao obter progresso: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': 'Erro ao obter progresso.',
            'progress_percentage': 0,
            'activity_points': 0,
            'resources_count': 0,
            'details': {},
            'suggestions': []
        }), 500

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

@app.route('/videos-e-tutoriais')
@track_page_visit('videos')
def videos():
    user_id = session.get('user_id')
    if not user_id:
        flash('Por favor, faça login para acessar esta página.', 'error')
        return redirect(url_for('registroelogin'))
    user = db.session.get(User, user_id)
    if not user:
        session.clear()
        flash('Sua sessão expirou ou o usuário não existe mais.', 'error')
        return redirect(url_for('registroelogin'))
    return render_template('videosetutoriais.html', user=user)

@app.route('/politica-de-privacidade')
def politica_privacidade():
    return render_template('politicadeprivacidade.html')

@app.route('/materiais-de-estudo')
@track_page_visit('materiais')
def materiais():
    user_id = session.get('user_id')
    if not user_id:
        flash('Por favor, faça login para acessar esta página.', 'error')
        return redirect(url_for('registroelogin'))
    user = db.session.get(User, user_id)
    if not user:
        session.clear()
        flash('Sua sessão expirou ou o usuário não existe mais.', 'error')
        return redirect(url_for('registroelogin'))
    return render_template('materiaisestudo.html', user=user)

@app.route('/pdfs-e-apostilas')
@track_page_visit('pdfs')
def pdfs():
    user_id = session.get('user_id')
    if not user_id:
        flash('Por favor, faça login para acessar esta página.', 'error')
        return redirect(url_for('registroelogin'))
    user = db.session.get(User, user_id)
    if not user:
        session.clear()
        flash('Sua sessão expirou ou o usuário não existe mais.', 'error')
        return redirect(url_for('registroelogin'))
    return render_template('pdfeapostilas.html', user=user)

@app.route('/data/pdfs.json')
def serve_pdfs_json():
    try:
        return send_from_directory(app.config['DATA_FOLDER'], 'pdfs.json')
    except Exception as e:
        logger.error(f"Erro ao servir pdfs.json: {str(e)}")
        return render_template('404.html'), 404

@app.route('/pdfs/<path:filename>')
def serve_pdf(filename):
    try:
        file_path = os.path.join(app.config['PDFS_FOLDER'], filename)
        if os.path.exists(file_path):
            logger.info(f"Servindo arquivo: {file_path}")
            return send_from_directory(app.config['PDFS_FOLDER'], filename)
        actual_filename = find_file_case_insensitive(app.config['PDFS_FOLDER'], filename)
        if actual_filename:
            logger.info(f"Arquivo encontrado (case-insensitive): {actual_filename}")
            return send_from_directory(app.config['PDFS_FOLDER'], actual_filename)
        logger.error(f"Arquivo não encontrado: {filename} em {app.config['PDFS_FOLDER']}")
        return render_template('404.html'), 404
    except Exception as e:
        logger.error(f"Erro ao servir PDF {filename}: {str(e)}")
        return render_template('404.html'), 404

@app.route('/codigo')
@track_page_visit('codigo')
def codigo():
    user_id = session.get('user_id')
    if not user_id:
        flash('Por favor, faça login para acessar esta página.', 'error')
        return redirect(url_for('registroelogin'))
    user = db.session.get(User, user_id)
    if not user:
        session.clear()
        flash('Sua sessão expirou ou o usuário não existe mais.', 'error')
        return redirect(url_for('registroelogin'))
    return render_template('exemplosdecodigo.html', user=user)

@app.route('/comunidade', methods=['GET'])
@track_page_visit('comunidade')
def comunidade():
    user_id = session.get('user_id')
    if not user_id:
        flash('Por favor, faça login para acessar esta página.', 'error')
        return redirect(url_for('registroelogin'))
    user = db.session.get(User, user_id)
    if not user:
        session.clear()
        flash('Sua sessão expirou ou o usuário não existe mais.', 'error')
        return redirect(url_for('registroelogin'))
    posts = Post.query.options(
        db.joinedload(Post.comments).joinedload(Comment.author),
        db.joinedload(Post.comments).joinedload(Comment.replies).joinedload(Comment.author)
    ).order_by(Post.created_at.desc()).all()
    return render_template('comunidade.html', user=user, posts=posts)

@app.route('/create_post_form', methods=['GET'])
def create_post_form():
    user_id = session.get('user_id')
    if not user_id:
        flash('Por favor, faça login para acessar esta página.', 'error')
        return redirect(url_for('registroelogin'))
    user = db.session.get(User, user_id)
    if not user:
        session.clear()
        flash('Sua sessão expirou ou o usuário não existe mais.', 'error')
        return redirect(url_for('registroelogin'))
    posts = Post.query.options(
        db.joinedload(Post.comments).joinedload(Comment.author),
        db.joinedload(Post.comments).joinedload(Comment.replies).joinedload(Comment.author)
    ).order_by(Post.created_at.desc()).all()
    return render_template('comunidade.html', user=user, posts=posts)

@app.route('/configuracoes')
@track_page_visit('configuracoes')
def configuracoes():
    user_id = session.get('user_id')
    if not user_id:
        flash('Por favor, faça login para acessar esta página.', 'error')
        return redirect(url_for('registroelogin'))
    user = db.session.get(User, user_id)
    if not user:
        session.clear()
        flash('Sua sessão expirou ou o usuário não existe mais.', 'error')
        return redirect(url_for('registroelogin'))
    return render_template('configuracoes.html', user=user)

@app.route('/update_username', methods=['POST'])
def update_username():
    if 'user_id' not in session:
        flash('Faça login para alterar o nome.', 'error')
        return redirect(url_for('registroelogin'))
    new_username = request.form.get('username', '').strip()
    if not new_username:
        flash('Nome de usuário não pode ser vazio.', 'error')
        return redirect(url_for('configuracoes'))
    if len(new_username) < 3 or len(new_username) > 20:
        flash('O nome de usuário deve ter entre 3 e 20 caracteres.', 'error')
        return redirect(url_for('configuracoes'))
    if not new_username.isalnum():
        flash('O nome de usuário deve conter apenas letras e números.', 'error')
        return redirect(url_for('configuracoes'))
    if User.query.filter_by(username=new_username).first():
        flash('Nome de usuário já está em uso.', 'error')
        return redirect(url_for('configuracoes'))
    user = db.session.get(User, session['user_id'])
    if not user:
        flash('Usuário não encontrado.', 'error')
        return redirect(url_for('registroelogin'))
    try:
        old_username = user.username
        user.username = new_username
        db.session.commit()
        session['username'] = new_username
        logger.info(f"Username atualizado de {old_username} para {new_username} para usuário ID {user.id}")
        flash('Nome de usuário atualizado com sucesso!', 'success')
        return redirect(url_for('configuracoes'))
    except Exception as e:
        db.session.rollback()
        logger.error(f"Erro ao atualizar username: {str(e)}")
        flash('Erro ao atualizar nome de usuário.', 'error')
        return redirect(url_for('configuracoes'))

@app.route('/update_profile_pic', methods=['POST'])
def update_profile_pic():
    if 'user_id' not in session:
        flash('Faça login para alterar a foto.', 'error')
        return redirect(url_for('registroelogin'))
    if 'profile_pic' not in request.files:
        flash('Nenhum arquivo enviado.', 'error')
        return redirect(url_for('configuracoes'))
    file = request.files['profile_pic']
    if file.filename == '':
        flash('Nenhum arquivo selecionado.', 'error')
        return redirect(url_for('configuracoes'))
    if not allowed_file(file.filename):
        flash('Tipo de arquivo não suportado.', 'error')
        return redirect(url_for('configuracoes'))
    file.seek(0, os.SEEK_END)
    file_size = file.tell()
    if file_size > MAX_FILE_SIZE:
        flash('O arquivo excede o tamanho máximo de 5MB.', 'error')
        return redirect(url_for('configuracoes'))
    file.seek(0)
    filename = f"user_{session['user_id']}_{secure_filename(file.filename)}"
    upload_folder = os.path.join(app.root_path, 'static', 'Uploads')
    os.makedirs(upload_folder, exist_ok=True)
    file_path = os.path.join(upload_folder, filename)
    user = db.session.get(User, session['user_id'])
    if not user:
        flash('Usuário não encontrado.', 'error')
        return redirect(url_for('registroelogin'))
    if user.profile_pic and user.profile_pic != 'default.png':
        old_file_path = os.path.join(upload_folder, user.profile_pic)
        if os.path.exists(old_file_path):
            try:
                os.remove(old_file_path)
                logger.info(f"Arquivo de perfil antigo removido: {old_file_path}")
            except Exception as e:
                logger.warning(f"Erro ao remover arquivo de perfil antigo: {str(e)}")
    try:
        file.save(file_path)
        user.profile_pic = filename
        db.session.commit()
        logger.info(f"Foto de perfil atualizada para usuário ID {user.id}: {filename}")
        flash('Foto de perfil atualizada!', 'success')
        return redirect(url_for('configuracoes'))
    except Exception as e:
        db.session.rollback()
        logger.error(f"Erro ao atualizar foto de perfil: {str(e)}")
        flash('Erro ao atualizar foto de perfil.', 'error')
        return redirect(url_for('configuracoes'))

@app.route('/update_password', methods=['POST'])
def update_password():
    if 'user_id' not in session:
        flash('Faça login para alterar a senha.', 'error')
        return redirect(url_for('registroelogin'))
    user = db.session.get(User, session['user_id'])
    if not user:
        flash('Usuário não encontrado.', 'error')
        return redirect(url_for('registroelogin'))
    current_password = request.form.get('current-password')
    new_password = request.form.get('new-password')
    confirm_password = request.form.get('confirm-password')
    if not current_password or not new_password or not confirm_password:
        flash('Todos os campos são obrigatórios.', 'error')
        return redirect(url_for('configuracoes'))
    if not user.password:
        flash('Usuários autenticados via Google devem usar a recuperação de senha.', 'error')
        return redirect(url_for('configuracoes'))
    if not check_password_hash(user.password, current_password):
        flash('Senha atual incorreta.', 'error')
        return redirect(url_for('configuracoes'))
    if new_password != confirm_password:
        flash('As novas senhas não coincidem.', 'error')
        return redirect(url_for('configuracoes'))
    if len(new_password) < 8:
        flash('A nova senha deve ter no mínimo 8 caracteres.', 'error')
        return redirect(url_for('configuracoes'))
    try:
        user.password = generate_password_hash(new_password)
        try:
            firebase_user = auth.get_user_by_email(user.email)
            auth.update_user(firebase_user.uid, password=new_password)
            logger.info(f"Senha atualizada no Firebase para o usuário {user.email}")
        except auth.UserNotFoundError:
            logger.warning(f"Usuário não encontrado no Firebase: {user.email}")
        except Exception as e:
            logger.warning(f"Erro ao atualizar senha no Firebase: {str(e)}")
        db.session.commit()
        logger.info(f"Senha atualizada para usuário ID {user.id}")
        flash('Senha atualizada com sucesso!', 'success')
        return redirect(url_for('configuracoes'))
    except Exception as e:
        db.session.rollback()
        logger.error(f"Erro ao atualizar senha: {str(e)}")
        flash('Erro ao atualizar senha.', 'error')
        return redirect(url_for('configuracoes'))

@app.route('/active_sessions', methods=['GET'])
def active_sessions():
    if 'user_id' not in session:
        flash('Faça login para visualizar sessões.', 'error')
        return redirect(url_for('registroelogin'))
    user = db.session.get(User, session['user_id'])
    if not user:
        flash('Usuário não encontrado.', 'error')
        return redirect(url_for('registroelogin'))
    try:
        sessions = [
            {
                'id': 'session1',
                'device': 'Unknown Device',
                'last_active': '2025-07-05',
                'ip_address': '192.168.1.1',
                'is_current': True
            }
        ]
        logger.info(f"Sessões listadas para usuário ID {user.id}")
        return render_template('active_sessions.html', user=user, sessions=sessions)
        # Alternative: Redirect to configuracoes with session data
        # return redirect(url_for('configuracoes', sessions=sessions))
    except Exception as e:
        logger.error(f"Erro ao listar sessões para usuário ID {user.id}: {str(e)}")
        flash('Erro ao listar sessões.', 'error')
        return redirect(url_for('configuracoes'))

@app.route('/end_session/<session_id>', methods=['POST'])
def end_session(session_id):
    if 'user_id' not in session:
        flash('Faça login para encerrar sessões.', 'error')
        return redirect(url_for('registroelogin'))
    user = db.session.get(User, session['user_id'])
    if not user:
        flash('Usuário não encontrado.', 'error')
        return redirect(url_for('registroelogin'))
    try:
        logger.info(f"Tentativa de encerrar sessão {session_id} para usuário ID {user.id}")
        flash('Sessão encerrada com sucesso!', 'success')
        return redirect(url_for('configuracoes'))
    except Exception as e:
        logger.error(f"Erro ao encerrar sessão {session_id} para usuário ID {user.id}: {str(e)}")
        flash('Erro ao encerrar sessão.', 'error')
        return redirect(url_for('configuracoes'))

@app.route('/delete_account', methods=['POST'])
def delete_account():
    if 'user_id' not in session:
        flash('Faça login para excluir a conta.', 'error')
        return redirect(url_for('registroelogin'))
    user = db.session.get(User, session['user_id'])
    if not user:
        flash('Usuário não encontrado.', 'error')
        return redirect(url_for('registroelogin'))
    password = request.form.get('password')
    if user.password and not check_password_hash(user.password, password):
        flash('Senha incorreta.', 'error')
        return redirect(url_for('configuracoes'))
    try:
        Post.query.filter_by(user_id=user.id).delete()
        Comment.query.filter_by(user_id=user.id).delete()
        Like.query.filter_by(user_id=user.id).delete()
        ResetCode.query.filter_by(email=user.email).delete()
        if user.profile_pic and user.profile_pic != 'default.png':
            file_path = os.path.join(app.root_path, 'static', 'Uploads', user.profile_pic)
            if os.path.exists(file_path):
                try:
                    os.remove(file_path)
                    logger.info(f"Foto de perfil removida: {file_path}")
                except Exception as e:
                    logger.warning(f"Erro ao remover foto de perfil: {str(e)}")
        try:
            firebase_user = auth.get_user_by_email(user.email)
            auth.delete_user(firebase_user.uid)
            logger.info(f"Usuário {user.email} deletado do Firebase Authentication")
        except auth.UserNotFoundError:
            logger.warning(f"Usuário não encontrado no Firebase: {user.email}")
        except Exception as e:
            logger.warning(f"Erro ao deletar usuário do Firebase: {str(e)}")
        db.session.delete(user)
        db.session.commit()
        session.clear()
        logger.info(f"Conta deletada com sucesso para usuário ID {user.id}")
        flash('Conta excluída com sucesso!', 'success')
        return redirect(url_for('index'))
    except Exception as e:
        db.session.rollback()
        logger.error(f"Erro ao excluir conta para usuário ID {user.id}: {str(e)}")
        flash('Erro ao excluir conta.', 'error')
        return redirect(url_for('configuracoes'))

@app.route('/search', methods=['GET'])
@cache.cached(timeout=60, query_string=True)
def search():
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({'status': 'error', 'message': 'Por favor, faça login para realizar buscas.'}), 401
    query = request.args.get('q', '').strip()
    if len(query) < 2:
        return jsonify([]), 200
    try:
        posts = Post.query.filter(
            Post.content.ilike(f'%{query}%') | Post.category.ilike(f'%{query}%')
        ).order_by(Post.created_at.desc()).limit(10).all()
        results = [
            {
                'title': post.content[:100] + '...' if len(post.content) > 100 else post.content,
                'type': 'Postagem',
                'category': post.category,
                'url': url_for('post_comments', post_id=post.id, _external=True)
            } for post in posts
        ]
        return jsonify(results), 200
    except Exception as e:
        logger.error(f"Erro na busca: {str(e)}")
        return jsonify({'status': 'error', 'message': 'Erro ao realizar busca.'}), 500

@app.route('/code_examples', methods=['GET'])
def code_examples():
    try:
        examples = CodeExample.query.order_by(CodeExample.created_at.desc()).limit(10).all()
        return jsonify([
            {
                'id': example.id,
                'title': example.title,
                'content': example.content,
                'language': example.language,
                'category': example.category,
                'created_at': example.created_at.strftime('%d/%m/%Y %H:%M')
            } for example in examples
        ])
    except Exception as e:
        logger.error(f"Erro ao buscar exemplos de código: {str(e)}")
        return jsonify({'status': 'error', 'message': 'Erro ao buscar exemplos de código.'}), 500

@app.route('/create_post', methods=['POST'])
def create_post():
    if 'user_id' not in session:
        return jsonify({'status': 'error', 'message': 'Por favor, faça login para realizar esta ação.'}), 401
    user_id = session['user_id']
    user = db.session.get(User, user_id)
    if not user:
        session.clear()
        return jsonify({'status': 'error', 'message': 'Sua sessão expirou ou o usuário não existe mais.'}), 401
    content = request.form.get('post_content')
    category = request.form.get('category')
    if not content:
        return jsonify({'status': 'error', 'message': 'O conteúdo da postagem não pode estar vazio.'}), 400
    if not category:
        return jsonify({'status': 'error', 'message': 'Por favor, selecione uma categoria.'}), 400
    new_post = Post(content=content, user_id=user.id, category=category)
    try:
        db.session.add(new_post)
        db.session.commit()
        track_user_activity('post_created')
        return jsonify({
            'status': 'success',
            'post': {
                'id': new_post.id,
                'content': new_post.content,
                'category': new_post.category,
                'username': user.username,
                'created_at': new_post.created_at.strftime('%d/%m/%Y %H:%M')
            }
        })
    except Exception as e:
        db.session.rollback()
        logger.error(f"Erro ao criar postagem: {str(e)}")
        return jsonify({'status': 'error', 'message': 'Erro ao criar postagem. Tente novamente.'}), 500

@app.route('/comment/<int:post_id>', methods=['POST'])
def add_comment(post_id):
    if 'user_id' not in session:
        return jsonify({'status': 'error', 'message': 'Por favor, faça login para comentar.'}), 401
    post = Post.query.get_or_404(post_id)
    content = request.form.get('comment_content')
    if not content:
        return jsonify({'status': 'error', 'message': 'O comentário não pode estar vazio.'}), 400
    new_comment = Comment(
        content=content,
        user_id=session['user_id'],
        post_id=post_id
    )
    try:
        db.session.add(new_comment)
        db.session.commit()
        track_user_activity('comment_created')
        return jsonify({
            'status': 'success',
            'comment': {
                'id': new_comment.id,
                'content': new_comment.content,
                'username': new_comment.author.username,
                'created_at': new_comment.created_at.strftime('%d/%m/%Y %H:%M'),
                'is_admin': new_comment.author.is_admin,
                'is_moderator': new_comment.author.is_moderator
            }
        })
    except Exception as e:
        db.session.rollback()
        logger.error(f"Erro ao adicionar comentário: {str(e)}")
        return jsonify({'status': 'error', 'message': 'Erro ao adicionar comentário.'}), 500

@app.route('/reply/<int:comment_id>', methods=['POST'])
def add_reply(comment_id):
    if 'user_id' not in session:
        return jsonify({'status': 'error', 'message': 'Por favor, faça login para responder.'}), 401
    parent_comment = Comment.query.get_or_404(comment_id)
    content = request.form.get('reply_content')
    if not content:
        return jsonify({'status': 'error', 'message': 'A resposta não pode estar vazia.'}), 400
    new_reply = Comment(
        content=content,
        user_id=session['user_id'],
        post_id=parent_comment.post_id,
        parent_id=comment_id
    )
    try:
        db.session.add(new_reply)
        db.session.commit()
        track_user_activity('comment_created')
        return jsonify({
            'status': 'success',
            'reply': {
                'id': new_reply.id,
                'content': new_reply.content,
                'username': new_reply.author.username,
                'created_at': new_reply.created_at.strftime('%d/%m/%Y %H:%M'),
                'is_admin': new_reply.author.is_admin,
                'is_moderator': new_reply.author.is_moderator
            }
        })
    except Exception as e:
        db.session.rollback()
        logger.error(f"Erro ao adicionar resposta: {str(e)}")
        return jsonify({'status': 'error', 'message': 'Erro ao adicionar resposta.'}), 500

@app.route('/edit_comment/<int:comment_id>', methods=['POST'])
def edit_comment(comment_id):
    if 'user_id' not in session:
        return jsonify({'status': 'error', 'message': 'Por favor, faça login para editar.'}), 401
    comment = Comment.query.get_or_404(comment_id)
    if comment.user_id != session['user_id']:
        return jsonify({'status': 'error', 'message': 'Você não tem permissão para editar este comentário.'}), 403
    content = request.form.get('edit_comment_content')
    if not content:
        return jsonify({'status': 'error', 'message': 'O comentário não pode estar vazio.'}), 400
    try:
        comment.content = content
        db.session.commit()
        return jsonify({
            'status': 'success',
            'message': 'Comentário editado com sucesso!',
            'content': comment.content
        })
    except Exception as e:
        db.session.rollback()
        logger.error(f"Erro ao editar comentário: {str(e)}")
        return jsonify({'status': 'error', 'message': 'Erro ao editar comentário.'}), 500

@app.route('/edit_reply/<int:reply_id>', methods=['POST'])
def edit_reply(reply_id):
    if 'user_id' not in session:
        return jsonify({'status': 'error', 'message': 'Por favor, faça login para editar.'}), 401
    reply = Comment.query.get_or_404(reply_id)
    if reply.user_id != session['user_id']:
        return jsonify({'status': 'error', 'message': 'Você não tem permissão para editar esta resposta.'}), 403
    content = request.form.get('edit_reply_content')
    if not content:
        return jsonify({'status': 'error', 'message': 'A resposta não pode estar vazia.'}), 400
    try:
        reply.content = content
        db.session.commit()
        return jsonify({
            'status': 'success',
            'message': 'Resposta editada com sucesso!',
            'content': reply.content
        })
    except Exception as e:
        db.session.rollback()
        logger.error(f"Erro ao editar resposta: {str(e)}")
        return jsonify({'status': 'error', 'message': 'Erro ao editar resposta.'}), 500

@app.route('/delete_comment/<int:comment_id>', methods=['POST'])
def delete_comment(comment_id):
    if 'user_id' not in session:
        return jsonify({'status': 'error', 'message': 'Por favor, faça login para deletar.'}), 401
    comment = Comment.query.get_or_404(comment_id)
    if comment.user_id != session['user_id']:
        return jsonify({'status': 'error', 'message': 'Você não tem permissão para deletar este comentário.'}), 403
    try:
        Comment.query.filter_by(parent_id=comment_id).delete()
        db.session.delete(comment)
        db.session.commit()
        return jsonify({'status': 'success', 'message': 'Comentário deletado com sucesso!'})
    except Exception as e:
        db.session.rollback()
        logger.error(f"Erro ao deletar comentário: {str(e)}")
        return jsonify({'status': 'error', 'message': 'Erro ao deletar comentário.'}), 500

@app.route('/delete_reply/<int:reply_id>', methods=['POST'])
def delete_reply(reply_id):
    if 'user_id' not in session:
        return jsonify({'status': 'error', 'message': 'Por favor, faça login para deletar.'}), 401
    reply = Comment.query.get_or_404(reply_id)
    if reply.user_id != session['user_id']:
        return jsonify({'status': 'error', 'message': 'Você não tem permissão para deletar esta resposta.'}), 403
    try:
        db.session.delete(reply)
        db.session.commit()
        return jsonify({'status': 'success', 'message': 'Resposta deletada com sucesso!'})
    except Exception as e:
        db.session.rollback()
        logger.error(f"Erro ao deletar resposta: {str(e)}")
        return jsonify({'status': 'error', 'message': 'Erro ao deletar resposta.'}), 500

@app.route('/like_post/<int:post_id>', methods=['POST'])
def like_post(post_id):
    if 'user_id' not in session:
        return jsonify({'status': 'error', 'message': 'Por favor, faça login para curtir.'}), 401
    post = Post.query.get_or_404(post_id)
    user_id = session['user_id']
    existing_like = Like.query.filter_by(user_id=user_id, post_id=post_id).first()
    if existing_like:
        try:
            db.session.delete(existing_like)
            db.session.commit()
            like_count = Like.query.filter_by(post_id=post_id).count()
            return jsonify({
                'status': 'success',
                'message': 'Curtida removida com sucesso!',
                'liked': False,
                'likes': like_count
            })
        except Exception as e:
            db.session.rollback()
            logger.error(f"Erro ao remover curtida: {str(e)}")
            return jsonify({'status': 'error', 'message': 'Erro ao remover curtida.'}), 500
    else:
        new_like = Like(user_id=user_id, post_id=post_id)
        try:
            db.session.add(new_like)
            db.session.commit()
            track_user_activity('like_given')
            like_count = Like.query.filter_by(post_id=post_id).count()
            return jsonify({
                'status': 'success',
                'message': 'Postagem curtida com sucesso!',
                'liked': True,
                'likes': like_count
            })
        except Exception as e:
            db.session.rollback()
            logger.error(f"Erro ao adicionar curtida: {str(e)}")
            return jsonify({'status': 'error', 'message': 'Erro ao curtir postagem.'}), 500

@app.route('/get_post_likes/<int:post_id>', methods=['GET'])
def get_post_likes(post_id):
    post = Post.query.get_or_404(post_id)
    like_count = Like.query.filter_by(post_id=post_id).count()
    user_liked = False
    if 'user_id' in session:
        user_liked = Like.query.filter_by(user_id=session['user_id'], post_id=post_id).first() is not None
    return jsonify({
        'status': 'success',
        'like_count': like_count,
        'user_liked': user_liked
    })

@app.route('/like_comment/<int:comment_id>', methods=['POST'])
def like_comment(comment_id):
    if 'user_id' not in session:
        return jsonify({'status': 'error', 'message': 'Por favor, faça login para curtir.'}), 401
    comment = Comment.query.get_or_404(comment_id)
    user_id = session['user_id']
    existing_like = Like.query.filter_by(user_id=user_id, comment_id=comment_id).first()
    if existing_like:
        try:
            db.session.delete(existing_like)
            db.session.commit()
            like_count = Like.query.filter_by(comment_id=comment_id).count()
            return jsonify({
                'status': 'success',
                'message': 'Curtida removida com sucesso!',
                'liked': False,
                'like_count': like_count
            })
        except Exception as e:
            db.session.rollback()
            logger.error(f"Erro ao remover curtida: {str(e)}")
            return jsonify({'status': 'error', 'message': 'Erro ao remover curtida.'}), 500
    else:
        new_like = Like(user_id=user_id, comment_id=comment_id)
        try:
            db.session.add(new_like)
            db.session.commit()
            track_user_activity('like_given')
            like_count = Like.query.filter_by(comment_id=comment_id).count()
            return jsonify({
                'status': 'success',
                'message': 'Comentário curtido com sucesso!',
                'liked': True,
                'like_count': like_count
            })
        except Exception as e:
            db.session.rollback()
            logger.error(f"Erro ao adicionar curtida: {str(e)}")
            return jsonify({'status': 'error', 'message': 'Erro ao curtir comentário.'}), 500

@app.route('/get_comment_likes/<int:comment_id>', methods=['GET'])
def get_comment_likes(comment_id):
    comment = Comment.query.get_or_404(comment_id)
    like_count = Like.query.filter_by(comment_id=comment_id).count()
    user_liked = False
    if 'user_id' in session:
        user_liked = Like.query.filter_by(user_id=session['user_id'], comment_id=comment_id).first() is not None
    return jsonify({
        'status': 'success',
        'like_count': like_count,
        'user_liked': user_liked
    })

@app.route('/delete_post/<int:post_id>', methods=['DELETE'])
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

@app.route('/logout')
def logout():
    session.clear()
    flash('Você saiu da sua conta.', 'info')
    return redirect(url_for('registroelogin'))

with app.app_context():
    try:
        instance_dir = app.config['INSTANCE_DIR']
        if not os.path.exists(instance_dir):
            logger.error(f"Diretório instance não encontrada: {instance_dir}")
            raise FileNotFoundError(f"Diretório instance não encontrada: {instance_dir}")
        
        uri = app.config['SQLALCHEMY_DATABASE_URI']
        if uri.startswith('sqlite:///'):
            db_path = os.path.join(instance_dir, 'app.db')
            with open(db_path, 'a'):
                pass
        
        db.create_all()
        if not CodeExample.query.first():
            examples = [
                CodeExample(
                    title="Python: Jogo de Adivinhação",
                    content="""import random
numero_secreto = random.randint(1, 100)
tentativas = 0
while True:
    palpite = int(input("Adivinhe o número (1-100): "))
    tentativas += 1
    if palpite == numero_secreto:
        print(f"Parabéns! Você acertou em {tentativas} tentativas!")
        break
    elif palpite < numero_secreto:
        print("Tente um número maior!")
    else:
        print("Tente um número menor!")""",
                    language="Python",
                    category="Programação"
                ),
                CodeExample(
                    title="SQL: Consulta de Usuários",
                    content="""SELECT id, username, email
FROM users
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY created_at DESC;""",
                    language="SQL",
                    category="Banco de Dados"
                ),
                CodeExample(
                    title="Python: Calculadora Simples",
                    content="""def calculadora():
    num1 = float(input("Digite o primeiro número: "))
    op = input("Digite a operação (+, -, *, /): ")
    num2 = float(input("Digite o segundo número: "))
    if op == '+':
        return num1 + num2
    elif op == '-':
        return num1 - num2
    elif op == '*':
        return num1 * num2
    elif op == '/':
        return num1 / num2 if num2 != 0 else "Erro: Divisão por zero!"
    else:
        return "Operação inválida!"
print(calculadora())""",
                    language="Python",
                    category="Programação"
                )
            ]
            db.session.add_all(examples)
            db.session.commit()
            logger.info("Exemplos de código inicializados com sucesso")
        logger.info("Tabelas do banco de dados criadas com sucesso")
    except Exception as e:
        logger.error(f"Erro ao criar tabelas do banco de dados: {str(e)}")
        
        raise
        
if __name__ == '__main__':
    app.run(debug=True)
