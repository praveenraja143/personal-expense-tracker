import os
import sqlite3
import csv
import io
from datetime import datetime, date
from flask import Flask, render_template, request, jsonify, Response

app = Flask(__name__)
DB_FILE = "expenses.db"

def get_db():
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    conn.execute("""
        CREATE TABLE IF NOT EXISTS transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            day TEXT NOT NULL,
            type TEXT NOT NULL DEFAULT 'expense',
            category TEXT NOT NULL,
            amount REAL NOT NULL,
            note TEXT,
            payment_method TEXT DEFAULT 'UPI'
        )
    """)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS budgets (
            month TEXT PRIMARY KEY,
            budget_amount REAL NOT NULL
        )
    """)
    # Seed sample transactions if empty
    cur = conn.cursor()
    cur.execute("SELECT COUNT(*) FROM transactions")
    if cur.fetchone()[0] == 0:
        today_str = str(date.today())
        month_str = today_str[:7]
        sample_data = [
            (f"{month_str}-01", "income", "Salary & Income", 45000.0, "Monthly Salary", "Bank Transfer"),
            (f"{month_str}-02", "expense", "Housing & Rent", 12000.0, "Apartment Rent", "UPI"),
            (f"{month_str}-05", "expense", "Food & Dining", 1850.0, "Grocery Supermarket", "Card"),
            (f"{month_str}-07", "expense", "Bills & Utilities", 1200.0, "Electricity & Internet Bill", "UPI"),
            (f"{month_str}-10", "expense", "Transportation", 650.0, "Metro / Fuel refuel", "Cash"),
            (f"{month_str}-12", "expense", "Food & Dining", 480.0, "Cafe dinner with friends", "UPI"),
            (f"{month_str}-14", "expense", "Shopping", 2100.0, "Clothes & essentials", "Card"),
            (f"{month_str}-15", "income", "Freelance", 8500.0, "Website design project", "Bank Transfer")
        ]
        conn.executemany("""
            INSERT INTO transactions (day, type, category, amount, note, payment_method)
            VALUES (?, ?, ?, ?, ?, ?)
        """, sample_data)
        conn.execute("INSERT OR REPLACE INTO budgets (month, budget_amount) VALUES (?, ?)", (month_str, 25000.0))
        conn.commit()
    conn.close()

init_db()

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/api/transactions", methods=["GET"])
def get_transactions():
    month = request.args.get("month", "").strip()
    cat = request.args.get("category", "").strip()
    tx_type = request.args.get("type", "").strip()
    query_str = request.args.get("q", "").strip()

    sql = "SELECT * FROM transactions WHERE 1=1"
    params = []

    if month:
        sql += " AND day LIKE ?"
        params.append(f"{month}%")
    if cat and cat != "All":
        sql += " AND category = ?"
        params.append(cat)
    if tx_type and tx_type != "All":
        sql += " AND type = ?"
        params.append(tx_type)
    if query_str:
        sql += " AND (note LIKE ? OR category LIKE ?)"
        params.extend([f"%{query_str}%", f"%{query_str}%"])

    sql += " ORDER BY day DESC, id DESC"

    conn = get_db()
    rows = conn.execute(sql, params).fetchall()
    conn.close()

    items = [dict(row) for row in rows]
    return jsonify({"transactions": items})

@app.route("/api/transactions", methods=["POST"])
def add_transaction():
    data = request.json or {}
    day = data.get("day", "").strip() or str(date.today())
    tx_type = data.get("type", "expense").strip()
    category = data.get("category", "General").strip()
    amount = float(data.get("amount", 0))
    note = data.get("note", "").strip()
    payment_method = data.get("payment_method", "UPI").strip()

    if amount <= 0:
        return jsonify({"error": "Amount must be greater than zero."}), 400

    conn = get_db()
    cur = conn.cursor()
    cur.execute("""
        INSERT INTO transactions (day, type, category, amount, note, payment_method)
        VALUES (?, ?, ?, ?, ?, ?)
    """, (day, tx_type, category, amount, note, payment_method))
    conn.commit()
    new_id = cur.lastrowid
    conn.close()

    return jsonify({"success": True, "id": new_id})

@app.route("/api/transactions/<int:tx_id>", methods=["DELETE"])
def delete_transaction(tx_id):
    conn = get_db()
    conn.execute("DELETE FROM transactions WHERE id = ?", (tx_id,))
    conn.commit()
    conn.close()
    return jsonify({"success": True})

@app.route("/api/analytics", methods=["GET"])
def get_analytics():
    month = request.args.get("month", "").strip() or datetime.now().strftime("%Y-%m")
    conn = get_db()

    # Total income & total expense for current month
    income_row = conn.execute("""
        SELECT COALESCE(SUM(amount), 0) FROM transactions 
        WHERE type = 'income' AND day LIKE ?
    """, (f"{month}%",)).fetchone()
    total_income = float(income_row[0])

    expense_row = conn.execute("""
        SELECT COALESCE(SUM(amount), 0) FROM transactions 
        WHERE type = 'expense' AND day LIKE ?
    """, (f"{month}%",)).fetchone()
    total_expense = float(expense_row[0])

    net_balance = total_income - total_expense
    savings_rate = round((net_balance / total_income * 100), 1) if total_income > 0 else 0

    # Expense breakdown by category
    cat_rows = conn.execute("""
        SELECT category, SUM(amount) as total 
        FROM transactions 
        WHERE type = 'expense' AND day LIKE ?
        GROUP BY category 
        ORDER BY total DESC
    """, (f"{month}%",)).fetchall()

    categories_breakdown = [{"category": r["category"], "amount": round(r["total"], 2)} for r in cat_rows]

    # Daily expense trend in month
    daily_rows = conn.execute("""
        SELECT day, 
               SUM(CASE WHEN type='income' THEN amount ELSE 0 END) as inc,
               SUM(CASE WHEN type='expense' THEN amount ELSE 0 END) as exp
        FROM transactions
        WHERE day LIKE ?
        GROUP BY day
        ORDER BY day ASC
    """, (f"{month}%",)).fetchall()

    daily_trend = [
        {"day": r["day"], "income": r["inc"], "expense": r["exp"]} for r in daily_rows
    ]

    # Monthly budget
    budget_row = conn.execute("SELECT budget_amount FROM budgets WHERE month = ?", (month,)).fetchone()
    budget_amount = float(budget_row[0]) if budget_row else 0.0

    conn.close()

    return jsonify({
        "month": month,
        "total_income": total_income,
        "total_expense": total_expense,
        "net_balance": net_balance,
        "savings_rate": savings_rate,
        "budget_amount": budget_amount,
        "budget_used_pct": round((total_expense / budget_amount * 100), 1) if budget_amount > 0 else 0,
        "categories": categories_breakdown,
        "daily_trend": daily_trend
    })

@app.route("/api/budget", methods=["POST"])
def set_budget():
    data = request.json or {}
    month = data.get("month", "").strip() or datetime.now().strftime("%Y-%m")
    amount = float(data.get("budget_amount", 0))

    conn = get_db()
    conn.execute("INSERT OR REPLACE INTO budgets (month, budget_amount) VALUES (?, ?)", (month, amount))
    conn.commit()
    conn.close()
    return jsonify({"success": True, "month": month, "budget_amount": amount})

@app.route("/api/export", methods=["GET"])
def export_csv():
    conn = get_db()
    rows = conn.execute("SELECT id, day, type, category, amount, payment_method, note FROM transactions ORDER BY day DESC").fetchall()
    conn.close()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["ID", "Date", "Type", "Category", "Amount", "Payment Method", "Note"])
    for r in rows:
        writer.writerow([r["id"], r["day"], r["type"], r["category"], r["amount"], r["payment_method"], r["note"]])

    output.seek(0)
    return Response(
        output.getvalue(),
        mimetype="text/csv",
        headers={"Content-Disposition": f"attachment;filename=expenses_{date.today()}.csv"}
    )

if __name__ == "__main__":
    app.run(debug=True, port=5001)
