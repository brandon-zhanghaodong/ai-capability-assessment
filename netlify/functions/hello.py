import sys
sys.path.insert(0, '/var/task')

# 导入Flask app
from app import app as application

# Netlify Functions需要handler
handler = application
