import sqlite3
from datetime import datetime
import pytz

BRASILIA_TZ = pytz.timezone('America/Sao_Paulo')
UTC_TZ = pytz.UTC

conn = sqlite3.connect('instance/app.db')
cursor = conn.cursor()

def convert_to_brasilia(utc_dt_str):
    try:
        utc_dt = datetime.strptime(utc_dt_str, '%Y-%m-%d %H:%M:%S')
        utc_dt = UTC_TZ.localize(utc_dt)
        brasilia_dt = utc_dt.astimezone(BRASILIA_TZ)
        return brasilia_dt.strftime('%Y-%m-%d %H:%M:%S')
    except ValueError:
        return utc_dt_str

cursor.execute("SELECT id, created_at FROM users")
users = cursor.fetchall()
for user_id, created_at in users:
    new_created_at = convert_to_brasilia(created_at)
    cursor.execute("UPDATE users SET created_at = ? WHERE id = ?", (new_created_at, user_id))

cursor.execute("SELECT id, created_at FROM posts")
posts = cursor.fetchall()
for post_id, created_at in posts:
    new_created_at = convert_to_brasilia(created_at)
    cursor.execute("UPDATE posts SET created_at = ? WHERE id = ?", (new_created_at, post_id))

cursor.execute("SELECT id, created_at FROM comments")
comments = cursor.fetchall()
for comment_id, created_at in comments:
    new_created_at = convert_to_brasilia(created_at)
    cursor.execute("UPDATE comments SET created_at = ? WHERE id = ?", (new_created_at, comment_id))

conn.commit()
conn.close()

print("Timestamps atualizados com sucesso!")