📊 Strategy – Mini Accounting Software

A modern, browser-based Mini Accounting Software built with HTML, CSS, and JavaScript using IndexedDB for local data storage.

Strategy helps small businesses and students manage accounting records including:

Journal Entries

General Ledger

Trial Balance

Trading Account

Profit & Loss Account

Balance Sheet

Interactive Dashboard with Charts

PDF Export

🚀 Features
🔐 Authentication

User Registration & Login

Session persistence using localStorage

User-specific accounting data

📘 Journal Entry

Add debit/credit entries

Date, account selection, narration

Validation for accounting rules

Recent entries preview

📖 General Ledger

Account-wise ledger view

Auto-calculated debit & credit totals

Export to PDF

⚖ Trial Balance

Auto-generated from journal entries

Debit and credit balance totals

PDF export support

📈 Trading & Profit/Loss Account

Gross Profit/Loss calculation

Net Profit/Loss calculation

Direct vs Indirect expense handling

🏦 Balance Sheet

Assets

Liabilities

Owner’s Equity (Adjusted with Net Profit)

Auto-balanced totals

📊 Dashboard

Total Assets

Total Liabilities

Net Profit/Loss

Doughnut chart (Assets vs Liabilities)

Bar chart (Income vs Expenses)

🎨 UI Features

Modern split-screen login page

Sidebar navigation

Dark mode support

Fully responsive layout

Clean card-based UI

🛠 Tech Stack

HTML5

CSS3 (Custom properties, Responsive Design)

Vanilla JavaScript (ES6+)

IndexedDB (Client-side database)

Chart.js (Dashboard charts)

jsPDF + AutoTable (PDF export)

Remix Icons

Google Fonts (Inter)

📂 Project Structure
📁 Mini-Accounting-Software
│── index.html      # Main HTML structure
│── style.css       # UI styling
│── script.js       # Core logic & accounting engine
│── README.md       # Project documentation

🧠 How It Works

On first load, IndexedDB initializes:

Users store

Accounts store (with default accounts seeded)

Journal entries store

Default accounting accounts are automatically created:

Assets

Liabilities

Capital

Income

Expenses

All journal entries are:

Linked to the logged-in user

Used to generate reports dynamically

Financial statements are computed in real-time from journal data.

💻 How to Run the Project
Option 1: Directly in Browser

Download or clone the repository

Open index.html in your browser

Option 2: Using Live Server (Recommended)

Install VS Code

Install Live Server Extension

Right-click index.html

Click "Open with Live Server"

📸 Screens Included

Login & Registration Page

Dashboard Overview

Journal Entry Form

Ledger Report

Trial Balance

Trading & P&L

Balance Sheet

📌 Future Improvements

Multi-currency support

Closing stock adjustments

Better Balance Sheet PDF layout

Account creation & editing

Delete/Edit journal entries

Cloud database integration

Data backup & restore

⚠ Limitations

Data stored locally in browser (IndexedDB)

No encryption for passwords (for demo purposes only)

Not production-ready for real financial environments

📄 License

This project is open-source and free to use for educational purposes.

👨‍💻 Author

Developed as a Mini Accounting System for learning and small business practice by MOHAMMED IRFAN.A & MADHAN.R
