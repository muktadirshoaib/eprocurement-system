"""User management module."""
import sqlite3
from datetime import datetime
from typing import Optional, List
from app.database import get_connection
from app.models.user import User
from app.auth import hash_password

def create_user(username: str, password: str, full_name: str, role: str,
                approval_stage: Optional[str] = None, created_by: Optional[int] = None) -> User:
    """Create a new user account."""
    valid_roles = ['basic_user', 'approver', 'admin']
    if role not in valid_roles:
        raise ValueError(f"Invalid role")
    
    if not username or len(username) < 3:
        raise ValueError("Username must be at least 3 characters")
    if not password or len(password) < 8:
        raise ValueError("Password must be at least 8 characters")
    
    conn = get_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute("SELECT user_id FROM users WHERE username = ?", (username,))
        if cursor.fetchone():
            raise ValueError(f"Username '{username}' already exists")
        
        password_hash = hash_password(password)
        now = datetime.now()
        cursor.execute("""
            INSERT INTO users (username, password_hash, full_name, role, approval_stage, is_active, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (username.strip(), password_hash, full_name.strip(), role, approval_stage, True, now, now))
        
        user_id = cursor.lastrowid
        conn.commit()
        
        return User(user_id=user_id, username=username.strip(), password_hash=password_hash,
                   full_name=full_name.strip(), role=role, approval_stage=approval_stage,
                   is_active=True, created_at=now, updated_at=now)
    finally:
        conn.close()

def modify_user_role(user_id: int, new_role: str, new_approval_stage: Optional[str] = None) -> User:
    """Modify user role."""
    conn = get_connection()
    cursor = conn.cursor()
    try:
        now = datetime.now()
        cursor.execute("UPDATE users SET role = ?, approval_stage = ?, updated_at = ? WHERE user_id = ?",
                      (new_role, new_approval_stage, now, user_id))
        conn.commit()
        cursor.execute("SELECT * FROM users WHERE user_id = ?", (user_id,))
        row = cursor.fetchone()
        return User(user_id=row[0], username=row[1], password_hash=row[2], full_name=row[3],
                   role=row[4], approval_stage=row[5], is_active=bool(row[6]),
                   created_at=datetime.fromisoformat(row[7]) if row[7] else None, updated_at=now)
    finally:
        conn.close()

def deactivate_user(user_id: int) -> User:
    """Deactivate user account."""
    conn = get_connection()
    cursor = conn.cursor()
    try:
        now = datetime.now()
        cursor.execute("UPDATE users SET is_active = 0, updated_at = ? WHERE user_id = ?", (now, user_id))
        cursor.execute("DELETE FROM sessions WHERE user_id = ?", (user_id,))
        conn.commit()
        cursor.execute("SELECT * FROM users WHERE user_id = ?", (user_id,))
        row = cursor.fetchone()
        return User(user_id=row[0], username=row[1], password_hash=row[2], full_name=row[3],
                   role=row[4], approval_stage=row[5], is_active=False,
                   created_at=datetime.fromisoformat(row[7]) if row[7] else None, updated_at=now)
    finally:
        conn.close()

def get_all_users() -> List[User]:
    """Get all users."""
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT * FROM users ORDER BY created_at DESC")
        return [User(user_id=r[0], username=r[1], password_hash=r[2], full_name=r[3],
                    role=r[4], approval_stage=r[5], is_active=bool(r[6]),
                    created_at=datetime.fromisoformat(r[7]) if r[7] else None,
                    updated_at=datetime.fromisoformat(r[8]) if r[8] else None) for r in cursor.fetchall()]
    finally:
        conn.close()
