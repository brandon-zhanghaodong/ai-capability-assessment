import json
import os
import sqlite3
import hashlib
import uuid

DATABASE = '/tmp/ai_assessment_v3.db'

def hash_password(pwd):
    return hashlib.sha256(pwd.encode()).hexdigest()

def handler(event, context):
    if event.get('httpMethod') == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'POST, OPTIONS'},
            'body': ''
        }
    
    try:
        body = json.loads(event.get('body', '{}'))
        username = body.get('username', '').strip()
        password = body.get('password', '')
        
        conn = sqlite3.connect(DATABASE)
        c = conn.cursor()
        c.execute('SELECT id, username, password, company, is_admin, is_tenant_admin FROM users WHERE username = ?', (username,))
        user = c.fetchone()
        conn.close()
        
        if user and hash_password(password) == user[2]:
            # Return success with user info (no actual session - Netlify Functions are stateless)
            return {
                'statusCode': 200,
                'headers': {'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json'},
                'body': json.dumps({
                    'status': 'success',
                    'redirect': '/dashboard',
                    'user': {
                        'id': user[0],
                        'username': user[1],
                        'company': user[3],
                        'is_admin': user[4],
                        'is_tenant_admin': user[5]
                    }
                })
            }
        
        return {
            'statusCode': 401,
            'headers': {'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json'},
            'body': json.dumps({'status': 'error', 'message': '用户名或密码错误'})
        }
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json'},
            'body': json.dumps({'status': 'error', 'message': str(e)})
        }
