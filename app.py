"""Flask application for E-Procurement System."""
import os
from flask import Flask, request, jsonify, render_template, session, redirect, url_for, make_response
from datetime import datetime, date
from decimal import Decimal
from functools import wraps

# Import all modules (we'll create the missing ones)
from app.database import initialize_database, get_connection
from app.auth import authenticate, validate_session, logout
from app.authorization import can_create_requisition, can_approve_at_stage, can_view_requisition, is_admin
from app.requisition_management import (create_requisition, add_line_item, get_requisitions_by_user,
                                        filter_requisitions, get_requisition_by_id)
from app.workflow import submit_requisition, approve_requisition, reject_requisition, get_approval_history
from app.vendor_management import add_vendor_quote, get_vendor_comparison, select_vendor
from app.notifications import get_user_notifications, mark_notification_read
from app.user_management import create_user, modify_user_role, deactivate_user, get_all_users
from app.print_generation import generate_print_format

app = Flask(__name__)
app.secret_key = os.getenv('SECRET_KEY', 'dev-secret-key-change-in-production')
app.config['SESSION_COOKIE_HTTPONLY'] = True
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'

# Initialize database on startup
with app.app_context():
    initialize_database()

# Authentication decorator
def requires_auth(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        session_id = session.get('session_id')
        if not session_id:
            return jsonify({'error': 'Authentication required'}), 401
        
        result = validate_session(session_id)
        if not result:
            session.clear()
            return jsonify({'error': 'Session expired'}), 401
        
        sess, user = result
        return f(user=user, *args, **kwargs)
    return decorated_function

def requires_admin(f):
    @wraps(f)
    def decorated_function(user=None, *args, **kwargs):
        if not user or not user.is_admin():
            return jsonify({'error': 'Admin access required'}), 403
        return f(user=user, *args, **kwargs)
    return decorated_function

# Routes
@app.route('/')
def index():
    if 'session_id' in session:
        return redirect(url_for('dashboard'))
    return redirect(url_for('login_page'))

@app.route('/login')
def login_page():
    return render_template('login.html')

@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    
    if not username or not password:
        return jsonify({'error': 'Username and password required'}), 400
    
    result = authenticate(username, password, request.remote_addr)
    if not result:
        return jsonify({'error': 'Invalid credentials'}), 401
    
    sess, user = result
    session['session_id'] = sess.session_id
    
    return jsonify({
        'success': True,
        'user': {
            'user_id': user.user_id,
            'username': user.username,
            'full_name': user.full_name,
            'role': user.role,
            'approval_stage': user.approval_stage
        }
    })

@app.route('/api/auth/logout', methods=['POST'])
@requires_auth
def logout_endpoint(user):
    session_id = session.get('session_id')
    if session_id:
        logout(session_id)
    session.clear()
    return jsonify({'success': True})

@app.route('/dashboard')
@requires_auth
def dashboard(user):
    return render_template('dashboard.html', user=user)

@app.route('/api/requisitions', methods=['GET', 'POST'])
@requires_auth
def requisitions(user):
    if request.method == 'GET':
        status = request.args.get('status')
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        is_urgent = request.args.get('is_urgent')
        
        reqs = filter_requisitions(user.user_id, user.role, user.approval_stage,
                                   status, start_date, end_date, is_urgent == 'true')
        
        return jsonify([{
            'requisition_id': r.requisition_id,
            'prf_number': r.prf_number,
            'creator_id': r.creator_id,
            'current_stage': r.current_stage,
            'status': r.status,
            'is_urgent': r.is_urgent,
            'justification': r.justification,
            'created_at': r.created_at.isoformat() if r.created_at else None,
            'updated_at': r.updated_at.isoformat() if r.updated_at else None
        } for r in reqs])
    
    # POST - Create new requisition
    if not can_create_requisition(user.role):
        return jsonify({'error': 'Permission denied'}), 403
    
    data = request.get_json()
    items = data.get('items', [])
    is_urgent = data.get('is_urgent', False)
    justification = data.get('justification', '')
    
    if not items:
        return jsonify({'error': 'At least one item required'}), 400
    
    requisition = create_requisition(user.user_id, is_urgent, justification)
    
    for item in items:
        add_line_item(requisition.requisition_id, item['description'],
                     item['quantity'], Decimal(str(item['estimated_cost'])), item['unit'])
    
    return jsonify({
        'requisition_id': requisition.requisition_id,
        'prf_number': requisition.prf_number
    }), 201

@app.route('/api/requisitions/<int:req_id>/print', methods=['GET'])
@requires_auth
def print_requisition(user, req_id):
    requisition = get_requisition_by_id(req_id)
    if not requisition:
        return jsonify({'error': 'Requisition not found'}), 404
    
    if not can_view_requisition(user.user_id, user.role, user.approval_stage, requisition):
        return jsonify({'error': 'Access denied'}), 403
    
    html = generate_print_format(req_id)
    response = make_response(html)
    response.headers['Content-Type'] = 'text/html'
    return response

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)
