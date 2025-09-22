import os

basedir = os.path.abspath(os.path.dirname(__file__))

class Config:
    """Configurações comuns a todos os ambientes"""
    SECRET_KEY = os.environ.get('SECRET_KEY', 'sua_chave_secreta_padrao')
    SQLALCHEMY_TRACK_MODIFICATIONS = False

class DevelopmentConfig(Config):
    """Configurações para desenvolvimento local"""
    INSTANCE_DIR = os.path.join(basedir, 'instance')
    SQLALCHEMY_DATABASE_URI = os.environ.get(
        'DEV_DATABASE_URL',
        'sqlite:///' + os.path.join(INSTANCE_DIR, 'app.db')
    )
    DEBUG = True

class ProductionConfig(Config):
    """Configurações para produção"""
    INSTANCE_DIR = os.path.join(basedir, 'instance')  # Ajuste se necessário para produção
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL')  # Sem fallback; assume setado no Railway
    DEBUG = False

# Detecta automaticamente o ambiente
env = os.environ.get('FLASK_ENV', 'development')
if env == 'production':
    ActiveConfig = ProductionConfig
else:
    ActiveConfig = DevelopmentConfig