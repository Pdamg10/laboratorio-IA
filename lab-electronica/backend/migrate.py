import sqlite3
conn = sqlite3.connect('lab_electronica.db')
conn.execute("ALTER TABLE usuarios ADD COLUMN rol VARCHAR(50) NOT NULL DEFAULT 'ESTUDIANTE'")
conn.commit()
