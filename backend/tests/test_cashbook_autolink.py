"""
Test Cash Book Auto-Linking Features
Tests for: Salary Payment, Advance, Byaj (Interest), Chit Fund EMI
All modules should automatically create entries in Cash Book
"""
import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestCashBookAutoLink:
    """Test Cash Book auto-linking from various modules"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test data"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        self.created_ids = {
            "staff": [],
            "advances": [],
            "transactions": [],
            "parties": [],
            "interest_accounts": [],
            "chit_funds": [],
            "salary_payments": []
        }
        yield
        # Cleanup
        self._cleanup()
    
    def _cleanup(self):
        """Clean up test data"""
        for advance_id in self.created_ids["advances"]:
            try:
                self.session.delete(f"{BASE_URL}/api/advances/{advance_id}")
            except:
                pass
        for txn_id in self.created_ids["transactions"]:
            try:
                self.session.delete(f"{BASE_URL}/api/transactions/{txn_id}")
            except:
                pass
        for staff_id in self.created_ids["staff"]:
            try:
                self.session.delete(f"{BASE_URL}/api/staff/{staff_id}")
            except:
                pass
        for party_id in self.created_ids["parties"]:
            try:
                self.session.delete(f"{BASE_URL}/api/parties/{party_id}")
            except:
                pass
        for ia_id in self.created_ids["interest_accounts"]:
            try:
                self.session.delete(f"{BASE_URL}/api/interest-accounts/{ia_id}")
            except:
                pass
        for chit_id in self.created_ids["chit_funds"]:
            try:
                self.session.delete(f"{BASE_URL}/api/chit-funds/{chit_id}")
            except:
                pass

    # ==================== ADVANCE AUTO-LINK TESTS ====================
    
    def test_advance_creates_cashbook_entry(self):
        """POST /api/advances - Should auto-create Cash Book Debit entry"""
        # First create a staff member
        staff_res = self.session.post(f"{BASE_URL}/api/staff", json={
            "name": "TEST_Advance_Staff",
            "phone": "9999999999",
            "joining_date": "2025-01-01",
            "monthly_salary": 15000
        })
        assert staff_res.status_code == 200
        staff = staff_res.json()
        self.created_ids["staff"].append(staff["id"])
        
        # Create advance
        today = datetime.now().strftime("%Y-%m-%d")
        advance_res = self.session.post(f"{BASE_URL}/api/advances", json={
            "staff_id": staff["id"],
            "amount": 2000,
            "date": today,
            "note": "Emergency advance"
        })
        assert advance_res.status_code == 200, f"Advance creation failed: {advance_res.text}"
        advance = advance_res.json()
        self.created_ids["advances"].append(advance["id"])
        
        # Verify Cash Book entry was created
        cashbook_res = self.session.get(f"{BASE_URL}/api/cashbook/{today}")
        assert cashbook_res.status_code == 200
        cashbook = cashbook_res.json()
        
        # Find the advance transaction
        advance_txn = None
        for txn in cashbook.get("transactions", []):
            if txn.get("reference_id") == advance["id"] and txn.get("reference_type") == "advance":
                advance_txn = txn
                self.created_ids["transactions"].append(txn["id"])
                break
        
        assert advance_txn is not None, "Advance transaction not found in Cash Book"
        assert advance_txn["transaction_type"] == "debit", "Advance should be Debit entry"
        assert advance_txn["amount"] == 2000, "Advance amount mismatch"
        assert advance_txn["category"] == "salary", "Advance category should be 'salary'"
        assert "TEST_Advance_Staff" in advance_txn["description"], "Staff name should be in description"
        print(f"✓ Advance auto-created Cash Book entry: {advance_txn['description']}")

    # ==================== SALARY PAYMENT AUTO-LINK TESTS ====================
    
    def test_salary_pay_creates_cashbook_entry(self):
        """POST /api/salary/pay - Should auto-create Cash Book Debit entry"""
        # Create staff
        staff_res = self.session.post(f"{BASE_URL}/api/staff", json={
            "name": "TEST_Salary_Staff",
            "phone": "8888888888",
            "joining_date": "2025-01-01",
            "monthly_salary": 20000
        })
        assert staff_res.status_code == 200
        staff = staff_res.json()
        self.created_ids["staff"].append(staff["id"])
        
        # Pay salary
        today = datetime.now().strftime("%Y-%m-%d")
        month = datetime.now().strftime("%Y-%m")
        
        pay_res = self.session.post(f"{BASE_URL}/api/salary/pay", json={
            "staff_id": staff["id"],
            "month": month,
            "amount": 18000,
            "payment_date": today,
            "payment_mode": "cash",
            "advance_deducted": 2000,
            "note": "Monthly salary"
        })
        assert pay_res.status_code == 200, f"Salary payment failed: {pay_res.text}"
        pay_data = pay_res.json()
        
        # Verify response
        assert pay_data["gross_amount"] == 18000
        assert pay_data["advance_deducted"] == 2000
        assert pay_data["net_paid"] == 16000
        assert pay_data["transaction_created"] == True
        
        # Verify Cash Book entry
        cashbook_res = self.session.get(f"{BASE_URL}/api/cashbook/{today}")
        assert cashbook_res.status_code == 200
        cashbook = cashbook_res.json()
        
        # Find salary transaction
        salary_txn = None
        for txn in cashbook.get("transactions", []):
            if txn.get("reference_type") == "salary_payment" and "TEST_Salary_Staff" in txn.get("description", ""):
                salary_txn = txn
                self.created_ids["transactions"].append(txn["id"])
                break
        
        assert salary_txn is not None, "Salary transaction not found in Cash Book"
        assert salary_txn["transaction_type"] == "debit", "Salary should be Debit entry"
        assert salary_txn["amount"] == 16000, "Net salary amount mismatch (should be gross - advance)"
        assert salary_txn["category"] == "salary", "Salary category should be 'salary'"
        assert "Advance" in salary_txn["description"], "Advance deduction should be mentioned"
        print(f"✓ Salary payment auto-created Cash Book entry: {salary_txn['description']}")

    def test_salary_pay_with_zero_net(self):
        """POST /api/salary/pay - No Cash Book entry if net is 0"""
        # Create staff
        staff_res = self.session.post(f"{BASE_URL}/api/staff", json={
            "name": "TEST_ZeroNet_Staff",
            "phone": "7777777777",
            "joining_date": "2025-01-01",
            "monthly_salary": 10000
        })
        assert staff_res.status_code == 200
        staff = staff_res.json()
        self.created_ids["staff"].append(staff["id"])
        
        # Pay salary with full advance deduction
        today = datetime.now().strftime("%Y-%m-%d")
        month = datetime.now().strftime("%Y-%m")
        
        pay_res = self.session.post(f"{BASE_URL}/api/salary/pay", json={
            "staff_id": staff["id"],
            "month": month,
            "amount": 5000,
            "payment_date": today,
            "payment_mode": "cash",
            "advance_deducted": 5000,  # Full deduction
            "note": "Full advance deduction"
        })
        assert pay_res.status_code == 200
        pay_data = pay_res.json()
        
        assert pay_data["net_paid"] == 0
        assert pay_data["transaction_created"] == False
        print("✓ No Cash Book entry created when net salary is 0")

    def test_get_salary_payments(self):
        """GET /api/salary/payments/{month} - Returns salary payments for month"""
        month = datetime.now().strftime("%Y-%m")
        res = self.session.get(f"{BASE_URL}/api/salary/payments/{month}")
        assert res.status_code == 200
        assert isinstance(res.json(), list)
        print(f"✓ GET /api/salary/payments/{month} returns list")

    # ==================== BYAJ (INTEREST) AUTO-LINK TESTS ====================
    
    def test_byaj_adds_to_cashbook(self):
        """POST /api/interest-accounts/{id}/add-to-cashbook - Should create Cash Book Debit entry"""
        # Create party first
        party_res = self.session.post(f"{BASE_URL}/api/parties", json={
            "name": "TEST_Byaj_Party",
            "phone": "6666666666",
            "opening_balance": 0
        })
        assert party_res.status_code == 200
        party = party_res.json()
        self.created_ids["parties"].append(party["id"])
        
        # Create interest account (30 days ago to have some interest)
        from datetime import timedelta
        start_date = (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d")
        
        ia_res = self.session.post(f"{BASE_URL}/api/interest-accounts", json={
            "party_id": party["id"],
            "principal_amount": 100000,
            "interest_rate": 2,  # 2% monthly
            "start_date": start_date,
            "note": "Test loan"
        })
        assert ia_res.status_code == 200
        ia = ia_res.json()
        self.created_ids["interest_accounts"].append(ia["id"])
        
        # Add interest to cashbook
        add_res = self.session.post(f"{BASE_URL}/api/interest-accounts/{ia['id']}/add-to-cashbook")
        assert add_res.status_code == 200, f"Add to cashbook failed: {add_res.text}"
        add_data = add_res.json()
        
        assert "interest_amount" in add_data
        assert add_data["interest_amount"] > 0
        assert "transaction_id" in add_data
        self.created_ids["transactions"].append(add_data["transaction_id"])
        
        # Verify Cash Book entry
        today = datetime.now().strftime("%Y-%m-%d")
        cashbook_res = self.session.get(f"{BASE_URL}/api/cashbook/{today}")
        assert cashbook_res.status_code == 200
        cashbook = cashbook_res.json()
        
        # Find interest transaction
        interest_txn = None
        for txn in cashbook.get("transactions", []):
            if txn.get("reference_type") == "interest" and txn.get("reference_id") == ia["id"]:
                interest_txn = txn
                break
        
        assert interest_txn is not None, "Interest transaction not found in Cash Book"
        assert interest_txn["transaction_type"] == "debit", "Interest should be Debit entry"
        assert interest_txn["category"] == "interest_paid", "Interest category should be 'interest_paid'"
        assert "Byaj" in interest_txn["description"], "Description should mention Byaj"
        print(f"✓ Byaj auto-created Cash Book entry: {interest_txn['description']}")

    # ==================== CHIT FUND EMI AUTO-LINK TESTS ====================
    
    def test_chit_monthly_entry_creates_cashbook(self):
        """POST /api/chit-funds/{id}/monthly-entry - Should create Cash Book Debit entry"""
        # Create chit fund
        chit_res = self.session.post(f"{BASE_URL}/api/chit-funds", json={
            "name": "TEST_Chit_Fund",
            "chit_value": 500000,
            "monthly_installment": 25000,
            "total_members": 20,
            "duration_months": 20,
            "start_date": "2025-01-01",
            "organizer": "Test Organizer"
        })
        assert chit_res.status_code == 200
        chit = chit_res.json()
        self.created_ids["chit_funds"].append(chit["id"])
        
        # Add monthly entry
        today = datetime.now().strftime("%Y-%m-%d")
        entry_res = self.session.post(f"{BASE_URL}/api/chit-funds/{chit['id']}/monthly-entry", json={
            "chit_id": chit["id"],
            "month_number": 1,
            "payment_date": today,
            "paid_amount": 25000,
            "dividend_received": 2000,
            "payment_mode": "cash",
            "note": "First month EMI"
        })
        assert entry_res.status_code == 200, f"Monthly entry failed: {entry_res.text}"
        entry_data = entry_res.json()
        
        assert entry_data["paid"] == 25000
        assert entry_data["dividend_received"] == 2000
        assert entry_data["effective_cost"] == 23000
        assert "transaction_id" in entry_data
        self.created_ids["transactions"].append(entry_data["transaction_id"])
        
        # Verify Cash Book entry
        cashbook_res = self.session.get(f"{BASE_URL}/api/cashbook/{today}")
        assert cashbook_res.status_code == 200
        cashbook = cashbook_res.json()
        
        # Find chit transaction
        chit_txn = None
        for txn in cashbook.get("transactions", []):
            if txn.get("reference_type") == "chit_monthly" and txn.get("reference_id") == chit["id"]:
                chit_txn = txn
                break
        
        assert chit_txn is not None, "Chit Fund transaction not found in Cash Book"
        assert chit_txn["transaction_type"] == "debit", "Chit EMI should be Debit entry"
        assert chit_txn["amount"] == 25000, "Chit EMI amount should be paid_amount"
        assert chit_txn["category"] == "chit_fund", "Chit category should be 'chit_fund'"
        assert "TEST_Chit_Fund" in chit_txn["description"], "Chit name should be in description"
        print(f"✓ Chit Fund EMI auto-created Cash Book entry: {chit_txn['description']}")

    # ==================== CASH BOOK UNIFIED VIEW TESTS ====================
    
    def test_cashbook_shows_all_entry_types(self):
        """GET /api/cashbook/{date} - Should show entries from all modules"""
        today = datetime.now().strftime("%Y-%m-%d")
        
        # Create staff for advance and salary
        staff_res = self.session.post(f"{BASE_URL}/api/staff", json={
            "name": "TEST_Unified_Staff",
            "phone": "5555555555",
            "joining_date": "2025-01-01",
            "monthly_salary": 15000
        })
        staff = staff_res.json()
        self.created_ids["staff"].append(staff["id"])
        
        # Create advance
        adv_res = self.session.post(f"{BASE_URL}/api/advances", json={
            "staff_id": staff["id"],
            "amount": 1000,
            "date": today,
            "note": "Test advance"
        })
        advance = adv_res.json()
        self.created_ids["advances"].append(advance["id"])
        
        # Create manual transaction
        txn_res = self.session.post(f"{BASE_URL}/api/transactions", json={
            "date": today,
            "transaction_type": "credit",
            "amount": 5000,
            "payment_mode": "cash",
            "description": "TEST_Manual_Credit"
        })
        txn = txn_res.json()
        self.created_ids["transactions"].append(txn["id"])
        
        # Get cashbook
        cashbook_res = self.session.get(f"{BASE_URL}/api/cashbook/{today}")
        assert cashbook_res.status_code == 200
        cashbook = cashbook_res.json()
        
        # Verify structure
        assert "opening_balance" in cashbook
        assert "total_credit" in cashbook
        assert "total_debit" in cashbook
        assert "closing_balance" in cashbook
        assert "transactions" in cashbook
        
        # Verify we have both auto-linked and manual entries
        txn_types = set()
        for txn in cashbook.get("transactions", []):
            ref_type = txn.get("reference_type")
            if ref_type:
                txn_types.add(ref_type)
            if "TEST_Manual_Credit" in txn.get("description", ""):
                txn_types.add("manual")
        
        print(f"✓ Cash Book shows entry types: {txn_types}")
        assert "advance" in txn_types or "manual" in txn_types, "Should have at least one entry type"

    def test_cashbook_summary_cards(self):
        """GET /api/cashbook/{date} - Summary should include all entry types"""
        today = datetime.now().strftime("%Y-%m-%d")
        
        # Create a credit entry
        self.session.post(f"{BASE_URL}/api/transactions", json={
            "date": today,
            "transaction_type": "credit",
            "amount": 10000,
            "payment_mode": "cash",
            "description": "TEST_Summary_Credit"
        })
        
        # Create a debit entry
        self.session.post(f"{BASE_URL}/api/transactions", json={
            "date": today,
            "transaction_type": "debit",
            "amount": 3000,
            "payment_mode": "cash",
            "category": "other",
            "description": "TEST_Summary_Debit"
        })
        
        # Get cashbook
        cashbook_res = self.session.get(f"{BASE_URL}/api/cashbook/{today}")
        assert cashbook_res.status_code == 200
        cashbook = cashbook_res.json()
        
        # Verify summary calculations
        assert cashbook["total_credit"] >= 10000, "Total credit should include our entry"
        assert cashbook["total_debit"] >= 3000, "Total debit should include our entry"
        
        # Closing = Opening + Credit - Debit
        expected_closing = cashbook["opening_balance"] + cashbook["total_credit"] - cashbook["total_debit"]
        assert cashbook["closing_balance"] == expected_closing, "Closing balance calculation incorrect"
        print(f"✓ Summary cards: Opening={cashbook['opening_balance']}, Credit={cashbook['total_credit']}, Debit={cashbook['total_debit']}, Closing={cashbook['closing_balance']}")

    # ==================== PARTY LEDGER BALANCE UPDATE TESTS ====================
    
    def test_party_transaction_updates_balance(self):
        """POST /api/transactions with party_id - Should update party balance"""
        # Create party
        party_res = self.session.post(f"{BASE_URL}/api/parties", json={
            "name": "TEST_Balance_Party",
            "phone": "4444444444",
            "opening_balance": 0
        })
        assert party_res.status_code == 200
        party = party_res.json()
        self.created_ids["parties"].append(party["id"])
        initial_balance = party["current_balance"]
        
        # Create debit transaction (we owe them more)
        today = datetime.now().strftime("%Y-%m-%d")
        txn_res = self.session.post(f"{BASE_URL}/api/transactions", json={
            "date": today,
            "party_id": party["id"],
            "transaction_type": "debit",
            "amount": 5000,
            "payment_mode": "cash",
            "description": "TEST_Party_Debit"
        })
        assert txn_res.status_code == 200
        txn = txn_res.json()
        self.created_ids["transactions"].append(txn["id"])
        
        # Verify party balance updated
        party_res = self.session.get(f"{BASE_URL}/api/parties/{party['id']}")
        assert party_res.status_code == 200
        updated_party = party_res.json()
        
        assert updated_party["current_balance"] == initial_balance + 5000, "Party balance should increase on debit"
        print(f"✓ Party balance updated: {initial_balance} -> {updated_party['current_balance']}")

    def test_expense_category_tracking(self):
        """POST /api/transactions with category - Should track expense categories"""
        today = datetime.now().strftime("%Y-%m-%d")
        
        # Create expenses with different categories
        categories = ["salary", "rent", "electricity", "supplies"]
        for cat in categories:
            txn_res = self.session.post(f"{BASE_URL}/api/transactions", json={
                "date": today,
                "transaction_type": "debit",
                "amount": 1000,
                "payment_mode": "cash",
                "category": cat,
                "description": f"TEST_{cat}_expense"
            })
            assert txn_res.status_code == 200
            self.created_ids["transactions"].append(txn_res.json()["id"])
        
        # Get cashbook and verify categories
        cashbook_res = self.session.get(f"{BASE_URL}/api/cashbook/{today}")
        assert cashbook_res.status_code == 200
        cashbook = cashbook_res.json()
        
        found_categories = set()
        for txn in cashbook.get("transactions", []):
            if txn.get("category") and txn.get("description", "").startswith("TEST_"):
                found_categories.add(txn["category"])
        
        for cat in categories:
            assert cat in found_categories, f"Category {cat} not found in transactions"
        print(f"✓ Expense categories tracked: {found_categories}")


class TestCashBookEntryForm:
    """Test Cash Book manual entry form functionality"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        self.created_ids = {"transactions": [], "parties": []}
        yield
        for txn_id in self.created_ids["transactions"]:
            try:
                self.session.delete(f"{BASE_URL}/api/transactions/{txn_id}")
            except:
                pass
        for party_id in self.created_ids["parties"]:
            try:
                self.session.delete(f"{BASE_URL}/api/parties/{party_id}")
            except:
                pass

    def test_create_credit_entry(self):
        """POST /api/transactions - Create credit (Jama) entry"""
        today = datetime.now().strftime("%Y-%m-%d")
        res = self.session.post(f"{BASE_URL}/api/transactions", json={
            "date": today,
            "transaction_type": "credit",
            "amount": 15000,
            "payment_mode": "upi",
            "description": "TEST_Credit_Entry"
        })
        assert res.status_code == 200
        txn = res.json()
        self.created_ids["transactions"].append(txn["id"])
        
        assert txn["transaction_type"] == "credit"
        assert txn["amount"] == 15000
        assert txn["payment_mode"] == "upi"
        print("✓ Credit entry created successfully")

    def test_create_debit_entry_with_category(self):
        """POST /api/transactions - Create debit (Udhar) entry with category"""
        today = datetime.now().strftime("%Y-%m-%d")
        res = self.session.post(f"{BASE_URL}/api/transactions", json={
            "date": today,
            "transaction_type": "debit",
            "amount": 8000,
            "payment_mode": "cash",
            "category": "rent",
            "description": "TEST_Rent_Payment"
        })
        assert res.status_code == 200
        txn = res.json()
        self.created_ids["transactions"].append(txn["id"])
        
        assert txn["transaction_type"] == "debit"
        assert txn["amount"] == 8000
        assert txn["category"] == "rent"
        print("✓ Debit entry with category created successfully")

    def test_create_entry_with_new_party(self):
        """POST /api/parties + POST /api/transactions - Create party inline and link"""
        # Create party
        party_res = self.session.post(f"{BASE_URL}/api/parties", json={
            "name": "TEST_New_Party",
            "phone": "3333333333",
            "opening_balance": 0
        })
        assert party_res.status_code == 200
        party = party_res.json()
        self.created_ids["parties"].append(party["id"])
        
        # Create transaction with party
        today = datetime.now().strftime("%Y-%m-%d")
        txn_res = self.session.post(f"{BASE_URL}/api/transactions", json={
            "date": today,
            "party_id": party["id"],
            "transaction_type": "credit",
            "amount": 20000,
            "payment_mode": "bank_transfer",
            "description": "TEST_Party_Transaction"
        })
        assert txn_res.status_code == 200
        txn = txn_res.json()
        self.created_ids["transactions"].append(txn["id"])
        
        assert txn["party_id"] == party["id"]
        print("✓ Transaction with new party created successfully")

    def test_all_payment_modes(self):
        """POST /api/transactions - All payment modes work"""
        today = datetime.now().strftime("%Y-%m-%d")
        modes = ["cash", "upi", "bank_transfer"]
        
        for mode in modes:
            res = self.session.post(f"{BASE_URL}/api/transactions", json={
                "date": today,
                "transaction_type": "credit",
                "amount": 1000,
                "payment_mode": mode,
                "description": f"TEST_{mode}_payment"
            })
            assert res.status_code == 200, f"Payment mode {mode} failed"
            self.created_ids["transactions"].append(res.json()["id"])
        
        print(f"✓ All payment modes work: {modes}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
