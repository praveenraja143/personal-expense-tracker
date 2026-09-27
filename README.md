# ApexSpend • Personal Expense & Cashflow Tracker 💳📊

![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=for-the-badge&logo=python&logoColor=white)
![Flask](https://img.shields.io/badge/Flask-3.x-black?style=for-the-badge&logo=flask&logoColor=white)
![SQLite](https://img.shields.io/badge/Database-SQLite3-003B57?style=for-the-badge&logo=sqlite&logoColor=white)
![Chart.js](https://img.shields.io/badge/Visualizations-Chart.js-FF6384?style=for-the-badge&logo=chartdotjs&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)

A modern, full-stack personal finance and expense analytics web application. Upgraded from a simple CLI script into a high-performance interactive FinTech web dashboard with SQLite persistence, dynamic Chart.js visualizations, monthly budget management, and instant CSV export.

---

## ✨ Features

- 📊 **Dynamic Financial Visualizations**:
  - **Doughnut Chart**: Real-time spending breakdown across categorized expense buckets.
  - **Bar Chart**: Dual-channel daily cashflow (Income vs Expense) comparison.
- 🎯 **Monthly Budget Intelligence**: Set monthly spending caps with animated progress indicators and threshold warning states (75% warning, 100% budget breach).
- 🏷️ **Comprehensive Categorization**: Pre-configured categories for Food & Dining, Rent, Transit, Utilities, Shopping, Salary, Freelance, and more.
- 💳 **Payment Method Tracking**: Differentiate spending across UPI, Credit/Debit Cards, Cash, and Net Banking.
- ⚡ **Real-Time Search & Multi-Filter**: Filter dynamically by Year-Month, Transaction Type (Income/Expense), Category, or free text keywords.
- 📥 **One-Click CSV Export**: Download complete transaction records directly into CSV for external spreadsheets or tax preparation.
- 🌙 **Sleek FinTech Dark Theme**: Built with rich glassmorphism styling, clean metric KPI tiles, and responsive mobile-ready layout.

---

## 🚀 Quick Start

### 1. Prerequisites
- Python 3.10+

### 2. Installation
```bash
# Clone the repository
git clone https://github.com/praveenraja143/personal-expense-tracker.git
cd personal-expense-tracker

# Install dependencies
pip install -r requirements.txt
```

### 3. Run the Server
```bash
python app.py
```
Open your browser and navigate to:
```
http://localhost:5001
```

---

## 🗄️ Database Architecture

The application uses an embedded **SQLite3** engine with automatic table initialization:
- `transactions`: Stores individual transactions (`id`, `day`, `type`, `category`, `amount`, `payment_method`, `note`).
- `budgets`: Stores monthly budget allocations (`month`, `budget_amount`).

---

## 🛠️ Tech Stack
- **Backend**: Python 3, Flask, SQLite3, CSV module
- **Frontend**: Vanilla ES6+ JavaScript, Chart.js 4.x CDN, Semantic HTML5, Vanilla CSS3 (Custom Glassmorphism Design System)
- **Icons**: FontAwesome 6

---

## 📄 License
This project is open-source under the [MIT License](LICENSE).
