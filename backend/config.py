import os

class Config:
    # Chave secreta para sessão
    SECRET_KEY = os.environ.get('SECRET_KEY') or os.urandom(32).hex()
    
    # Diretório base
    basedir = os.path.abspath(os.path.dirname(__file__))
    INSTANCE_DIR = os.path.join(basedir, 'instance')
    
    # Banco de dados
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or \
        f'sqlite:///{os.path.join(INSTANCE_DIR, "app.db")}'
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # SMTP - Brevo (Sendinblue)
    MAIL_SERVER = os.environ.get('MAIL_SERVER', 'smtp-relay.brevo.com')
    MAIL_PORT = int(os.environ.get('MAIL_PORT', 587))
    MAIL_USE_TLS = True
    MAIL_USERNAME = os.environ.get('MAIL_USERNAME', '901acc001@smtp-brevo.com')
    MAIL_PASSWORD = os.environ.get('MAIL_PASSWORD', 'VPt45nhgXkBxjEy6')
    MAIL_DEFAULT_SENDER = os.environ.get('MAIL_DEFAULT_SENDER', 'technobugproject@gmail.com')