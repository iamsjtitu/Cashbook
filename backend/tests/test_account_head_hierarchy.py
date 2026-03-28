"""
Test Account Head Hierarchy Features
- Account Head (Category) for ledgers
- Parent Ledger (sub-ledger hierarchy)
- Grouped P&L and Balance Sheet reports
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAccountHeadAPI:
    """Test Account Head Types API"""
    
    def test_get_account_heads(self):
        """Test GET /api/account-heads returns all account head types"""
        response = requests.get(f"{BASE_URL}/api/account-heads")
        assert response.status_code == 200
        
        data = response.json()
        assert "balance_sheet" in data
        assert "profit_loss" in data
        
        # Verify balance sheet items
        bs_values = [item["value"] for item in data["balance_sheet"]]
        assert "current_asset" in bs_values
        assert "fixed_asset" in bs_values
        assert "current_liability" in bs_values
        assert "long_term_liability" in bs_values
        assert "capital" in bs_values
        
        # Verify P&L items
        pl_values = [item["value"] for item in data["profit_loss"]]
        assert "direct_income" in pl_values
        assert "indirect_income" in pl_values
        assert "direct_expense" in pl_values
        assert "indirect_expense" in pl_values
        
        print("✓ Account heads API returns all categories correctly")


class TestPartyWithAccountHead:
    """Test Party/Ledger creation with Account Head"""
    
    @pytest.fixture
    def cleanup_test_parties(self):
        """Cleanup test parties after tests"""
        created_ids = []
        yield created_ids
        # Cleanup
        for party_id in created_ids:
            try:
                requests.delete(f"{BASE_URL}/api/parties/{party_id}")
            except:
                pass
    
    def test_create_party_with_account_head(self, cleanup_test_parties):
        """Test creating a ledger with Account Head category"""
        party_data = {
            "name": f"TEST_DirectExpense_{uuid.uuid4().hex[:6]}",
            "phone": "9876543210",
            "address": "Test Address",
            "opening_balance": 1000.0,
            "balance_type": "debit",
            "account_head": "direct_expense"
        }
        
        response = requests.post(f"{BASE_URL}/api/parties", json=party_data)
        assert response.status_code == 200
        
        data = response.json()
        cleanup_test_parties.append(data["id"])
        
        assert data["name"] == party_data["name"]
        assert data["account_head"] == "direct_expense"
        assert data["opening_balance"] == 1000.0
        
        print("✓ Party created with account_head = direct_expense")
    
    def test_create_party_with_parent_ledger(self, cleanup_test_parties):
        """Test creating a sub-ledger with parent party"""
        # First create parent party
        parent_data = {
            "name": f"TEST_ParentLedger_{uuid.uuid4().hex[:6]}",
            "account_head": "current_asset",
            "opening_balance": 5000.0,
            "balance_type": "debit"
        }
        
        parent_response = requests.post(f"{BASE_URL}/api/parties", json=parent_data)
        assert parent_response.status_code == 200
        parent = parent_response.json()
        cleanup_test_parties.append(parent["id"])
        
        # Create sub-ledger
        child_data = {
            "name": f"TEST_SubLedger_{uuid.uuid4().hex[:6]}",
            "parent_party_id": parent["id"],
            "opening_balance": 2000.0,
            "balance_type": "debit"
        }
        
        child_response = requests.post(f"{BASE_URL}/api/parties", json=child_data)
        assert child_response.status_code == 200
        child = child_response.json()
        cleanup_test_parties.append(child["id"])
        
        assert child["parent_party_id"] == parent["id"]
        
        print("✓ Sub-ledger created with parent_party_id")
    
    def test_update_party_account_head(self, cleanup_test_parties):
        """Test updating a party's account head"""
        # Create party without account head
        party_data = {
            "name": f"TEST_NoHead_{uuid.uuid4().hex[:6]}",
            "opening_balance": 500.0,
            "balance_type": "debit"
        }
        
        create_response = requests.post(f"{BASE_URL}/api/parties", json=party_data)
        assert create_response.status_code == 200
        party = create_response.json()
        cleanup_test_parties.append(party["id"])
        
        # Update with account head
        update_response = requests.put(
            f"{BASE_URL}/api/parties/{party['id']}", 
            json={"account_head": "indirect_expense"}
        )
        assert update_response.status_code == 200
        
        updated = update_response.json()
        assert updated["account_head"] == "indirect_expense"
        
        print("✓ Party account_head updated successfully")


