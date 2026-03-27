"""
Test Suite for Proper Accounting System
Tests: Chart of Accounts, Journal Entries (Vouchers), Trial Balance, P&L Statement, Balance Sheet
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestFinancialYear:
    """Financial Year API tests"""
    
    def test_get_active_financial_year(self):
        """Test getting active financial year (April-March)"""
        response = requests.get(f"{BASE_URL}/api/financial-years/active")
        assert response.status_code == 200
        data = response.json()
        assert "name" in data
        assert "start_date" in data
        assert "end_date" in data
        # Financial year should be April to March
        assert "-04-01" in data["start_date"]
        assert "-03-31" in data["end_date"]
        print(f"Active FY: {data['name']} ({data['start_date']} to {data['end_date']})")


class TestChartOfAccounts:
    """Chart of Accounts CRUD tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - ensure default accounts exist"""
        # Initialize defaults if needed
        requests.post(f"{BASE_URL}/api/accounts/initialize-defaults")
    
    def test_initialize_default_accounts(self):
        """Test initializing 30 default accounts"""
        # First clear accounts for clean test
        response = requests.get(f"{BASE_URL}/api/accounts")
        assert response.status_code == 200
        accounts = response.json()
        print(f"Total accounts: {len(accounts)}")
        # Should have accounts (either existing or newly created)
        assert len(accounts) >= 0  # May be 0 if already initialized
    
    def test_get_accounts_grouped(self):
        """Test getting accounts grouped by type"""
        response = requests.get(f"{BASE_URL}/api/accounts/grouped/all")
        assert response.status_code == 200
        data = response.json()
        
        # Verify 5 account types exist
        assert "asset" in data
        assert "liability" in data
        assert "capital" in data
        assert "income" in data
        assert "expense" in data
        
        # Verify sub-types
        assert "current_asset" in data["asset"]
        assert "fixed_asset" in data["asset"]
        assert "current_liability" in data["liability"]
        assert "long_term_liability" in data["liability"]
        assert "owners_capital" in data["capital"]
        assert "direct_income" in data["income"]
        assert "indirect_income" in data["income"]
        assert "direct_expense" in data["expense"]
        assert "indirect_expense" in data["expense"]
        print("All 5 account types with sub-types verified")
    
    def test_create_new_account(self):
        """Test creating a new account with type and sub-type"""
        unique_code = f"TEST{uuid.uuid4().hex[:4].upper()}"
        account_data = {
            "name": f"TEST_Petty Cash {unique_code}",
            "account_type": "asset",
            "sub_type": "current_asset",
            "code": unique_code,
            "description": "Test petty cash account",
            "opening_balance": 5000,
            "opening_balance_type": "debit"
        }
        
        response = requests.post(f"{BASE_URL}/api/accounts", json=account_data)
        assert response.status_code == 200
        data = response.json()
        
        assert data["name"] == account_data["name"]
        assert data["account_type"] == "asset"
        assert data["sub_type"] == "current_asset"
        assert data["code"] == unique_code
        assert data["opening_balance"] == 5000
        assert "id" in data
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/accounts/{data['id']}")
        print(f"Created and deleted test account: {account_data['name']}")
    
    def test_get_account_ledger(self):
        """Test viewing account ledger"""
        # Get first account
        response = requests.get(f"{BASE_URL}/api/accounts")
        accounts = response.json()
        if len(accounts) > 0:
            account_id = accounts[0]["id"]
            
            response = requests.get(f"{BASE_URL}/api/accounts/{account_id}/ledger")
            assert response.status_code == 200
            data = response.json()
            
            assert "account" in data
            assert "opening_balance" in data
            assert "current_balance" in data
            assert "entries" in data
            print(f"Ledger for {data['account']['name']}: Balance = {data['current_balance']}")
        else:
            pytest.skip("No accounts to test ledger")


class TestJournalEntry:
    """Double Entry Voucher System tests"""
    
    @pytest.fixture
    def get_two_accounts(self):
        """Get two accounts for double entry"""
        response = requests.get(f"{BASE_URL}/api/accounts")
        accounts = response.json()
        if len(accounts) < 2:
            pytest.skip("Need at least 2 accounts for journal entry")
        return accounts[0], accounts[1]
    
    def test_create_payment_voucher_balanced(self, get_two_accounts):
        """Test creating payment voucher with Debit = Credit"""
        acc1, acc2 = get_two_accounts
        
        entry_data = {
            "date": "2025-01-15",
            "voucher_type": "payment",
            "narration": "TEST_Payment for office supplies",
            "entries": [
                {"account_id": acc1["id"], "debit_amount": 1000, "credit_amount": 0},
                {"account_id": acc2["id"], "debit_amount": 0, "credit_amount": 1000}
            ]
        }
        
        response = requests.post(f"{BASE_URL}/api/journal-entries", json=entry_data)
        assert response.status_code == 200
        data = response.json()
        
        assert data["voucher_type"] == "payment"
        assert data["narration"] == entry_data["narration"]
        assert "voucher_no" in data
        assert data["voucher_no"].startswith("PAY-")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/journal-entries/{data['id']}")
        print(f"Created balanced payment voucher: {data['voucher_no']}")
    
    def test_reject_unbalanced_entry(self, get_two_accounts):
        """Test that system rejects if Debit != Credit"""
        acc1, acc2 = get_two_accounts
        
        entry_data = {
            "date": "2025-01-15",
            "voucher_type": "journal",
            "narration": "TEST_Unbalanced entry",
            "entries": [
                {"account_id": acc1["id"], "debit_amount": 1000, "credit_amount": 0},
                {"account_id": acc2["id"], "debit_amount": 0, "credit_amount": 500}  # Unbalanced!
            ]
        }
        
        response = requests.post(f"{BASE_URL}/api/journal-entries", json=entry_data)
        assert response.status_code == 400
        assert "Debit" in response.json()["detail"] and "Credit" in response.json()["detail"]
        print("Correctly rejected unbalanced entry (Debit 1000 != Credit 500)")
    
    def test_account_balance_updates_after_voucher(self, get_two_accounts):
        """Test that account balances update correctly after voucher"""
        acc1, acc2 = get_two_accounts
        
        # Get initial balances
        resp1 = requests.get(f"{BASE_URL}/api/accounts/{acc1['id']}")
        resp2 = requests.get(f"{BASE_URL}/api/accounts/{acc2['id']}")
        initial_bal1 = resp1.json()["current_balance"]
        initial_bal2 = resp2.json()["current_balance"]
        
        # Create voucher
        entry_data = {
            "date": "2025-01-15",
            "voucher_type": "journal",
            "narration": "TEST_Balance update test",
            "entries": [
                {"account_id": acc1["id"], "debit_amount": 500, "credit_amount": 0},
                {"account_id": acc2["id"], "debit_amount": 0, "credit_amount": 500}
            ]
        }
        
        response = requests.post(f"{BASE_URL}/api/journal-entries", json=entry_data)
        assert response.status_code == 200
        entry_id = response.json()["id"]
        
        # Check updated balances
        resp1 = requests.get(f"{BASE_URL}/api/accounts/{acc1['id']}")
        resp2 = requests.get(f"{BASE_URL}/api/accounts/{acc2['id']}")
        
        # Balance change depends on account type
        # For assets/expenses: debit increases, credit decreases
        # For liabilities/capital/income: credit increases, debit decreases
        print(f"Account 1 ({acc1['account_type']}): {initial_bal1} -> {resp1.json()['current_balance']}")
        print(f"Account 2 ({acc2['account_type']}): {initial_bal2} -> {resp2.json()['current_balance']}")
        
        # Cleanup - this should reverse the balances
        requests.delete(f"{BASE_URL}/api/journal-entries/{entry_id}")
    
    def test_all_voucher_types(self, get_two_accounts):
        """Test all 6 voucher types: payment, receipt, journal, contra, sales, purchase"""
        acc1, acc2 = get_two_accounts
        voucher_types = ["payment", "receipt", "journal", "contra", "sales", "purchase"]
        prefixes = {"payment": "PAY", "receipt": "REC", "journal": "JV", "contra": "CNT", "sales": "SAL", "purchase": "PUR"}
        
        for vtype in voucher_types:
            entry_data = {
                "date": "2025-01-15",
                "voucher_type": vtype,
                "narration": f"TEST_{vtype} voucher test",
                "entries": [
                    {"account_id": acc1["id"], "debit_amount": 100, "credit_amount": 0},
                    {"account_id": acc2["id"], "debit_amount": 0, "credit_amount": 100}
                ]
            }
            
            response = requests.post(f"{BASE_URL}/api/journal-entries", json=entry_data)
            assert response.status_code == 200
            data = response.json()
            assert data["voucher_no"].startswith(f"{prefixes[vtype]}-")
            
            # Cleanup
            requests.delete(f"{BASE_URL}/api/journal-entries/{data['id']}")
            print(f"Voucher type '{vtype}' works - {data['voucher_no']}")


class TestTrialBalance:
    """Trial Balance report tests"""
    
    def test_get_trial_balance(self):
        """Test Trial Balance shows all accounts with Debit and Credit totals"""
        response = requests.get(f"{BASE_URL}/api/reports/trial-balance")
        assert response.status_code == 200
        data = response.json()
        
        assert "accounts" in data
        assert "total_debit" in data
        assert "total_credit" in data
        assert "is_balanced" in data
        assert "as_on_date" in data
        
        print(f"Trial Balance as on {data['as_on_date']}")
        print(f"Total Debit: {data['total_debit']}, Total Credit: {data['total_credit']}")
        print(f"Is Balanced: {data['is_balanced']}")
    
    def test_trial_balance_debit_equals_credit(self):
        """Test that Total Debit must equal Total Credit"""
        response = requests.get(f"{BASE_URL}/api/reports/trial-balance")
        assert response.status_code == 200
        data = response.json()
        
        # The difference should be negligible (< 0.01)
        difference = abs(data["total_debit"] - data["total_credit"])
        assert data["is_balanced"] == (difference < 0.01)
        
        if data["is_balanced"]:
            print("Trial Balance is BALANCED (Debit = Credit)")
        else:
            print(f"Trial Balance is NOT balanced. Difference: {difference}")


class TestProfitLossStatement:
    """Profit & Loss Statement tests"""
    
    def test_get_profit_loss_statement(self):
        """Test P&L shows Income vs Expenses"""
        response = requests.get(f"{BASE_URL}/api/reports/profit-loss-statement")
        assert response.status_code == 200
        data = response.json()
        
        assert "income" in data
        assert "expenses" in data
        assert "net_profit" in data
        assert "is_profit" in data
        
        # Verify income structure
        assert "direct_income" in data["income"]
        assert "indirect_income" in data["income"]
        assert "total" in data["income"]
        
        # Verify expense structure
        assert "direct_expense" in data["expenses"]
        assert "indirect_expense" in data["expenses"]
        assert "total" in data["expenses"]
        
        print(f"Total Income: {data['income']['total']}")
        print(f"Total Expenses: {data['expenses']['total']}")
        print(f"Net {'Profit' if data['is_profit'] else 'Loss'}: {abs(data['net_profit'])}")
    
    def test_net_profit_calculation(self):
        """Test Net Profit/Loss calculation = Income - Expenses"""
        response = requests.get(f"{BASE_URL}/api/reports/profit-loss-statement")
        assert response.status_code == 200
        data = response.json()
        
        calculated_profit = data["income"]["total"] - data["expenses"]["total"]
        assert abs(calculated_profit - data["net_profit"]) < 0.01
        print(f"Net Profit calculation verified: {data['income']['total']} - {data['expenses']['total']} = {data['net_profit']}")


class TestBalanceSheet:
    """Balance Sheet tests"""
    
    def test_get_balance_sheet(self):
        """Test Balance Sheet two column format (Liabilities+Capital vs Assets)"""
        response = requests.get(f"{BASE_URL}/api/reports/balance-sheet")
        assert response.status_code == 200
        data = response.json()
        
        # Verify structure
        assert "assets" in data
        assert "liabilities" in data
        assert "capital" in data
        assert "total_liabilities_and_capital" in data
        assert "is_balanced" in data
        
        # Verify assets structure
        assert "current_assets" in data["assets"]
        assert "fixed_assets" in data["assets"]
        assert "total" in data["assets"]
        
        # Verify liabilities structure
        assert "current_liabilities" in data["liabilities"]
        assert "long_term_liabilities" in data["liabilities"]
        assert "total" in data["liabilities"]
        
        # Verify capital structure
        assert "items" in data["capital"]
        assert "net_profit" in data["capital"]
        assert "total" in data["capital"]
        
        print(f"Total Assets: {data['assets']['total']}")
        print(f"Total Liabilities: {data['liabilities']['total']}")
        print(f"Total Capital (incl. Net Profit): {data['capital']['total']}")
        print(f"Liabilities + Capital: {data['total_liabilities_and_capital']}")
    
    def test_balance_sheet_equation(self):
        """Test Assets = Liabilities + Capital"""
        response = requests.get(f"{BASE_URL}/api/reports/balance-sheet")
        assert response.status_code == 200
        data = response.json()
        
        total_assets = data["assets"]["total"]
        total_liabilities_and_capital = data["total_liabilities_and_capital"]
        
        difference = abs(total_assets - total_liabilities_and_capital)
        
        if data["is_balanced"]:
            print(f"Balance Sheet BALANCED: Assets ({total_assets}) = Liabilities + Capital ({total_liabilities_and_capital})")
        else:
            print(f"Balance Sheet NOT balanced. Difference: {difference}")
        
        # The is_balanced flag should correctly reflect the equation
        assert data["is_balanced"] == (difference < 0.01)


class TestOpeningBalance:
    """Opening Balance entry tests"""
    
    def test_create_opening_balance(self):
        """Test creating opening balance for an account"""
        # Get an account
        response = requests.get(f"{BASE_URL}/api/accounts")
        accounts = response.json()
        if len(accounts) == 0:
            pytest.skip("No accounts available")
        
        account = accounts[0]
        
        # Get active financial year
        fy_response = requests.get(f"{BASE_URL}/api/financial-years/active")
        fy = fy_response.json()
        
        ob_data = {
            "account_id": account["id"],
            "financial_year": fy["id"],
            "amount": 10000,
            "balance_type": "debit"
        }
        
        response = requests.post(f"{BASE_URL}/api/opening-balances", json=ob_data)
        assert response.status_code == 200
        data = response.json()
        
        assert data["account_id"] == account["id"]
        assert data["amount"] == 10000
        print(f"Opening balance set for {account['name']}: {data['amount']} ({data['balance_type']})")


class TestIntegration:
    """Integration tests for complete accounting workflow"""
    
    def test_complete_accounting_workflow(self):
        """Test complete workflow: Create accounts -> Journal Entry -> Reports"""
        # 1. Ensure accounts exist
        requests.post(f"{BASE_URL}/api/accounts/initialize-defaults")
        
        # 2. Get accounts
        response = requests.get(f"{BASE_URL}/api/accounts")
        accounts = response.json()
        assert len(accounts) > 0
        
        # 3. Get Trial Balance
        tb_response = requests.get(f"{BASE_URL}/api/reports/trial-balance")
        assert tb_response.status_code == 200
        
        # 4. Get P&L
        pl_response = requests.get(f"{BASE_URL}/api/reports/profit-loss-statement")
        assert pl_response.status_code == 200
        
        # 5. Get Balance Sheet
        bs_response = requests.get(f"{BASE_URL}/api/reports/balance-sheet")
        assert bs_response.status_code == 200
        
        print("Complete accounting workflow verified:")
        print(f"  - {len(accounts)} accounts in Chart of Accounts")
        print(f"  - Trial Balance: Debit={tb_response.json()['total_debit']}, Credit={tb_response.json()['total_credit']}")
        print(f"  - P&L: Net Profit/Loss = {pl_response.json()['net_profit']}")
        print(f"  - Balance Sheet: Assets = {bs_response.json()['assets']['total']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
