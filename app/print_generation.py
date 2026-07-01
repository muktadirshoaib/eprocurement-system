"""Print generation module."""
from datetime import datetime
from app.database import get_connection

def generate_print_format(requisition_id: int) -> str:
    """Generate HTML print format for requisition."""
    conn = get_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute("""
            SELECT r.*, u.full_name as creator_name
            FROM requisitions r
            JOIN users u ON r.creator_id = u.user_id
            WHERE r.requisition_id = ?
        """, (requisition_id,))
        req = cursor.fetchone()
        
        if not req:
            raise ValueError(f"Requisition {requisition_id} not found")
        
        cursor.execute("SELECT * FROM line_items WHERE requisition_id = ?", (requisition_id,))
        items = cursor.fetchall()
        
        html = f"""<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>PRF - {req[1]}</title>
<style>body{{font-family:Arial;max-width:800px;margin:20px auto;}}
table{{width:100%;border-collapse:collapse;}}th,td{{border:1px solid #ddd;padding:8px;}}
th{{background:#f0f0f0;}}</style></head><body>
<h1>Purchase Requisition Form</h1><h2>{req[1]}</h2>
<p><strong>Requestor:</strong> {req[10]}</p>
<p><strong>Status:</strong> {req[4]}</p>
<p><strong>Created:</strong> {req[7]}</p>
<h3>Line Items</h3><table><tr><th>Description</th><th>Qty</th><th>Unit</th><th>Cost</th></tr>"""
        
        for item in items:
            html += f"<tr><td>{item[2]}</td><td>{item[3]}</td><td>{item[5]}</td><td>${item[4]:.2f}</td></tr>"
        
        html += "</table></body></html>"
        return html
    finally:
        conn.close()
