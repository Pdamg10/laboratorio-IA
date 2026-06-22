import sqlite3
conn = sqlite3.connect('lab_electronica.db')
conn.execute("UPDATE usuarios SET rol='ADMIN' WHERE email='admin@admin.com'")
conn.commit()
