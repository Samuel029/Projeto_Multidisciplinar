from backend.extensions import db
from datetime import datetime
import pytz

# Fuso horário de Brasília
BRASILIA_TZ = pytz.timezone('America/Sao_Paulo')

class User(db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(64), index=True, nullable=False)
    email = db.Column(db.String(120), index=True, unique=True, nullable=False)
    password = db.Column(db.String(128), nullable=True)  # Permitir nulo para autenticação Google
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(BRASILIA_TZ))
    is_admin = db.Column(db.Boolean, default=False)  # Adicionado para suportar badges de admin
    is_moderator = db.Column(db.Boolean, default=False)  # Adicionado para suportar badges de moderador
    
    def __repr__(self):
        return f'<User {self.username}>'

class Post(db.Model):
    __tablename__ = 'posts'
    
    id = db.Column(db.Integer, primary_key=True)
    content = db.Column(db.Text, nullable=False)
    category = db.Column(db.String(50), nullable=False, default='Dúvidas Gerais')
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(BRASILIA_TZ))
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    
    author = db.relationship('User', backref=db.backref('posts', lazy=True))
    
    def __repr__(self):
        return f'<Post {self.id} by {self.author.username}>'

class Comment(db.Model):
    __tablename__ = 'comments'
    
    id = db.Column(db.Integer, primary_key=True)
    content = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(BRASILIA_TZ))
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    post_id = db.Column(db.Integer, db.ForeignKey('posts.id'), nullable=False)
    parent_id = db.Column(db.Integer, db.ForeignKey('comments.id'), nullable=True)  # Para respostas
    
    author = db.relationship('User', backref=db.backref('comments', lazy=True))
    post = db.relationship('Post', backref=db.backref('comments', lazy=True))
    replies = db.relationship('Comment', backref=db.backref('parent', remote_side=[id]), lazy=True)
    
    def __repr__(self):
        return f'<Comment {self.id} by {self.author.username} on Post {self.post_id}>'

class Like(db.Model):
    __tablename__ = 'likes'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    comment_id = db.Column(db.Integer, db.ForeignKey('comments.id'), nullable=True)  # Suporta likes em comentários e respostas
    post_id = db.Column(db.Integer, db.ForeignKey('posts.id'), nullable=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(BRASILIA_TZ))
    
    user = db.relationship('User', backref=db.backref('likes', lazy=True))
    comment = db.relationship('Comment', backref=db.backref('likes', lazy=True))
    post = db.relationship('Post', backref=db.backref('likes', lazy=True))
    
    def __repr__(self):
        return f'<Like by User {self.user_id} on Comment {self.comment_id or "N/A"} or Post {self.post_id or "N/A"}>'