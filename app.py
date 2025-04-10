import os
import random
import string
from flask import Flask, render_template, url_for, flash, redirect, request, session
from flask_bcrypt import Bcrypt
from flask_login import LoginManager, login_user, current_user, logout_user, login_required, UserMixin
from flask_mail import Mail, Message
from datetime import datetime, timedelta
from flask_sqlalchemy import SQLAlchemy
from flask_wtf import FlaskForm
from wtforms import StringField, PasswordField, SubmitField, BooleanField
from wtforms.validators import DataRequired, Length, Email, EqualTo, ValidationError

app = Flask(__name__)
app.config['SECRET_KEY'] = 'sua-chave-secreta-forte-aqui'
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///site.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(minutes=30)
app.config['MAIL_SERVER'] = 'smtp.gmail.com'
app.config['MAIL_PORT'] = 587
app.config['MAIL_USE_TLS'] = True
app.config['MAIL_USERNAME'] = 'technobugproject@gmail.com'
app.config['MAIL_PASSWORD'] = 'ubuv bcui ozjo yuyx'
app.config['MAIL_DEFAULT_SENDER'] = 'technobugproject@gmail.com'

db = SQLAlchemy(app)
bcrypt = Bcrypt(app)
mail = Mail(app)

login_manager = LoginManager(app)
login_manager.login_view = 'login'
login_manager.login_message = 'Por favor, faça login para acessar esta página.'
login_manager.login_message_category = 'info'

class User(db.Model, UserMixin):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(20), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password = db.Column(db.String(60), nullable=False)
    date_registered = db.Column(db.DateTime, default=datetime.now)
    reset_code = db.Column(db.String(6), nullable=True)
    reset_code_expiry = db.Column(db.DateTime, nullable=True)

    def set_reset_code(self):
        code = ''.join(random.choices(string.digits, k=6))
        self.reset_code = code
        self.reset_code_expiry = datetime.now() + timedelta(minutes=15)
        return code

    def verify_reset_code(self, code):
        if self.reset_code is None or self.reset_code_expiry is None:
            return False
        if self.reset_code != code:
            return False
        return datetime.now() <= self.reset_code_expiry

    def clear_reset_code(self):
        self.reset_code = None
        self.reset_code_expiry = None

    def __repr__(self):
        return f"User('{self.username}', '{self.email}')"

class RegistrationForm(FlaskForm):
    username = StringField('Nome de usuário', validators=[DataRequired(), Length(min=2, max=20)])
    email = StringField('Email', validators=[DataRequired(), Email()])
    password = PasswordField('Senha', validators=[DataRequired()])
    confirm_password = PasswordField('Confirmar Senha', validators=[DataRequired(), EqualTo('password')])
    submit = SubmitField('Cadastrar')

    def validate_username(self, username):
        user = User.query.filter_by(username=username.data).first()
        if user:
            raise ValidationError('Nome de usuário já existe. Por favor, escolha outro.')

    def validate_email(self, email):
        user = User.query.filter_by(email=email.data).first()
        if user:
            raise ValidationError('Email já está em uso. Por favor, escolha outro.')

class LoginForm(FlaskForm):
    email = StringField('Email', validators=[DataRequired(), Email()])
    password = PasswordField('Senha', validators=[DataRequired()])
    remember = BooleanField('Lembrar-me')
    submit = SubmitField('Login')

class RequestResetForm(FlaskForm):
    email = StringField('Email', validators=[DataRequired(), Email()])
    submit = SubmitField('Solicitar Código de Recuperação')

    def validate_email(self, email):
        user = User.query.filter_by(email=email.data).first()
        if not user:
            raise ValidationError('Não existe uma conta com esse email. Registre-se primeiro.')

class ResetPasswordForm(FlaskForm):
    password = PasswordField('Nova Senha', validators=[DataRequired()])
    confirm_password = PasswordField('Confirmar Senha', validators=[DataRequired(), EqualTo('password')])
    submit = SubmitField('Redefinir Senha')

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

def send_reset_code_email(user, code):
    try:
        msg = Message('Código de Recuperação de Senha', recipients=[user.email])
        msg.body = f'''Para redefinir sua senha, use o seguinte código:

{code}

Este código é válido por 15 minutos.

Se você não solicitou isso, ignore este email.
'''
        mail.send(msg)
        return True
    except Exception as e:
        print(f"Erro ao enviar email: {e}")
        return False

