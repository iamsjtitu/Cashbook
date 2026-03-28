"""
Test CashBook Unified Design APIs
Tests for the new unified CashBook page with entry form on left side
"""
import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://employee-track-pay.preview.emergentagent.com').rstrip('/')

class TestCashBookAPIs:
    """Test CashBook transaction APIs"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test data"""
        self.test_date = datetime.now().strftime("%Y-%m-%d")
        self.test_month = datetime.now().strftime("%Y-%m")
        self.created_transactions = []
        self.created_parties = []
        yield
        # Cleanup
        for txn_id in self.created_transactions:
            try:
                requests.delete(f"{BASE_URL}/api/transactions/{txn_id}")
            except:
                pass
        for party_id in self.created_parties:
            try:
                requests.delete(f"{BASE_URL}/api/parties/{party_id}")
            except:
                pass
    
    def test_get_parties_list(self):
        """Test GET /api/parties - Get all parties for dropdown"""
        response = requests.get(f"{BASE_URL}/api/parties")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"SUCCESS: Found {len(data)} parties")
    
    def test_create_credit_transaction(self):
        """Test POST /api/transactions - Create credit entry"""
        payload = {
            "date": self.test_date,
            "transaction_type": "credit",
            "amount": 5000,
            "party_id": None,
            "payment_mode": "cash",
            "category": None,
            "description": "TEST_Credit_Entry_API"
        }
        response = requests.post(f"{BASE_URL}/api/transactions", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["transaction_type"] == "credit"
        assert data["amount"] == 5000
        assert "id" in data
        self.created_transactions.append(data["id"])
        print(f"SUCCESS: Created credit transaction {data['id']}")
    
    def test_create_debit_transaction_with_category(self):
        """Test POST /api/transactions - Create debit entry with category"""
        payload = {
            "date": self.test_date,
            "transaction_type": "debit",
            "amount": 2000,
            "party_id": None,
            "payment_mode": "upi",
            "category": "rent",
            "description": "TEST_Debit_Rent_API"
        }
        response = requests.post(f"{BASE_URL}/api/transactions", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["transaction_type"] == "debit"
        assert data["category"] == "rent"
        assert data["payment_mode"] == "upi"
        self.created_transactions.append(data["id"])
        print(f"SUCCESS: Created debit transaction with category {data['id']}")
    
    def test_create_party_inline(self):
        """Test POST /api/parties - Create new party inline"""
        payload = {
            "name": "TEST_Inline_Party_API",
            "phone": "9876543210",
            "address": "",
            "opening_balance": 0,
            "balance_type": "credit"
        }
        response = requests.post(f"{BASE_URL}/api/parties", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "TEST_Inline_Party_API"
        assert "id" in data
        self.created_parties.append(data["id"])
        print(f"SUCCESS: Created inline party {data['id']}")
        return data["id"]
    
    def test_create_transaction_with_party(self):
        """Test creating transaction with party and verify party balance update"""
        # First create a party
        party_payload = {
            "name": "TEST_Party_For_Txn",
            "phone": "",
            "address": "",
            "opening_balance": 1000,
            "balance_type": "debit"
        }
        party_response = requests.post(f"{BASE_URL}/api/parties", json=party_payload)
        assert party_response.status_code == 200
        party_id = party_response.json()["id"]
        self.created_parties.append(party_id)
        
        # Create credit transaction with party
        txn_payload = {
            "date": self.test_date,
            "transaction_type": "credit",
            "amount": 500,
            "party_id": party_id,
            "payment_mode": "cash",
            "category": None,
            "description": "TEST_Credit_With_Party"
        }
        txn_response = requests.post(f"{BASE_URL}/api/transactions", json=txn_payload)
        assert txn_response.status_code == 200
        self.created_transactions.append(txn_response.json()["id"])
        
        # Verify party balance updated
        party_check = requests.get(f"{BASE_URL}/api/parties/{party_id}")
        assert party_check.status_code == 200
        party_data = party_check.json()
        # Credit reduces party balance (they paid us)
        assert party_data["current_balance"] == 500  # 1000 - 500
        print(f"SUCCESS: Party balance updated correctly after credit transaction")
    
    def test_get_cashbook_by_date(self):
        """Test GET /api/cashbook/{date} - Get daily cashbook"""
        response = requests.get(f"{BASE_URL}/api/cashbook/{self.test_date}")
        assert response.status_code == 200
        data = response.json()
        assert "opening_balance" in data
        assert "total_credit" in data
        assert "total_debit" in data
        assert "closing_balance" in data
        assert "transactions" in data
        print(f"SUCCESS: Got cashbook for {self.test_date}")
        print(f"  Opening: {data['opening_balance']}, Credit: {data['total_credit']}, Debit: {data['total_debit']}, Closing: {data['closing_balance']}")
    
    def test_get_monthly_cashbook(self):
        """Test GET /api/cashbook/monthly/{month} - Get monthly cashbook"""
        response = requests.get(f"{BASE_URL}/api/cashbook/monthly/{self.test_month}")
        assert response.status_code == 200
        data = response.json()
        assert "month" in data
        assert "total_credit" in data
        assert "total_debit" in data
        assert "net_balance" in data
        print(f"SUCCESS: Got monthly cashbook for {self.test_month}")
    
    def test_delete_transaction(self):
        """Test DELETE /api/transactions/{id} - Delete transaction"""
        # First create a transaction
        payload = {
            "date": self.test_date,
            "transaction_type": "credit",
            "amount": 100,
            "party_id": None,
            "payment_mode": "cash",
            "category": None,
            "description": "TEST_To_Delete"
        }
        create_response = requests.post(f"{BASE_URL}/api/transactions", json=payload)
        assert create_response.status_code == 200
        txn_id = create_response.json()["id"]
        
        # Delete it
        delete_response = requests.delete(f"{BASE_URL}/api/transactions/{txn_id}")
        assert delete_response.status_code == 200
        
        # Verify it's deleted
        get_response = requests.get(f"{BASE_URL}/api/transactions/{txn_id}")
        assert get_response.status_code == 404
        print(f"SUCCESS: Transaction deleted and verified")
    
    def test_payment_modes(self):
        """Test all payment modes work"""
        modes = ["cash", "upi", "bank_transfer"]
        for mode in modes:
            payload = {
                "date": self.test_date,
                "transaction_type": "credit",
                "amount": 100,
                "party_id": None,
                "payment_mode": mode,
                "category": None,
                "description": f"TEST_Payment_Mode_{mode}"
            }
            response = requests.post(f"{BASE_URL}/api/transactions", json=payload)
            assert response.status_code == 200
            assert response.json()["payment_mode"] == mode
            self.created_transactions.append(response.json()["id"])
        print(f"SUCCESS: All payment modes (cash, upi, bank_transfer) work")
    
    def test_expense_categories(self):
        """Test expense categories for debit entries"""
        categories = ["salary", "rent", "electricity", "supplies", "chit_fund", "other"]
        for cat in categories:
            payload = {
                "date": self.test_date,
                "transaction_type": "debit",
                "amount": 100,
                "party_id": None,
                "payment_mode": "cash",
                "category": cat,
                "description": f"TEST_Category_{cat}"
            }
            response = requests.post(f"{BASE_URL}/api/transactions", json=payload)
            assert response.status_code == 200
            assert response.json()["category"] == cat
            self.created_transactions.append(response.json()["id"])
        print(f"SUCCESS: All expense categories work")


class TestChitFundInCashBook:
    """Test that Chit Fund entries appear in CashBook"""
    
    def test_chit_fund_transactions_visible(self):
        """Verify chit fund transactions appear in cashbook"""
        # Get all transactions
        response = requests.get(f"{BASE_URL}/api/transactions")
        assert response.status_code == 200
        data = response.json()
        
        # Check for chit fund entries
        chit_entries = [t for t in data if t.get("category") == "chit_fund" or t.get("reference_type") in ["chit_monthly", "chit_lifted"]]
        print(f"SUCCESS: Found {len(chit_entries)} chit fund entries in transactions")
        
        if len(chit_entries) > 0:
            # Verify structure
            entry = chit_entries[0]
            assert "date" in entry
            assert "amount" in entry
            assert "transaction_type" in entry
            print(f"  Sample entry: {entry['description'][:50]}...")


class TestCashBookOpeningBalance:
    """Test opening balance functionality"""
    
    def test_get_opening_balance(self):
        """Test GET /api/cashbook/opening-balance"""
        response = requests.get(f"{BASE_URL}/api/cashbook/opening-balance")
        assert response.status_code == 200
        data = response.json()
        assert "opening_balance" in data
        assert "as_on_date" in data
        print(f"SUCCESS: Opening balance: {data['opening_balance']} as on {data['as_on_date']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