class TestGroupedReports:
    """Test P&L and Balance Sheet grouped by Account Head"""
    
    def test_parties_grouped_endpoint(self):
        """Test GET /api/parties/grouped returns parties grouped by account head"""
        response = requests.get(f"{BASE_URL}/api/parties/grouped")
        assert response.status_code == 200
        
        data = response.json()
        
        # Verify all expected groups exist
        expected_groups = [
            "current_asset", "fixed_asset", 
            "current_liability", "long_term_liability", "capital",
            "direct_income", "indirect_income",
            "direct_expense", "indirect_expense",
            "uncategorized"
        ]
        
        for group in expected_groups:
            assert group in data, f"Missing group: {group}"
        
        print("✓ Parties grouped endpoint returns all account head groups")
    
    def test_simple_profit_loss_report(self):
        """Test P&L report endpoint"""
        response = requests.get(f"{BASE_URL}/api/reports/simple-profit-loss")
        assert response.status_code == 200
        
        data = response.json()
        
        assert "income" in data
        assert "expenses" in data
        assert "net_profit" in data
        assert "total" in data["income"]
        assert "total" in data["expenses"]
        
        print(f"✓ P&L Report: Income={data['income']['total']}, Expenses={data['expenses']['total']}, Net={data['net_profit']}")
    
    def test_simple_balance_sheet_report(self):
        """Test Balance Sheet report endpoint"""
        response = requests.get(f"{BASE_URL}/api/reports/simple-balance-sheet")
        assert response.status_code == 200
        
        data = response.json()
        
        assert "assets" in data
        assert "liabilities" in data
        assert "capital" in data
        assert "summary" in data
        
        print(f"✓ Balance Sheet: Assets={data['assets']['total']}, Liabilities={data['liabilities']['total']}")


class TestExpenseCategories:
    """Test Expense Categories (custom category creation is frontend-only via localStorage)"""
    
    def test_expense_api_with_category(self):
        """Test creating expense with category"""
        expense_data = {
            "date": "2026-01-15",
            "category": "rent",
            "amount": 5000.0,
            "payment_mode": "cash",
            "description": "TEST_Monthly rent payment"
        }
        
        response = requests.post(f"{BASE_URL}/api/expenses", json=expense_data)
        assert response.status_code == 200
        
        data = response.json()
        assert data["category"] == "rent"
        assert data["amount"] == 5000.0
        
        # Cleanup
        if data.get("id"):
            requests.delete(f"{BASE_URL}/api/expenses/{data['id']}")
        
        print("✓ Expense created with category")
    
    def test_expense_summary_by_category(self):
        """Test expense summary grouped by category"""
        response = requests.get(f"{BASE_URL}/api/expenses/summary/2026-01")
        assert response.status_code == 200
        
        data = response.json()
        assert "total_expenses" in data
        assert "by_category" in data
        
        print(f"✓ Expense summary: Total={data['total_expenses']}, Categories={list(data['by_category'].keys())}")


class TestLedgerWithDirectExpense:
    """Test creating ledger with Direct Expense head and verify in P&L"""
    
    @pytest.fixture
    def test_expense_ledger(self):
        """Create a test expense ledger"""
        party_data = {
            "name": f"TEST_DirectExpenseLedger_{uuid.uuid4().hex[:6]}",
            "account_head": "direct_expense",
            "opening_balance": 10000.0,
            "balance_type": "debit"
        }
        
        response = requests.post(f"{BASE_URL}/api/parties", json=party_data)
        assert response.status_code == 200
        party = response.json()
        
        yield party
        
        # Cleanup
        try:
            requests.delete(f"{BASE_URL}/api/parties/{party['id']}")
        except:
            pass
    
    def test_direct_expense_ledger_in_pl(self, test_expense_ledger):
        """Verify direct expense ledger appears in P&L"""
        # Get parties grouped
        response = requests.get(f"{BASE_URL}/api/parties/grouped")
        assert response.status_code == 200
        
        data = response.json()
        direct_expenses = data.get("direct_expense", [])
        
        # Find our test ledger
        found = any(p["id"] == test_expense_ledger["id"] for p in direct_expenses)
        assert found, "Test ledger not found in direct_expense group"
        
        print("✓ Direct expense ledger appears in grouped parties")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
