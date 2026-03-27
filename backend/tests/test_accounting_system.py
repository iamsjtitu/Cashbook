"""
Test suite for Accounting System features:
- Cash Book (Credit/Debit entries, Opening/Closing balance)
- Party Ledger (Create party, View ledger, Balance tracking)
- Interest/Byaj System (Create account, Calculate interest, Add to cashbook)
- Expenses (Add expense, Auto-link to cashbook, Category summary)
- Reports (Profit/Loss, Payment Mode, Daily Cash Flow)
- Pay Salary (Auto-add to cashbook and expenses)
"""

import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestPartyLedger:
    """Party (Ledger Account) CRUD and ledger view tests"""
    
    created_party_id = None
    
    def test_create_party_with_opening_balance(self):
        """Create a new party with opening balance"""
        payload = {
            "name": "TEST_Party_Accounting",
            "phone": "9876543210",
            "address": "Test Address 123",
            "opening_balance": 5000.0,
            "balance_type": "debit"
        }
        response = requests.post(f"{BASE_URL}/api/parties", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["name"] == "TEST_Party_Accounting"
        assert data["opening_balance"] == 5000.0
        assert data["current_balance"] == 5000.0
        assert "id" in data
        TestPartyLedger.created_party_id = data["id"]
        print(f"✓ Party created with ID: {data['id']}")
    
    def test_get_all_parties(self):
        """Get all parties"""
        response = requests.get(f"{BASE_URL}/api/parties")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Retrieved {len(data)} parties")
    
    def test_get_party_by_id(self):
        """Get party by ID"""
        if not TestPartyLedger.created_party_id:
            pytest.skip("No party created")
        
        response = requests.get(f"{BASE_URL}/api/parties/{TestPartyLedger.created_party_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "TEST_Party_Accounting"
        print(f"✓ Party retrieved: {data['name']}")
    
    def test_update_party(self):
        """Update party details"""
        if not TestPartyLedger.created_party_id:
            pytest.skip("No party created")
        
        payload = {"phone": "1234567890"}
        response = requests.put(f"{BASE_URL}/api/parties/{TestPartyLedger.created_party_id}", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["phone"] == "1234567890"
        print(f"✓ Party updated")
    
    def test_get_party_ledger_empty(self):
        """Get party ledger (should be empty initially)"""
        if not TestPartyLedger.created_party_id:
            pytest.skip("No party created")
        
        response = requests.get(f"{BASE_URL}/api/parties/{TestPartyLedger.created_party_id}/ledger")
        assert response.status_code == 200
        data = response.json()
        assert "party" in data
        assert "entries" in data
        assert data["opening_balance"] == 5000.0
        print(f"✓ Party ledger retrieved with {len(data['entries'])} entries")


class TestCashBook:
    """Cash Book transaction tests"""
    
    created_txn_id = None
    
    def test_add_credit_transaction(self):
        """Add a credit (Jama) entry to cash book"""
        today = datetime.now().strftime("%Y-%m-%d")
        payload = {
            "date": today,
            "party_id": TestPartyLedger.created_party_id,
            "transaction_type": "credit",
            "amount": 10000.0,
            "payment_mode": "cash",
            "description": "TEST_Credit entry - Cash received"
        }
        response = requests.post(f"{BASE_URL}/api/transactions", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["transaction_type"] == "credit"
        assert data["amount"] == 10000.0
        assert data["payment_mode"] == "cash"
        TestCashBook.created_txn_id = data["id"]
        print(f"✓ Credit transaction created: ₹{data['amount']}")
    
    def test_add_debit_transaction_upi(self):
        """Add a debit (Udhar) entry with UPI payment mode"""
        today = datetime.now().strftime("%Y-%m-%d")
        payload = {
            "date": today,
            "party_id": TestPartyLedger.created_party_id,
            "transaction_type": "debit",
            "amount": 3000.0,
            "payment_mode": "upi",
            "description": "TEST_Debit entry - Payment via UPI"
        }
        response = requests.post(f"{BASE_URL}/api/transactions", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        assert data["transaction_type"] == "debit"
        assert data["payment_mode"] == "upi"
        print(f"✓ Debit transaction (UPI) created: ₹{data['amount']}")
    
    def test_add_debit_transaction_bank(self):
        """Add a debit entry with Bank Transfer payment mode"""
        today = datetime.now().strftime("%Y-%m-%d")
        payload = {
            "date": today,
            "transaction_type": "debit",
            "amount": 2000.0,
            "payment_mode": "bank_transfer",
            "description": "TEST_Bank transfer payment"
        }
        response = requests.post(f"{BASE_URL}/api/transactions", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        assert data["payment_mode"] == "bank_transfer"
        print(f"✓ Debit transaction (Bank) created: ₹{data['amount']}")
    
    def test_get_cashbook_for_date(self):
        """Get cash book for today with opening/closing balance"""
        today = datetime.now().strftime("%Y-%m-%d")
        response = requests.get(f"{BASE_URL}/api/cashbook/{today}")
        assert response.status_code == 200
        
        data = response.json()
        assert "opening_balance" in data
        assert "closing_balance" in data
        assert "total_credit" in data
        assert "total_debit" in data
        assert "transactions" in data
        
        # Verify balance calculation
        expected_closing = data["opening_balance"] + data["total_credit"] - data["total_debit"]
        assert data["closing_balance"] == expected_closing, f"Closing balance mismatch: {data['closing_balance']} != {expected_closing}"
        print(f"✓ Cash book retrieved - Opening: ₹{data['opening_balance']}, Closing: ₹{data['closing_balance']}")
    
    def test_get_monthly_cashbook(self):
        """Get monthly cash book summary"""
        month = datetime.now().strftime("%Y-%m")
        response = requests.get(f"{BASE_URL}/api/cashbook/monthly/{month}")
        assert response.status_code == 200
        
        data = response.json()
        assert "total_credit" in data
        assert "total_debit" in data
        assert "net_balance" in data
        assert "daily_summary" in data
        print(f"✓ Monthly cashbook - Credit: ₹{data['total_credit']}, Debit: ₹{data['total_debit']}")
    
    def test_delete_transaction(self):
        """Delete a transaction"""
        if not TestCashBook.created_txn_id:
            pytest.skip("No transaction created")
        
        response = requests.delete(f"{BASE_URL}/api/transactions/{TestCashBook.created_txn_id}")
        assert response.status_code == 200
        
        # Verify deletion
        response = requests.get(f"{BASE_URL}/api/transactions/{TestCashBook.created_txn_id}")
        assert response.status_code == 404
        print(f"✓ Transaction deleted successfully")


class TestInterestByaj:
    """Interest/Byaj System tests"""
    
    created_account_id = None
    
    def test_create_interest_account(self):
        """Create interest account for a party"""
        if not TestPartyLedger.created_party_id:
            pytest.skip("No party created")
        
        # Use a date 30 days ago for interest calculation
        start_date = (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d")
        payload = {
            "party_id": TestPartyLedger.created_party_id,
            "principal_amount": 100000.0,
            "interest_rate": 12.0,  # 12% per year
            "start_date": start_date,
            "note": "TEST_Interest account"
        }
        response = requests.post(f"{BASE_URL}/api/interest-accounts", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["principal_amount"] == 100000.0
        assert data["interest_rate"] == 12.0
        assert data["is_active"] == True
        TestInterestByaj.created_account_id = data["id"]
        print(f"✓ Interest account created: Principal ₹{data['principal_amount']} @ {data['interest_rate']}%")
    
    def test_get_all_interest_accounts(self):
        """Get all interest accounts"""
        response = requests.get(f"{BASE_URL}/api/interest-accounts")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Retrieved {len(data)} interest accounts")
    
    def test_calculate_interest(self):
        """Calculate interest using formula: (P × R × Days) ÷ (365 × 100)"""
        if not TestInterestByaj.created_account_id:
            pytest.skip("No interest account created")
        
        end_date = datetime.now().strftime("%Y-%m-%d")
        response = requests.get(f"{BASE_URL}/api/interest-accounts/{TestInterestByaj.created_account_id}/calculate?end_date={end_date}")
        assert response.status_code == 200
        
        data = response.json()
        assert "calculated_interest" in data
        assert "days" in data
        assert "total_amount" in data
        
        # Verify formula: (P × R × Days) ÷ (365 × 100)
        expected_interest = (data["principal"] * data["interest_rate"] * data["days"]) / (365 * 100)
        assert abs(data["calculated_interest"] - round(expected_interest, 2)) < 0.01, f"Interest calculation mismatch"
        print(f"✓ Interest calculated: ₹{data['calculated_interest']} for {data['days']} days")
    
    def test_add_interest_to_cashbook(self):
        """Add calculated interest to cash book with one click"""
        if not TestInterestByaj.created_account_id:
            pytest.skip("No interest account created")
        
        end_date = datetime.now().strftime("%Y-%m-%d")
        response = requests.post(f"{BASE_URL}/api/interest-accounts/{TestInterestByaj.created_account_id}/add-to-cashbook?end_date={end_date}")
        assert response.status_code == 200
        
        data = response.json()
        assert "interest_amount" in data
        assert "transaction_id" in data
        assert data["interest_amount"] > 0
        print(f"✓ Interest ₹{data['interest_amount']} added to cash book")
    
    def test_party_ledger_shows_interest_entry(self):
        """Verify party ledger shows the interest entry"""
        if not TestPartyLedger.created_party_id:
            pytest.skip("No party created")
        
        response = requests.get(f"{BASE_URL}/api/parties/{TestPartyLedger.created_party_id}/ledger")
        assert response.status_code == 200
        
        data = response.json()
        # Should have at least one entry (the interest)
        assert len(data["entries"]) > 0, "Party ledger should have interest entry"
        
        # Find interest entry
        interest_entries = [e for e in data["entries"] if "Interest" in e["description"] or "Byaj" in e["description"]]
        assert len(interest_entries) > 0, "Interest entry not found in party ledger"
        print(f"✓ Party ledger shows {len(data['entries'])} entries including interest")


class TestExpenses:
    """Expense tracking tests"""
    
    created_expense_id = None
    
    def test_add_expense_with_category(self):
        """Add expense with category and payment mode"""
        today = datetime.now().strftime("%Y-%m-%d")
        payload = {
            "date": today,
            "category": "rent",
            "amount": 15000.0,
            "payment_mode": "bank_transfer",
            "description": "TEST_Monthly rent payment"
        }
        response = requests.post(f"{BASE_URL}/api/expenses", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["category"] == "rent"
        assert data["amount"] == 15000.0
        assert "transaction_id" in data  # Auto-linked to cash book
        TestExpenses.created_expense_id = data["id"]
        print(f"✓ Expense created: ₹{data['amount']} ({data['category']})")
    
    def test_expense_auto_linked_to_cashbook(self):
        """Verify expense is auto-linked to cash book as debit"""
        today = datetime.now().strftime("%Y-%m-%d")
        response = requests.get(f"{BASE_URL}/api/cashbook/{today}")
        assert response.status_code == 200
        
        data = response.json()
        # Find the rent expense in transactions
        rent_txns = [t for t in data["transactions"] if "rent" in t.get("description", "").lower() or t.get("category") == "rent"]
        assert len(rent_txns) > 0, "Expense not found in cash book"
        
        # Verify it's a debit
        assert rent_txns[0]["transaction_type"] == "debit"
        print(f"✓ Expense auto-linked to cash book as debit")
    
    def test_add_expense_with_party(self):
        """Add expense linked to a party"""
        if not TestPartyLedger.created_party_id:
            pytest.skip("No party created")
        
        today = datetime.now().strftime("%Y-%m-%d")
        payload = {
            "date": today,
            "category": "supplies",
            "amount": 5000.0,
            "payment_mode": "cash",
            "description": "TEST_Office supplies",
            "party_id": TestPartyLedger.created_party_id
        }
        response = requests.post(f"{BASE_URL}/api/expenses", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        assert data["party_id"] == TestPartyLedger.created_party_id
        print(f"✓ Expense with party created")
    
    def test_get_expenses_by_month(self):
        """Get expenses for current month"""
        month = datetime.now().strftime("%Y-%m")
        response = requests.get(f"{BASE_URL}/api/expenses?month={month}")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Retrieved {len(data)} expenses for {month}")
    
    def test_get_expense_summary_by_category(self):
        """Get category-wise expense summary"""
        month = datetime.now().strftime("%Y-%m")
        response = requests.get(f"{BASE_URL}/api/expenses/summary/{month}")
        assert response.status_code == 200
        
        data = response.json()
        assert "total_expenses" in data
        assert "by_category" in data
        assert "expense_count" in data
        print(f"✓ Expense summary - Total: ₹{data['total_expenses']}, Categories: {list(data['by_category'].keys())}")
    
    def test_delete_expense(self):
        """Delete expense (should also delete linked transaction)"""
        if not TestExpenses.created_expense_id:
            pytest.skip("No expense created")
        
        response = requests.delete(f"{BASE_URL}/api/expenses/{TestExpenses.created_expense_id}")
        assert response.status_code == 200
        print(f"✓ Expense deleted")


class TestReports:
    """Reports API tests"""
    
    def test_profit_loss_report(self):
        """Get Profit/Loss statement"""
        month = datetime.now().strftime("%Y-%m")
        response = requests.get(f"{BASE_URL}/api/reports/profit-loss/{month}")
        assert response.status_code == 200
        
        data = response.json()
        assert "total_income" in data
        assert "total_expense" in data
        assert "net_profit" in data
        assert "expense_breakdown" in data
        
        # Verify calculation
        expected_profit = data["total_income"] - data["total_expense"]
        assert data["net_profit"] == expected_profit
        print(f"✓ P&L Report - Income: ₹{data['total_income']}, Expense: ₹{data['total_expense']}, Profit: ₹{data['net_profit']}")
    
    def test_payment_mode_report(self):
        """Get Payment Mode breakdown"""
        month = datetime.now().strftime("%Y-%m")
        response = requests.get(f"{BASE_URL}/api/reports/payment-mode/{month}")
        assert response.status_code == 200
        
        data = response.json()
        assert "by_payment_mode" in data
        
        # Check for expected payment modes
        modes = data["by_payment_mode"]
        print(f"✓ Payment Mode Report - Modes: {list(modes.keys())}")
        for mode, values in modes.items():
            print(f"  - {mode}: Credit ₹{values.get('credit', 0)}, Debit ₹{values.get('debit', 0)}")
    
    def test_daily_cash_flow(self):
        """Get Daily Cash Flow summary"""
        month = datetime.now().strftime("%Y-%m")
        response = requests.get(f"{BASE_URL}/api/cashbook/monthly/{month}")
        assert response.status_code == 200
        
        data = response.json()
        assert "daily_summary" in data
        assert "total_credit" in data
        assert "total_debit" in data
        assert "net_balance" in data
        print(f"✓ Daily Cash Flow - {len(data['daily_summary'])} days with transactions")


class TestPaySalary:
    """Pay Salary auto-connect feature tests"""
    
    staff_id = None
    
    def test_create_staff_for_salary(self):
        """Create a staff member for salary test"""
        payload = {
            "name": "TEST_Salary_Staff",
            "phone": "9999999999",
            "joining_date": "2025-01-01",
            "monthly_salary": 30000.0
        }
        response = requests.post(f"{BASE_URL}/api/staff", json=payload)
        assert response.status_code == 200
        
        data = response.json()
        TestPaySalary.staff_id = data["id"]
        print(f"✓ Staff created for salary test: {data['name']}")
    
    def test_mark_attendance_for_salary(self):
        """Mark attendance for salary calculation"""
        if not TestPaySalary.staff_id:
            pytest.skip("No staff created")
        
        # Mark 20 days present in current month
        month = datetime.now().strftime("%Y-%m")
        for day in range(1, 21):
            date = f"{month}-{day:02d}"
            payload = {
                "staff_id": TestPaySalary.staff_id,
                "date": date,
                "status": "present"
            }
            requests.post(f"{BASE_URL}/api/attendance", json=payload)
        
        print(f"✓ Marked 20 days attendance")
    
    def test_pay_salary_auto_adds_to_cashbook(self):
        """Pay salary and verify it auto-adds to cash book and expenses"""
        if not TestPaySalary.staff_id:
            pytest.skip("No staff created")
        
        month = datetime.now().strftime("%Y-%m")
        response = requests.post(f"{BASE_URL}/api/pay-salary/{TestPaySalary.staff_id}/{month}?payment_mode=cash")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "gross_salary" in data
        assert "net_paid" in data
        assert "transaction_id" in data
        print(f"✓ Salary paid - Gross: ₹{data['gross_salary']}, Net: ₹{data['net_paid']}")
    
    def test_salary_appears_in_expenses(self):
        """Verify salary appears in expenses"""
        month = datetime.now().strftime("%Y-%m")
        response = requests.get(f"{BASE_URL}/api/expenses?month={month}&category=salary")
        assert response.status_code == 200
        
        data = response.json()
        salary_expenses = [e for e in data if e.get("category") == "salary"]
        assert len(salary_expenses) > 0, "Salary not found in expenses"
        print(f"✓ Salary found in expenses")
    
    def test_duplicate_salary_payment_blocked(self):
        """Verify duplicate salary payment is blocked"""
        if not TestPaySalary.staff_id:
            pytest.skip("No staff created")
        
        month = datetime.now().strftime("%Y-%m")
        response = requests.post(f"{BASE_URL}/api/pay-salary/{TestPaySalary.staff_id}/{month}?payment_mode=cash")
        assert response.status_code == 400, "Duplicate salary payment should be blocked"
        print(f"✓ Duplicate salary payment correctly blocked")


class TestCleanup:
    """Cleanup test data"""
    
    def test_cleanup_interest_account(self):
        """Delete test interest account"""
        if TestInterestByaj.created_account_id:
            response = requests.delete(f"{BASE_URL}/api/interest-accounts/{TestInterestByaj.created_account_id}")
            assert response.status_code == 200
            print(f"✓ Interest account cleaned up")
    
    def test_cleanup_staff(self):
        """Delete test staff"""
        if TestPaySalary.staff_id:
            response = requests.delete(f"{BASE_URL}/api/staff/{TestPaySalary.staff_id}")
            assert response.status_code == 200
            print(f"✓ Staff cleaned up")
    
    def test_cleanup_party(self):
        """Delete test party (may fail if has transactions)"""
        if TestPartyLedger.created_party_id:
            response = requests.delete(f"{BASE_URL}/api/parties/{TestPartyLedger.created_party_id}")
            # May return 400 if party has transactions
            if response.status_code == 200:
                print(f"✓ Party cleaned up")
            else:
                print(f"⚠ Party has transactions, cannot delete (expected)")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
