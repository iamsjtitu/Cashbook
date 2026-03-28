"""
Test Suite for Simplified P&L and Balance Sheet APIs
Tests the NEW simplified reporting system that aggregates from:
- Cash Book transactions
- Party Ledger balances
- Expenses
- Advances
- Chit Funds
- Interest Accounts
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestSimpleProfitLoss:
    """Tests for GET /api/reports/simple-profit-loss"""
    
    def test_simple_pl_all_time(self):
        """Test P&L without month filter (All Time)"""
        response = requests.get(f"{BASE_URL}/api/reports/simple-profit-loss")
        assert response.status_code == 200
        
        data = response.json()
        # Verify response structure
        assert "month" in data
        assert data["month"] == "All Time"
        assert "income" in data
        assert "expenses" in data
        assert "net_profit" in data
        assert "is_profit" in data
        assert "transaction_count" in data
        
        # Verify income structure
        assert "total" in data["income"]
        assert "breakdown" in data["income"]
        
        # Verify expenses structure
        assert "total" in data["expenses"]
        assert "breakdown" in data["expenses"]
        assert "by_category" in data["expenses"]
        
        # Verify net_profit calculation: Income - Expenses
        expected_net = data["income"]["total"] - data["expenses"]["total"]
        assert abs(data["net_profit"] - expected_net) < 0.01
        
        # Verify is_profit flag
        assert data["is_profit"] == (data["net_profit"] >= 0)
        
        print(f"P&L All Time: Income={data['income']['total']}, Expenses={data['expenses']['total']}, Net={data['net_profit']}")
    
    def test_simple_pl_with_month_filter(self):
        """Test P&L with month filter"""
        response = requests.get(f"{BASE_URL}/api/reports/simple-profit-loss?month=2026-01")
        assert response.status_code == 200
        
        data = response.json()
        assert data["month"] == "2026-01"
        assert "income" in data
        assert "expenses" in data
        assert "net_profit" in data
        
        print(f"P&L 2026-01: Income={data['income']['total']}, Expenses={data['expenses']['total']}, Net={data['net_profit']}")
    
    def test_simple_pl_current_month(self):
        """Test P&L for current month (2026-03)"""
        response = requests.get(f"{BASE_URL}/api/reports/simple-profit-loss?month=2026-03")
        assert response.status_code == 200
        
        data = response.json()
        assert data["month"] == "2026-03"
        assert isinstance(data["income"]["total"], (int, float))
        assert isinstance(data["expenses"]["total"], (int, float))
        
        print(f"P&L 2026-03: Income={data['income']['total']}, Expenses={data['expenses']['total']}, Net={data['net_profit']}")
    
    def test_simple_pl_expense_categories(self):
        """Test that expense categories are correctly aggregated"""
        response = requests.get(f"{BASE_URL}/api/reports/simple-profit-loss")
        assert response.status_code == 200
        
        data = response.json()
        
        # Valid expense categories
        valid_categories = [
            "salary", "advance", "rent", "electricity", "supplies",
            "maintenance", "transport", "food", "interest_paid", "chit_fund", "other"
        ]
        
        # Check that all categories in breakdown are valid
        for category in data["expenses"]["breakdown"].keys():
            assert category in valid_categories or category is None, f"Invalid category: {category}"
        
        print(f"Expense categories found: {list(data['expenses']['breakdown'].keys())}")


class TestSimpleBalanceSheet:
    """Tests for GET /api/reports/simple-balance-sheet"""
    
    def test_balance_sheet_structure(self):
        """Test Balance Sheet response structure"""
        response = requests.get(f"{BASE_URL}/api/reports/simple-balance-sheet")
        assert response.status_code == 200
        
        data = response.json()
        
        # Verify main sections
        assert "as_on_date" in data
        assert "assets" in data
        assert "liabilities" in data
        assert "capital" in data
        assert "summary" in data
        
        print(f"Balance Sheet as on: {data['as_on_date']}")
    
    def test_balance_sheet_assets(self):
        """Test Balance Sheet assets section"""
        response = requests.get(f"{BASE_URL}/api/reports/simple-balance-sheet")
        assert response.status_code == 200
        
        data = response.json()
        assets = data["assets"]
        
        # Verify assets structure
        assert "current_assets" in assets
        assert "total" in assets
        
        current_assets = assets["current_assets"]
        
        # Verify all asset components
        assert "cash_balance" in current_assets
        assert "debtors" in current_assets
        assert "advances_to_staff" in current_assets
        assert "chit_fund_investment" in current_assets
        assert "interest_receivable" in current_assets
        
        # Verify debtors structure
        assert "total" in current_assets["debtors"]
        assert "list" in current_assets["debtors"]
        
        print(f"Assets: Cash={current_assets['cash_balance']}, Debtors={current_assets['debtors']['total']}, Total={assets['total']}")
    
    def test_balance_sheet_liabilities(self):
        """Test Balance Sheet liabilities section"""
        response = requests.get(f"{BASE_URL}/api/reports/simple-balance-sheet")
        assert response.status_code == 200
        
        data = response.json()
        liabilities = data["liabilities"]
        
        # Verify liabilities structure
        assert "current_liabilities" in liabilities
        assert "total" in liabilities
        
        current_liabilities = liabilities["current_liabilities"]
        
        # Verify liability components
        assert "creditors" in current_liabilities
        assert "salaries_payable" in current_liabilities
        
        # Verify creditors structure
        assert "total" in current_liabilities["creditors"]
        assert "list" in current_liabilities["creditors"]
        
        print(f"Liabilities: Creditors={current_liabilities['creditors']['total']}, Total={liabilities['total']}")
    
    def test_balance_sheet_capital(self):
        """Test Balance Sheet capital section"""
        response = requests.get(f"{BASE_URL}/api/reports/simple-balance-sheet")
        assert response.status_code == 200
        
        data = response.json()
        capital = data["capital"]
        
        # Verify capital structure
        assert "net_worth" in capital
        assert "chit_fund_won" in capital
        
        print(f"Capital: Net Worth={capital['net_worth']}, Chit Fund Won={capital['chit_fund_won']}")
    
    def test_balance_sheet_equation(self):
        """Test Balance Sheet equation: Assets = Liabilities + Capital"""
        response = requests.get(f"{BASE_URL}/api/reports/simple-balance-sheet")
        assert response.status_code == 200
        
        data = response.json()
        
        total_assets = data["assets"]["total"]
        total_liabilities = data["liabilities"]["total"]
        net_worth = data["capital"]["net_worth"]
        
        # Net Worth = Assets - Liabilities (by definition in simplified system)
        expected_net_worth = total_assets - total_liabilities
        assert abs(net_worth - expected_net_worth) < 0.01, f"Net Worth mismatch: {net_worth} != {expected_net_worth}"
        
        # Verify summary
        assert data["summary"]["total_assets"] == total_assets
        assert data["summary"]["total_liabilities"] == total_liabilities
        assert data["summary"]["net_worth"] == net_worth
        assert data["summary"]["is_balanced"] == True
        
        print(f"Balance Sheet Equation: Assets({total_assets}) = Liabilities({total_liabilities}) + Capital({net_worth})")
    
    def test_balance_sheet_debtors_list(self):
        """Test that debtors list shows parties with positive balance"""
        response = requests.get(f"{BASE_URL}/api/reports/simple-balance-sheet")
        assert response.status_code == 200
        
        data = response.json()
        debtors = data["assets"]["current_assets"]["debtors"]
        
        # Each debtor should have name and amount
        for debtor in debtors["list"]:
            assert "name" in debtor
            assert "amount" in debtor
            assert debtor["amount"] > 0, "Debtor amount should be positive"
        
        print(f"Debtors count: {len(debtors['list'])}, Total: {debtors['total']}")
    
    def test_balance_sheet_creditors_list(self):
        """Test that creditors list shows parties with negative balance"""
        response = requests.get(f"{BASE_URL}/api/reports/simple-balance-sheet")
        assert response.status_code == 200
        
        data = response.json()
        creditors = data["liabilities"]["current_liabilities"]["creditors"]
        
        # Each creditor should have name and amount (positive, as it's absolute value)
        for creditor in creditors["list"]:
            assert "name" in creditor
            assert "amount" in creditor
            assert creditor["amount"] > 0, "Creditor amount should be positive (absolute value)"
        
        print(f"Creditors count: {len(creditors['list'])}, Total: {creditors['total']}")


class TestNavigationTabs:
    """Test all 12 navigation tabs are accessible"""
    
    def test_dashboard_api(self):
        """Test Dashboard loads (root API)"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        print("Dashboard API: OK")
    
    def test_staff_api(self):
        """Test Staff API"""
        response = requests.get(f"{BASE_URL}/api/staff")
        assert response.status_code == 200
        print(f"Staff API: OK, count={len(response.json())}")
    
    def test_attendance_api(self):
        """Test Attendance API"""
        response = requests.get(f"{BASE_URL}/api/attendance/date/2026-03-28")
        assert response.status_code == 200
        print(f"Attendance API: OK")
    
    def test_cashbook_api(self):
        """Test Cash Book API"""
        response = requests.get(f"{BASE_URL}/api/cashbook/2026-03-28")
        assert response.status_code == 200
        data = response.json()
        assert "opening_balance" in data
        assert "closing_balance" in data
        print(f"Cash Book API: OK, closing_balance={data['closing_balance']}")
    
    def test_parties_api(self):
        """Test Party Ledger API"""
        response = requests.get(f"{BASE_URL}/api/parties")
        assert response.status_code == 200
        print(f"Parties API: OK, count={len(response.json())}")
    
    def test_interest_api(self):
        """Test Byaj/Interest API"""
        response = requests.get(f"{BASE_URL}/api/interest-accounts")
        assert response.status_code == 200
        print(f"Interest API: OK, count={len(response.json())}")
    
    def test_expenses_api(self):
        """Test Expenses API"""
        response = requests.get(f"{BASE_URL}/api/expenses")
        assert response.status_code == 200
        print(f"Expenses API: OK, count={len(response.json())}")
    
    def test_reports_api(self):
        """Test Reports API (monthly cashbook)"""
        response = requests.get(f"{BASE_URL}/api/cashbook/monthly/2026-03")
        assert response.status_code == 200
        print(f"Reports API: OK")
    
    def test_chitfund_api(self):
        """Test Chit Fund API"""
        response = requests.get(f"{BASE_URL}/api/chit-funds")
        assert response.status_code == 200
        print(f"Chit Fund API: OK, count={len(response.json())}")
    
    def test_simple_pl_api(self):
        """Test Simple P&L API"""
        response = requests.get(f"{BASE_URL}/api/reports/simple-profit-loss")
        assert response.status_code == 200
        print(f"Simple P&L API: OK")
    
    def test_simple_balance_sheet_api(self):
        """Test Simple Balance Sheet API"""
        response = requests.get(f"{BASE_URL}/api/reports/simple-balance-sheet")
        assert response.status_code == 200
        print(f"Simple Balance Sheet API: OK")


