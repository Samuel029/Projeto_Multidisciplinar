import os

class Config:
    # Secret key for session
    SECRET_KEY = os.environ.get('SECRET_KEY') or os.urandom(32).hex()  # Gerar chave aleatória se não definida
    
    # SQLite database configuration
    basedir = os.path.abspath(os.path.dirname(__file__))  # Diretório do config.py
    INSTANCE_DIR = os.path.join(basedir, 'instance')  # Pasta instance
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or \
        f'sqlite:///{os.path.join(INSTANCE_DIR, "app.db")}'  # Caminho absoluto
    SQLALCHEMY_TRACK_MODIFICATIONS = False