@app.route("/")
def home():
    return render_template('index.html')

@app.route("/register", methods=['GET', 'POST'])
def register():
    if current_user.is_authenticated:
        return redirect(url_for('home'))
    
    form = RegistrationForm()
    if form.validate_on_submit():
        hashed_password = bcrypt.generate_password_hash(form.password.data).decode('utf-8')
        user = User(username=form.username.data, email=form.email.data, password=hashed_password)
        db.session.add(user)
        db.session.commit()
        flash('Conta criada com sucesso! Faça login.', 'success')
        return redirect(url_for('login'))
    return render_template('register.html', title='Registrar', form=form)

@app.route("/login", methods=['GET', 'POST'])
def login():
    if current_user.is_authenticated:
        return redirect(url_for('dashboard'))
    
    form = LoginForm()
    if form.validate_on_submit():
        user = User.query.filter_by(email=form.email.data).first()
        if user and bcrypt.check_password_hash(user.password, form.password.data):
            login_user(user, remember=form.remember.data)
            next_page = request.args.get('next')
            flash('Login realizado com sucesso!', 'success')
            return redirect(next_page) if next_page else redirect(url_for('dashboard'))
        else:
            flash('Login falhou. Verifique email e senha.', 'danger')
    return render_template('login.html', title='Login', form=form)

@app.route("/logout")
def logout():
    logout_user()
    flash('Você foi desconectado.', 'info')
    return redirect(url_for('home'))

@app.route("/reset_password", methods=['GET', 'POST'])
def reset_request():
    if current_user.is_authenticated:
        return redirect(url_for('home'))
    
    form = RequestResetForm()
    if form.validate_on_submit():
        user = User.query.filter_by(email=form.email.data).first()
        if user:
            reset_code = user.set_reset_code()
            db.session.commit()
            if send_reset_code_email(user, reset_code):
                session['reset_email'] = user.email
                flash('Um email com o código de recuperação foi enviado.', 'info')
                return redirect(url_for('verify_reset_code'))
            else:
                flash('Erro ao enviar email. Tente novamente.', 'danger')
    return render_template('reset_request.html', form=form)

@app.route("/verify_reset_code", methods=['GET', 'POST'])
def verify_reset_code():
    if current_user.is_authenticated:
        return redirect(url_for('home'))

    email = session.get('reset_email')
    if not email:
        flash('Sessão expirada. Solicite um novo código.', 'warning')
        return redirect(url_for('reset_request'))

    user = User.query.filter_by(email=email).first()
    if not user:
        flash('Usuário não encontrado.', 'danger')
        return redirect(url_for('reset_request'))

    if request.method == 'POST':
        input_code = request.form.get('reset_code')
        if user.verify_reset_code(input_code):
            session['allow_password_reset'] = True
            return redirect(url_for('reset_password'))
        else:
            flash('Código inválido ou expirado.', 'danger')
    
    return render_template('verify_reset_code.html')

@app.route("/reset_password/final", methods=['GET', 'POST'])
def reset_password():
    if current_user.is_authenticated:
        return redirect(url_for('home'))

    if not session.get('allow_password_reset') or not session.get('reset_email'):
        flash('Acesso não autorizado.', 'danger')
        return redirect(url_for('reset_request'))

    user = User.query.filter_by(email=session['reset_email']).first()
    if not user:
        flash('Usuário não encontrado.', 'danger')
        return redirect(url_for('reset_request'))

    form = ResetPasswordForm()
    if form.validate_on_submit():
        hashed_password = bcrypt.generate_password_hash(form.password.data).decode('utf-8')
        user.password = hashed_password
        user.clear_reset_code()
        db.session.commit()
        session.pop('allow_password_reset', None)
        session.pop('reset_email', None)
        flash('Sua senha foi atualizada! Você pode fazer login agora.', 'success')
        return redirect(url_for('login'))
    return render_template('reset_token.html', form=form)

@app.route("/dashboard")
@login_required
def dashboard():
    return render_template('dashboard.html', title='Dashboard')

def create_tables():
    with app.app_context():
        db.create_all()

if __name__ == '__main__':
    create_tables()
    app.run(debug=True)
