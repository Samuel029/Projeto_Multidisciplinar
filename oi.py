import mysql.connector
from urllib.parse import urlparse

# URL pública do Railway
db_url = "mysql://root:NbpsGmbLDVYKeHlvuCCgDBQYIgLJxTrw@hopper.proxy.rlwy.net:27116/railway"

# Parse da URL
url = urlparse(db_url)

# Conexão com o MySQL
db = mysql.connector.connect(
    host=url.hostname,
    port=url.port,
    user=url.username,
    password=url.password,
    database=url.path[1:]  # remove a barra inicial
)

cursor = db.cursor()

# Exemplo: criar tabela de usuários se não existir
cursor.execute("""
CREATE TABLE IF NOT EXISTS usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100),
    email VARCHAR(100) UNIQUE,
    senha VARCHAR(100),
    imagem VARCHAR(255)
)
""")

db.commit()
print("Conectado ao Railway MySQL e tabela criada com sucesso!")

# Exemplo: inserir um usuário
def inserir_usuario(nome, email, senha, imagem):
    sql = "INSERT INTO usuarios (nome, email, senha, imagem) VALUES (%s, %s, %s, %s)"
    valores = (nome, email, senha, imagem)
    cursor.execute(sql, valores)
    db.commit()
    print(f"Usuário {nome} inserido!")

# Teste
# inserir_usuario("Felipe", "felipe@email.com", "senha123", "foto.jpg")

# Fechar conexão
# cursor.close()
# db.close()
