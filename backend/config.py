import os

class Config:
    # Secret key for session management
    SECRET_KEY = os.environ.get('SECRET_KEY', 'uma-chave-super-secreta')  # Fallback for development only

    # Database configuration
    basedir = os.path.abspath(os.path.dirname(__file__))
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL', f'sqlite:///{os.path.join(basedir, "technobug.db")}')
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # Session security settings
    SESSION_COOKIE_SECURE = True  # Requires HTTPS in production
    SESSION_COOKIE_HTTPONLY = True  # Prevent JavaScript access
    SESSION_COOKIE_SAMESITE = 'Lax'  # CSRF protection