class TestDataIntegration:
    """Test that P&L and Balance Sheet correctly aggregate from other modules"""
    
    def test_transactions_affect_pl(self):
        """Test that transactions are reflected in P&L"""
        # Get current P&L
        pl_response = requests.get(f"{BASE_URL}/api/reports/simple-profit-loss")
        assert pl_response.status_code == 200
        pl_data = pl_response.json()
        
        # Get all transactions
        txn_response = requests.get(f"{BASE_URL}/api/transactions")
        assert txn_response.status_code == 200
        transactions = txn_response.json()
        
        # Calculate expected totals from transactions
        expected_income = sum(t["amount"] for t in transactions if t["transaction_type"] == "credit")
        expected_expense = sum(t["amount"] for t in transactions if t["transaction_type"] == "debit")
        
        # Verify P&L matches transaction totals
        assert abs(pl_data["income"]["total"] - expected_income) < 0.01, f"Income mismatch: {pl_data['income']['total']} != {expected_income}"
        assert abs(pl_data["expenses"]["total"] - expected_expense) < 0.01, f"Expense mismatch: {pl_data['expenses']['total']} != {expected_expense}"
        
        print(f"P&L matches transactions: Income={expected_income}, Expenses={expected_expense}")
    
    def test_advances_in_balance_sheet(self):
        """Test that advances are reflected in Balance Sheet"""
        # Get advances
        adv_response = requests.get(f"{BASE_URL}/api/advances")
        assert adv_response.status_code == 200
        advances = adv_response.json()
        total_advances = sum(a["amount"] for a in advances)
        
        # Get balance sheet
        bs_response = requests.get(f"{BASE_URL}/api/reports/simple-balance-sheet")
        assert bs_response.status_code == 200
        bs_data = bs_response.json()
        
        # Verify advances match
        assert abs(bs_data["assets"]["current_assets"]["advances_to_staff"] - total_advances) < 0.01
        
        print(f"Advances in Balance Sheet: {total_advances}")
    
    def test_chitfund_in_balance_sheet(self):
        """Test that chit fund investments are reflected in Balance Sheet"""
        # Get chit funds
        chit_response = requests.get(f"{BASE_URL}/api/chit-funds")
        assert chit_response.status_code == 200
        chits = chit_response.json()
        total_invested = sum(c.get("total_paid", 0) for c in chits)
        
        # Get balance sheet
        bs_response = requests.get(f"{BASE_URL}/api/reports/simple-balance-sheet")
        assert bs_response.status_code == 200
        bs_data = bs_response.json()
        
        # Verify chit fund investment matches
        assert abs(bs_data["assets"]["current_assets"]["chit_fund_investment"] - total_invested) < 0.01
        
        print(f"Chit Fund Investment in Balance Sheet: {total_invested}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
