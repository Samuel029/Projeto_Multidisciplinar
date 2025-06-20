from flask import Flask, render_template, request, redirect, url_for, flash, session, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
from backend.extensions import db
from backend.models import User, Post, Comment, Like
from datetime import datetime
import os
import firebase_admin
from firebase_admin import auth, credentials
from flask_migrate import Migrate
from backend.reset_password import reset_bp
import logging
from flask_mail import Mail

# Configurar logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

app = Flask(__name__)
app.config.from_object('backend.config.Config')

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

cred_path = 'technobug-6daca-firebase-adminsdk-fbsvc-19273e6f57.json'

if not os.path.exists(cred_path):
    logger.error(f"Arquivo de credenciais Firebase não encontrado: {cred_path}")
    raise FileNotFoundError(f"Arquivo de credenciais Firebase não encontrado: {cred_path}")

try:
    if not firebase_admin._apps:  # Só inicializa se ainda não foi inicializado
        cred = credentials.Certificate(cred_path)
        firebase_admin.initialize_app(cred)
        logger.info("Firebase inicializado com sucesso")
    else:
        logger.info("Firebase já estava inicializado")
except Exception as e:
    logger.error(f"Erro ao inicializar Firebase: {str(e)}")
    raise

@app.route('/')
def index():
    return render_template('index.html')

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
                # Criar usuário no Firebase Authentication
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

@app.route('/codigo')
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

@app.route('/search', methods=['GET'])
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
        ).limit(10).all()
        
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
        content = request.form.get('content') or request.form.get('post_content')
        category = request.form.get('category')
        if content and category:
            new_post = Post(content=content, user_id=user.id, category=category)
            try:
                db.session.add(new_post)
                db.session.commit()
                flash('Postagem publicada com sucesso!', 'success')
            except Exception as e:
                db.session.rollback()
                logger.error(f"Erro ao criar postagem: {str(e)}")
                flash('Erro ao publicar postagem. Tente novamente.', 'error')
            return redirect(url_for('telainicial'))
        else:
            flash('Por favor, preencha todos os campos.', 'error')
    
    posts = Post.query.options(
        db.joinedload(Post.comments).joinedload(Comment.author),
        db.joinedload(Post.comments).joinedload(Comment.replies).joinedload(Comment.author)
    ).order_by(Post.created_at.desc()).all()
    
    return render_template('telainicial.html', user=user, posts=posts)

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
        db_path = os.path.join(instance_dir, 'app.db')
        if not os.path.exists(instance_dir):
            logger.error(f"Diretório instance não encontrado: {instance_dir}")
            raise FileNotFoundError(f"Diretório instance não encontrado: {instance_dir}")
        
        with open(db_path, 'a'):
            pass
        
        db.create_all()
        logger.info("Tabelas do banco de dados criadas com sucesso")
    except Exception as e:
        logger.error(f"Erro ao criar tabelas do banco de dados: {str(e)}")
        raise

if __name__ == '__main__':
    app.run(debug=True)