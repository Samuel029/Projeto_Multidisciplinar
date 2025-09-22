import os
import mysql.connector

db = mysql.connector.connect(
    host=os.environ["MYSQL_HOST"],
    port=int(os.environ["MYSQL_PORT"]),
    user=os.environ["MYSQL_USER"],
    password=os.environ["MYSQL_PASSWORD"],
    database=os.environ["MYSQL_DB"]
)

cursor = db.cursor()
cursor.execute("SELECT COUNT(*) FROM users;")
print("Total de usuários:", cursor.fetchone()[0])
db.close()
