"""
Netlify Functions handler for Flask app
Simplified version using Flask test client
"""
import os
import sys
import json

# Set working directory
os.chdir('/var/task')

# Import Flask app
from app import app

def handler(event, context):
    """
    Netlify Functions handler - routes all requests through Flask
    """
    path = event.get('path', '/')
    method = event.get('httpMethod', 'GET')
    headers = event.get('headers', {})
    body = event.get('body', '')
    query_params = event.get('queryStringParameters') or {}
    
    # Handle CORS preflight
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type, Cookie',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
            },
            'body': ''
        }
    
    # Build Flask test client request
    with app.test_client() as client:
        # Set headers
        for key, value in headers.items():
            if key.lower() not in ['host', 'content-length']:
                pass
        
        # Make request
        if method == 'GET':
            rv = client.get(path, query_string=query_params)
        elif method == 'POST':
            rv = client.post(path, data=body, content_type='application/json')
        elif method == 'PUT':
            rv = client.put(path, data=body, content_type='application/json')
        elif method == 'DELETE':
            rv = client.delete(path)
        else:
            rv = client.get(path)
        
        # Get response
        response_body = rv.data.decode('utf-8', errors='replace')
        
        return {
            'statusCode': rv.status_code,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': rv.content_type or 'text/html; charset=utf-8'
            },
            'body': response_body
        }
